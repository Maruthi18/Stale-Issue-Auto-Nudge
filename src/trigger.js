import Resolver from '@forge/resolver';
import { run } from './index.js';

const resolver = new Resolver();

/**
 * Renders the admin page UI
 */
resolver.define('render', (req) => {
  return {
    resource: 'admin-page'
  };
});

/**
 * Manual trigger endpoint that can be called from the UI
 * Works from both global page and issue panel
 */
resolver.define('runManually', async (req) => {
  console.log('Manual trigger initiated by user');

  // Log context if available (useful for issue panel)
  if (req.context && req.context.extension) {
    console.log('Context:', JSON.stringify(req.context.extension));
  }

  try {
    const result = await run();
    return {
      success: true,
      message: `Successfully processed ${result.nudged} out of ${result.totalFound} stale issues. Email notification sent.`,
      details: result
    };
  } catch (error) {
    console.error('Error in manual trigger:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error: error.toString()
    };
  }
});

export const handler = resolver.getDefinitions();
