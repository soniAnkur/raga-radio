#!/usr/bin/env node
/**
 * Standalone remote MCP server for the raga engine (Streamable HTTP).
 *
 *   PORT=8787 SUNO_API_KEY=... node raga-engine/http-server.js
 *   MCP endpoint: http://localhost:8787/mcp
 *
 * Stateless: every request gets a fresh server, so it runs on any host,
 * including serverless ones. There is no access control: anyone who can
 * reach the server can use every tool, including the ones that spend Suno
 * credits. Put it behind your own network or proxy if that matters.
 *
 * Env: as mcp-server.js, plus PORT.
 */
import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerEngineTools } from './tools.js';
import { localContext } from './context.js';

const PORT = Number(process.env.PORT) || 8787;
const base = await localContext({ remote: true });

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/' || path === '/health') return send(res, 200, { name: 'raga-engine', mcp: '/mcp' });
  if (path !== '/mcp') return send(res, 404, { error: 'Not found. The MCP endpoint is /mcp.' });
  if (req.method !== 'POST') {
    return send(res, 405, { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. This server is stateless: use POST.' }, id: null });
  }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');

    const server = new McpServer({ name: 'raga-engine', version: '0.2.0' });
    registerEngineTools(server, base);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    if (!res.headersSent) send(res, 400, { jsonrpc: '2.0', error: { code: -32700, message: `Bad request: ${error.message}` }, id: null });
  }
}).listen(PORT, () => console.error(`raga-engine MCP server on http://localhost:${PORT}/mcp`));
