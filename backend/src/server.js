/**
 * server.js  –  ShellForge File Manager REST API
 *
 * Architecture:
 *   Browser → Express → shellforge.js wrapper → C adapter → POSIX syscalls
 *
 * Endpoints:
 *   GET    /api/health
 *   GET    /api/files?path=<rel>
 *   GET    /api/files/metadata?path=<rel>
 *   GET    /api/files/content?path=<rel>
 *   POST   /api/files            body: {path, type: "file"|"directory"}
 *   PUT    /api/files/content    body: {path, content}
 *   POST   /api/files/copy       body: {src, dst}
 *   POST   /api/files/move       body: {src, dst}
 *   POST   /api/files/rename     body: {src, newName}
 *   DELETE /api/files            body: {path}
 *   GET    /api/search?q=<pat>&path=<rel>
 *   GET    /api/files/permissions?path=<rel>
 *   PATCH  /api/files/permissions body: {path, mode}
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { callAdapter, WORKSPACE } from './shellforge.js';

const app = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware ─────────────────────────────────────────── */
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

/* ── Response helpers ───────────────────────────────────── */
const ok = (res, data, message = 'OK') =>
  res.json({ success: true, data, message });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, data: null, message });

/* ── Health ─────────────────────────────────────────────── */
app.get('/api/health', async (_req, res) => {
  try {
    /* Quick sanity check: list workspace root */
    await callAdapter('list', ['']);
    ok(res, {
      status: 'ok',
      workspace: WORKSPACE,
      adapterReady: true,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(503).json({
      success: false,
      data: { status: 'degraded', adapterReady: false, workspace: WORKSPACE, error: e.message },
      message: 'Backend degraded – adapter not ready',
    });
  }
});

/* ── List directory ─────────────────────────────────────── */
app.get('/api/files', async (req, res) => {
  const path = req.query.path ?? '';
  try {
    const entries = await callAdapter('list', [path]);
    ok(res, { path, entries });
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── File / directory metadata ──────────────────────────── */
app.get('/api/files/metadata', async (req, res) => {
  const { path } = req.query;
  if (!path) return fail(res, "'path' query param required");
  try {
    const meta = await callAdapter('stat', [path]);
    ok(res, meta);
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Read file content ──────────────────────────────────── */
app.get('/api/files/content', async (req, res) => {
  const { path } = req.query;
  if (!path) return fail(res, "'path' query param required");
  try {
    const result = await callAdapter('read', [path]);
    ok(res, result);
  } catch (e) {
    const status = e.message.includes('too large') ? 413 : 422;
    fail(res, e.message, status);
  }
});

/* ── Create file or directory ───────────────────────────── */
app.post('/api/files', async (req, res) => {
  const { path, type = 'file' } = req.body;
  if (!path) return fail(res, "'path' is required");
  if (!['file', 'directory'].includes(type))
    return fail(res, "'type' must be 'file' or 'directory'");

  try {
    const op = type === 'directory' ? 'mkdir' : 'touch';
    await callAdapter(op, [path]);
    const meta = await callAdapter('stat', [path]);
    ok(res, meta, `${type === 'directory' ? 'Directory' : 'File'} created`);
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Write / update file content ────────────────────────── */
app.put('/api/files/content', async (req, res) => {
  const { path, content } = req.body;
  if (!path) return fail(res, "'path' is required");
  if (content === undefined) return fail(res, "'content' is required");
  try {
    await callAdapter('write', [path, content]);
    const meta = await callAdapter('stat', [path]);
    ok(res, meta, 'File saved');
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Copy ───────────────────────────────────────────────── */
app.post('/api/files/copy', async (req, res) => {
  const { src, dst } = req.body;
  if (!src || !dst) return fail(res, "'src' and 'dst' are required");
  try {
    await callAdapter('copy', [src, dst]);
    ok(res, {}, 'Copied successfully');
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Move ───────────────────────────────────────────────── */
app.post('/api/files/move', async (req, res) => {
  const { src, dst } = req.body;
  if (!src || !dst) return fail(res, "'src' and 'dst' are required");
  try {
    await callAdapter('move', [src, dst]);
    ok(res, {}, 'Moved successfully');
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Rename ─────────────────────────────────────────────── */
app.post('/api/files/rename', async (req, res) => {
  const { src, newName } = req.body;
  if (!src || !newName) return fail(res, "'src' and 'newName' are required");
  if (newName.includes('/') || newName === '.' || newName === '..')
    return fail(res, 'Invalid filename');

  /* Build dst = parent(src) / newName */
  const parentDir = src.includes('/') ? src.substring(0, src.lastIndexOf('/')) : '';
  const dst = parentDir ? `${parentDir}/${newName}` : newName;

  try {
    await callAdapter('move', [src, dst]);
    const meta = await callAdapter('stat', [dst]);
    ok(res, meta, 'Renamed successfully');
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Delete ─────────────────────────────────────────────── */
app.delete('/api/files', async (req, res) => {
  const { path } = req.body;
  if (!path) return fail(res, "'path' is required");
  try {
    await callAdapter('remove', [path]);
    ok(res, {}, 'Deleted successfully');
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Search ─────────────────────────────────────────────── */
app.get('/api/search', async (req, res) => {
  const { q, path = '' } = req.query;
  if (!q) return fail(res, "'q' query param required");

  /* Surround with wildcards for contains-match */
  const pattern = q.includes('*') ? q : `*${q}*`;

  try {
    const results = await callAdapter('find', [path, pattern]);
    ok(res, { query: q, path, results });
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Get permissions ────────────────────────────────────── */
app.get('/api/files/permissions', async (req, res) => {
  const { path } = req.query;
  if (!path) return fail(res, "'path' query param required");
  try {
    const meta = await callAdapter('stat', [path]);
    ok(res, {
      path,
      permissions: meta.permissions,
      octalMode: meta.octalMode,
      owner: meta.owner,
      group: meta.group,
      uid: meta.uid,
      gid: meta.gid,
    });
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── Update permissions ─────────────────────────────────── */
app.patch('/api/files/permissions', async (req, res) => {
  const { path, mode } = req.body;
  if (!path || !mode) return fail(res, "'path' and 'mode' are required");
  if (!/^[0-7]{3,4}$/.test(mode)) return fail(res, 'mode must be octal (e.g. 644)');
  try {
    await callAdapter('chmod', [mode, path]);
    const meta = await callAdapter('stat', [path]);
    ok(res, meta, 'Permissions updated');
  } catch (e) {
    fail(res, e.message, 422);
  }
});

/* ── 404 catch-all ──────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

/* ── Global error handler ───────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

/* ── Start ──────────────────────────────────────────────── */
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🔧 ShellForge API running at http://127.0.0.1:${PORT}`);
  console.log(`📁 Workspace: ${WORKSPACE}`);
  console.log(`✅ All requests validated through C adapter\n`);
});
