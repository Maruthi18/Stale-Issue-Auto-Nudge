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
 */
resolver.define('runManually', async (req) => {
  console.log('Manual trigger initiated by user');

  try {
    const result = await run();
    return {
      success: true,
      message: `Successfully processed ${result.nudged} out of ${result.totalFound} stale issues`,
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
