import api from '@forge/api';

/**
 * Email configuration
 * IMPORTANT: Set these as Forge environment variables:
 * - forge variables set --encrypt SENDGRID_API_KEY your-api-key
 * - forge variables set RECIPIENT_EMAIL your-email@example.com
 */
const EMAIL_CONFIG = {
  fromEmail: 'maruthi.adobe@gmail.com',
  fromName: 'Stale Issue Auto-Nudge',
  subject: 'Stale Issue Auto-Nudge - Execution Summary',
};

/**
 * Sends an email via SendGrid API
 *
 * @param {string} recipientEmail - Email address to send to
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {string} textContent - Plain text content of the email
 * @returns {Promise<boolean>} True if email was sent successfully
 */
async function sendEmailViaSendGrid(recipientEmail, subject, htmlContent, textContent) {
  try {
    // Get SendGrid API key from Forge environment variables
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      console.error('SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable.');
      return false;
    }

    const requestBody = {
      personalizations: [
        {
          to: [{ email: recipientEmail }],
          subject: subject,
        },
      ],
      from: {
        email: EMAIL_CONFIG.fromEmail,
        name: EMAIL_CONFIG.fromName,
      },
      content: [
        {
          type: 'text/plain',
          value: textContent,
        },
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
    };

    console.log(`Sending email to ${recipientEmail} via SendGrid...`);

    const response = await api.fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      console.log(`Email sent successfully to ${recipientEmail}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`Failed to send email: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending email via SendGrid:', error);
    return false;
  }
}

/**
 * Generates HTML email content from execution summary
 *
 * @param {Object} summary - Execution summary object
 * @returns {string} HTML content
 */
function generateHtmlContent(summary) {
  const timestamp = new Date().toISOString();
  const status = summary.failed > 0 ? '⚠️ Completed with errors' : '✓ Completed successfully';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      color: #172b4d;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #0052cc;
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #f4f5f7;
      padding: 20px;
      border-radius: 0 0 8px 8px;
    }
    .summary-box {
      background: white;
      border-left: 4px solid #0052cc;
      padding: 15px;
      margin: 15px 0;
      border-radius: 3px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 15px 0;
    }
    .stat {
      background: white;
      padding: 15px;
      border-radius: 3px;
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #0052cc;
    }
    .stat-label {
      font-size: 12px;
      color: #5e6c84;
      text-transform: uppercase;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #dfe1e6;
      font-size: 12px;
      color: #5e6c84;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">🔔 Stale Issue Auto-Nudge</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Execution Summary</p>
  </div>
  <div class="content">
    <div class="summary-box">
      <strong>Status:</strong> ${status}<br>
      <strong>Timestamp:</strong> ${timestamp}
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-number">${summary.totalFound}</div>
        <div class="stat-label">Total Found</div>
      </div>
      <div class="stat">
        <div class="stat-number" style="color: #00875a;">${summary.nudged}</div>
        <div class="stat-label">Nudged</div>
      </div>
      <div class="stat">
        <div class="stat-number" style="color: ${summary.failed > 0 ? '#de350b' : '#5e6c84'};">${summary.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
    </div>

    ${summary.totalFound === 0 ? '<p><em>No stale issues found. All boards are clean!</em></p>' : ''}

    <div class="footer">
      <p>This is an automated email from Stale Issue Auto-Nudge.</p>
      <p>The app automatically identifies "In Progress" issues that haven't been updated in 5+ days and posts reminder comments to assignees.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates plain text email content from execution summary
 *
 * @param {Object} summary - Execution summary object
 * @returns {string} Plain text content
 */
function generateTextContent(summary) {
  const timestamp = new Date().toISOString();
  const status = summary.failed > 0 ? 'Completed with errors' : 'Completed successfully';

  return `
Stale Issue Auto-Nudge - Execution Summary
==========================================

Status: ${status}
Timestamp: ${timestamp}

Summary:
--------
Total Found: ${summary.totalFound}
Nudged: ${summary.nudged}
Failed: ${summary.failed}

${summary.totalFound === 0 ? 'No stale issues found. All boards are clean!' : ''}

---
This is an automated email from Stale Issue Auto-Nudge.
The app automatically identifies "In Progress" issues that haven't been updated in 5+ days
and posts reminder comments to assignees.
  `.trim();
}

/**
 * Sends a summary email with execution logs
 *
 * @param {Object} summary - Execution summary object from run()
 * @returns {Promise<boolean>} True if email was sent successfully
 */
export async function sendSummaryEmail(summary) {
  try {
    // Get recipient email from environment variables
    const recipientEmail = process.env.RECIPIENT_EMAIL;

    if (!recipientEmail) {
      console.error('Recipient email not configured. Please set RECIPIENT_EMAIL environment variable.');
      return false;
    }

    const htmlContent = generateHtmlContent(summary);
    const textContent = generateTextContent(summary);

    console.log('Preparing to send summary email...');
    const success = await sendEmailViaSendGrid(
      recipientEmail,
      EMAIL_CONFIG.subject,
      htmlContent,
      textContent
    );

    return success;
  } catch (error) {
    console.error('Error in sendSummaryEmail:', error);
    return false;
  }
}

export default sendSummaryEmail;
