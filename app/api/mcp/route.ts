/**
 * Remote MCP endpoint (Streamable HTTP): the raga engine's tools plus the
 * app's track tools, at /api/mcp.
 *
 * Stateless: each request gets a fresh server. Tools that spend Suno credits
 * or save anything need the access key (RAGA_API_KEY) in an X-Raga-Key
 * header or as Authorization: Bearer. Everything else is open.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { config } from 'dotenv';
config();

import { registerEngineTools } from '@/raga-engine/tools.js';
import { registerAppTools } from '@/src/mcp/appTools.js';
import { appContext } from '@/src/mcp/context.js';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ctx = appContext(request);
  const server = new McpServer({ name: 'raga-radio', version: '0.2.0' });
  registerEngineTools(server, ctx);
  registerAppTools(server, ctx);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

const notAllowed = () => Response.json(
  { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. This MCP server is stateless: use POST.' }, id: null },
  { status: 405, headers: { Allow: 'POST' } },
);
export const GET = notAllowed;
export const DELETE = notAllowed;
