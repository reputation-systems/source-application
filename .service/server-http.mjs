#!/usr/bin/env node
/**
 * Source Application Celaut service — network-facing twin of mcp/server.mjs.
 *
 * A Celaut service is a sealed microVM reached over TCP, so stdio is unusable.
 * This process binds 0.0.0.0:8080 and exposes THREE surfaces over plain HTTP:
 *
 *   GET  /health           – liveness probe (not part of MCP).
 *   *    /mcp               – the FULL MCP tool surface (same TOOLS/HANDLERS as
 *                            the stdio server) over the SDK's Streamable HTTP
 *                            transport, stateless (one Server per request).
 *   *    /api/*             – a clean JSON REST mirror of every method: reads via
 *                            GET, writes via POST using the env-configured signer
 *                            (SOURCE_SIGNER_MODE=seed|unsigned — see lib.mjs).
 *
 * Reads + pure helpers come from core.mjs; writes from writes.mjs. Both the MCP
 * and REST layers call the SAME core/writes functions, so they never diverge.
 *
 * Data source: Ergo Explorer mainnet (override via SOURCE_EXPLORER_API).
 */
import { createServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Shared registry lives ONCE in ../mcp (no duplicated copies in .service). The
// Dockerfile preserves this sibling layout under /app (/app/service + /app/mcp)
// so `../mcp` resolves identically in local dev and in the sealed microVM.
import { TOOLS, HANDLERS } from '../mcp/tools.mjs';
import * as core from '../mcp/core.mjs';
import * as writes from '../mcp/writes.mjs';
import { signerMode, EXPLORER_API } from '../mcp/lib.mjs';

// ── MCP server factory (stateless: one per request) ─────────────────────────

function makeServer() {
  const server = new Server(
    { name: 'source-application', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    const handler = HANDLERS[name];
    if (!handler) return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    try {
      const data = await handler(args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Error in ${name}: ${err?.message || String(err)}` }] };
    }
  });
  return server;
}

// ── HTTP plumbing ───────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 8080;
const MCP_PATH = '/mcp';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2));
}

// ── REST API (clean JSON mirror of every method) ────────────────────────────
//
// Reads (GET):
//   GET  /api/config
//   GET  /api/sources?hash=HASH
//   GET  /api/sources/by-profile?profileTokenId=ID&limit=N
//   GET  /api/sources/:boxId/invalidations
//   GET  /api/unavailable?url=URL
//   GET  /api/invalidations/by-profile?profileTokenId=ID&limit=N
//   GET  /api/unavailable/by-profile?profileTokenId=ID&limit=N
//   GET  /api/profiles/:profileTokenId/opinions
//   GET  /api/profiles/:authorTokenId/opinions-given
//   GET  /api/profiles/:profileTokenId          (full loadProfileData)
//   GET  /api/search?hash=HASH                  (searchByHash)
//   GET  /api/hash-algorithms
// Writes (POST, signer per SOURCE_SIGNER_MODE):
//   POST /api/profile                           {content?}
//   POST /api/sources                           {mainBoxId, fileHash, sourceEntry}
//   POST /api/sources/confirm                   {mainBoxId, fileHash, sourceEntry}
//   POST /api/sources/update                    {mainBoxId, fileHash, sourceEntry}
//   POST /api/sources/invalidate                {mainBoxId, sourceBoxId}
//   POST /api/unavailable                       {mainBoxId, sourceUrl}
//   POST /api/profiles/trust                    {mainBoxId, profileTokenId, isTrusted}

async function handleRest(req, res, url, query) {
  const method = req.method;
  const path = url.replace(/\/+$/, '') || '/';

  // ---- GET reads ----
  if (method === 'GET') {
    if (path === '/api/config') {
      return sendJson(res, 200, { explorerUri: EXPLORER_API, signerMode: signerMode(), typeNfts: {
        PROFILE_TYPE_NFT_ID: core.PROFILE_TYPE_NFT_ID,
        FILE_SOURCE_TYPE_NFT_ID: core.FILE_SOURCE_TYPE_NFT_ID,
        INVALID_FILE_SOURCE_TYPE_NFT_ID: core.INVALID_FILE_SOURCE_TYPE_NFT_ID,
        UNAVAILABLE_SOURCE_TYPE_NFT_ID: core.UNAVAILABLE_SOURCE_TYPE_NFT_ID,
        PROFILE_OPINION_TYPE_NFT_ID: core.PROFILE_OPINION_TYPE_NFT_ID
      } });
    }
    if (path === '/api/hash-algorithms') {
      return sendJson(res, 200, { options: core.HASH_OPTIONS, search: core.SEARCH_HASH_ALGORITHMS });
    }
    if (path === '/api/sources/by-profile') {
      const { profileTokenId, limit } = query;
      if (!profileTokenId) return sendJson(res, 400, { error: 'profileTokenId is required' });
      return sendJson(res, 200, await core.fetchFileSourcesByProfile(profileTokenId, limit ? Number(limit) : 50));
    }
    if (path === '/api/sources') {
      const { hash } = query;
      if (!hash) return sendJson(res, 400, { error: 'hash query param is required' });
      return sendJson(res, 200, await core.fetchFileSourcesByHash(hash));
    }
    let m = path.match(/^\/api\/sources\/([0-9a-fA-F]{64})\/invalidations$/);
    if (m) return sendJson(res, 200, await core.fetchInvalidFileSources(m[1]));
    if (path === '/api/unavailable') {
      const { url: srcUrl } = query;
      if (!srcUrl) return sendJson(res, 400, { error: 'url query param is required' });
      return sendJson(res, 200, await core.fetchUnavailableSources(srcUrl));
    }
    if (path === '/api/invalidations/by-profile') {
      const { profileTokenId, limit } = query;
      if (!profileTokenId) return sendJson(res, 400, { error: 'profileTokenId is required' });
      return sendJson(res, 200, await core.fetchInvalidFileSourcesByProfile(profileTokenId, limit ? Number(limit) : 50));
    }
    if (path === '/api/unavailable/by-profile') {
      const { profileTokenId, limit } = query;
      if (!profileTokenId) return sendJson(res, 400, { error: 'profileTokenId is required' });
      return sendJson(res, 200, await core.fetchUnavailableSourcesByProfile(profileTokenId, limit ? Number(limit) : 50));
    }
    if (path === '/api/search') {
      const { hash } = query;
      if (!hash) return sendJson(res, 400, { error: 'hash query param is required' });
      return sendJson(res, 200, await core.searchByHash(hash));
    }
    m = path.match(/^\/api\/profiles\/([^/]+)\/opinions-given$/);
    if (m) return sendJson(res, 200, await core.fetchProfileOpinionsByAuthor(m[1]));
    m = path.match(/^\/api\/profiles\/([^/]+)\/opinions$/);
    if (m) return sendJson(res, 200, await core.fetchProfileOpinions(m[1]));
    m = path.match(/^\/api\/profiles\/([^/]+)$/);
    if (m) return sendJson(res, 200, await core.loadProfileData(m[1]));
    return sendJson(res, 404, { error: `No GET route: ${path}` });
  }

  // ---- POST writes ----
  if (method === 'POST') {
    let body;
    try {
      body = (await readBody(req)) || {};
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON body' });
    }
    try {
      if (path === '/api/profile') return sendJson(res, 200, await writes.createProfileBox(body.content ?? { name: 'Anon' }));
      if (path === '/api/sources') return sendJson(res, 200, await writes.addFileSource(body.mainBoxId, body.fileHash, body.sourceEntry));
      if (path === '/api/sources/confirm') return sendJson(res, 200, await writes.confirmSource(body.mainBoxId, body.fileHash, body.sourceEntry));
      if (path === '/api/sources/update') return sendJson(res, 200, await writes.updateFileSource(body.mainBoxId, body.fileHash, body.sourceEntry));
      if (path === '/api/sources/invalidate') return sendJson(res, 200, await writes.markInvalidSource(body.mainBoxId, body.sourceBoxId));
      if (path === '/api/unavailable') return sendJson(res, 200, await writes.markUnavailableSource(body.mainBoxId, body.sourceUrl));
      if (path === '/api/profiles/trust') return sendJson(res, 200, await writes.trustProfile(body.mainBoxId, body.profileTokenId, body.isTrusted));
      return sendJson(res, 404, { error: `No POST route: ${path}` });
    } catch (err) {
      return sendJson(res, 500, { error: err?.message || String(err) });
    }
  }

  return sendJson(res, 405, { error: `Method not allowed: ${method}` });
}

// ── Bootstrap ───────────────────────────────────────────────────────────────

const httpServer = createServer(async (req, res) => {
  const [rawPath, rawQuery = ''] = (req.url || '').split('?');
  const path = rawPath || '/';
  const query = Object.fromEntries(new URLSearchParams(rawQuery));

  // Liveness probe.
  if (req.method === 'GET' && (path === '/health' || path === '/')) {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'source-application',
      transport: 'streamable-http',
      mcp: MCP_PATH,
      rest: '/api',
      signerMode: signerMode()
    });
  }

  // REST API.
  if (path === '/api' || path.startsWith('/api/')) {
    try {
      return await handleRest(req, res, path, query);
    } catch (err) {
      return sendJson(res, 500, { error: err?.message || String(err) });
    }
  }

  // MCP over Streamable HTTP.
  if (path !== MCP_PATH) {
    return sendJson(res, 404, { jsonrpc: '2.0', error: { code: -32601, message: 'Not found' }, id: null });
  }
  const server = makeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    let body;
    if (req.method === 'POST') body = await readBody(req);
    await transport.handleRequest(req, res, body);
  } catch (err) {
    if (!res.headersSent) {
      sendJson(res, 500, { jsonrpc: '2.0', error: { code: -32603, message: `Internal error: ${err?.message || String(err)}` }, id: null });
    }
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`source-application service on 0.0.0.0:${PORT} — MCP ${MCP_PATH}, REST /api, health /health`);
});
