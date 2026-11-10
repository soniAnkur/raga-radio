#!/usr/bin/env node
/**
 * Local MCP server for the raga engine (stdio). For the same tools over
 * HTTP, see http-server.js.
 *
 * Tools: raga_rules, compose_melody, validate_melody, certify_audio,
 *        research_artist, build_prompt, list_styles, define_style,
 *        suno_cover, suno_add_instrumental, suno_generate, suno_status
 *
 * Env: SUNO_API_KEY (Suno tools), SUNO_API_BASE_URL (optional),
 *      RAGA_DATA_MODULE (optional path to a module whose default export maps id -> raga;
 *        lets tools accept `ragaId` and adds list_ragas),
 *      RAGA_STYLES_FILE (optional, where define_style saves; default ~/.raga-engine/styles.json)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerEngineTools } from './tools.js';
import { localContext } from './context.js';

const server = new McpServer({ name: 'raga-engine', version: '0.2.0' });
registerEngineTools(server, await localContext());
await server.connect(new StdioServerTransport());
