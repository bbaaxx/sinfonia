// fortune-mcp.js
// Minimal MCP server exposing a get_fortune tool over stdio transport.
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export const FORTUNES = [
  'The best time to start was yesterday. The second best time is now.',
  'A smooth sea never made a skilled sailor.',
  'Your curiosity will lead you to unexpected treasure.',
  'Patience is not the ability to wait, but how you act while waiting.',
  'The obstacle in the path becomes the path.',
  'Small steps taken consistently outpace giant leaps taken rarely.',
  'Every expert was once a beginner who refused to quit.',
  'Clarity comes from action, not from thought alone.',
  'What you seek is also seeking you.',
  'The code compiles. Ship it.',
  // Enhanced fortunes (10 new ones)
  'Great achievements are not made alone, but with a supportive team.',
  'Your hard work will pay off in ways you never expected.',
  'Today is a great day to start something new.',
  'The best way to predict the future is to create it.',
  'Your code is clean when it reads like well-written prose.',
  'Debugging is twice as hard as writing the code in the first place.',
  'Simplicity is the soul of efficiency.',
  'Focus on progress, not perfection.',
  'Every line of code tells a story - make it a good one.',
  'The best meetings are the ones that could have been an email.',
];

export function getRandomFortune() {
  return FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
}

// Guard: only start the MCP server when run directly (not imported by tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = new McpServer({
    name: 'fortune-demo',
    version: '1.0.0',
  });

  server.tool('get_fortune', 'Returns a random fortune string.', {}, async () => {
    return {
      content: [{ type: 'text', text: getRandomFortune() }],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
