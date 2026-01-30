import api, { route } from '@forge/api';

/**
 * Configuration for stale issue detection
 */
const CONFIG = {
  // Number of days after which an "In Progress" issue is considered stale
  staleDays: 5,
  // Maximum number of issues to process per run (to avoid timeouts)
  maxResults: 50,
  // Status category to check for stale issues
  statusCategory: 'In Progress',
};

/**
 * Builds the JQL query to find stale issues
 * Criteria:
 * - Status is "In Progress"
 * - Last updated more than X days ago
 * - Has an active assignee
 *
 * @returns {string} The JQL query string
 */
function buildStaleIssueJql() {
  return `status = "${CONFIG.statusCategory}" AND updated < -${CONFIG.staleDays}d AND assignee IS NOT EMPTY ORDER BY updated ASC`;
}

/**
 * Searches for stale issues using the Jira Search API
 *
 * @returns {Promise<Array>} Array of stale issues
 */
async function findStaleIssues() {
  const jql = buildStaleIssueJql();

  console.log(`Searching for stale issues with JQL: ${jql}`);

  try {
    // Use the requestJira with proper routing
    const response = await api.asApp().requestJira(
      route`/rest/api/3/search/jql`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql: jql,
          maxResults: CONFIG.maxResults,
          fields: ['key', 'summary', 'assignee', 'updated', 'status'],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to search issues: ${response.status} - ${errorText}`);
      throw new Error(`Failed to search issues: ${response.status}`);
    }

    const data = await response.json();
    const total = typeof data.total === 'number' ? data.total : (data.issues ? data.issues.length : 0);
    console.log(`Found ${total} stale issues (processing up to ${CONFIG.maxResults})`);

    return data.issues || [];
  } catch (error) {
    console.error('Error in findStaleIssues:', error);
    throw error;
  }
}

/**
 * Generates the nudge comment message for a stale issue
 *
 * @param {Object} assignee - The assignee object from the issue
 * @param {number} daysSinceUpdate - Number of days since last update
 * @returns {Object} Atlassian Document Format comment body
 */
function generateNudgeComment(assignee, daysSinceUpdate) {
  return {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'mention',
            attrs: {
              id: assignee.accountId,
              text: `@${assignee.displayName}`,
              accessLevel: 'CONTAINER',
            },
          },
          {
            type: 'text',
            text: `, this ticket has been in "In Progress" for ${daysSinceUpdate} days without any updates. `,
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Could you please provide a status update? If this task is blocked, consider updating the status or adding a comment describing the blocker. If work has been completed, please move it to the appropriate status.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '(This is an automated reminder from Stale Issue Auto-Nudge)',
            marks: [{ type: 'em' }],
          },
        ],
      },
    ],
  };
}

/**
 * Posts a nudge comment on a stale issue
 *
 * @param {string} issueKey - The issue key (e.g., "PROJ-123")
 * @param {Object} assignee - The assignee object
 * @param {number} daysSinceUpdate - Number of days since last update
 * @returns {Promise<boolean>} True if comment was posted successfully
 */
async function postNudgeComment(issueKey, assignee, daysSinceUpdate) {
  const commentBody = generateNudgeComment(assignee, daysSinceUpdate);

  console.log(`Posting nudge comment on ${issueKey} for assignee ${assignee.displayName}`);

  const response = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}/comment`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: commentBody,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to post comment on ${issueKey}: ${response.status} - ${errorText}`);
    return false;
  }

  console.log(`Successfully posted nudge comment on ${issueKey}`);
  return true;
}

/**
 * Calculates the number of days since the issue was last updated
 *
 * @param {string} updatedDate - ISO date string of last update
 * @returns {number} Number of days since last update
 */
function calculateDaysSinceUpdate(updatedDate) {
  const updated = new Date(updatedDate);
  const now = new Date();
  const diffTime = Math.abs(now - updated);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Main function that runs on the scheduled trigger
 * Finds stale issues and posts nudge comments on them
 *
 * @param {Object} event - The scheduled trigger event
 * @returns {Promise<Object>} Summary of the run
 */
export async function run(event) {
  console.log('Stale Issue Auto-Nudge: Starting scheduled run');
  console.log(`Configuration: staleDays=${CONFIG.staleDays}, maxResults=${CONFIG.maxResults}`);

  const summary = {
    totalFound: 0,
    nudged: 0,
    failed: 0,
    issues: [],
  };

  try {
    // Find all stale issues
    const staleIssues = await findStaleIssues();
    summary.totalFound = staleIssues.length;

    if (staleIssues.length === 0) {
      console.log('No stale issues found. All boards are clean!');
      return summary;
    }

    // Process each stale issue
    for (const issue of staleIssues) {
      const { key, fields } = issue;
      const { assignee, updated, summary: issueSummary } = fields;

      // Skip if no assignee (shouldn't happen due to JQL, but safety check)
      if (!assignee) {
        console.log(`Skipping ${key}: No assignee found`);
        continue;
      }

      const daysSinceUpdate = calculateDaysSinceUpdate(updated);

      try {
        const success = await postNudgeComment(key, assignee, daysSinceUpdate);

        if (success) {
          summary.nudged++;
          summary.issues.push({
            key,
            summary: issueSummary,
            assignee: assignee.displayName,
            daysSinceUpdate,
            status: 'nudged',
          });
        } else {
          summary.failed++;
          summary.issues.push({
            key,
            summary: issueSummary,
            assignee: assignee.displayName,
            daysSinceUpdate,
            status: 'failed',
          });
        }
      } catch (error) {
        console.error(`Error processing issue ${key}:`, error);
        summary.failed++;
        summary.issues.push({
          key,
          summary: issueSummary,
          assignee: assignee.displayName,
          daysSinceUpdate,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`Stale Issue Auto-Nudge completed: ${summary.nudged} nudged, ${summary.failed} failed out of ${summary.totalFound} found`);

    return summary;
  } catch (error) {
    console.error('Fatal error in Stale Issue Auto-Nudge:', error);
    throw error;
  }
}

export default run;
