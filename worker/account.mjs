// Only deploy this handler behind Sites dispatch, which supplies the authenticated identity headers.
const idPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const visitPath = new RegExp('^/api/account/visits/(' + idPattern + ')$');
const uuid = new RegExp('^' + idPattern + '$');
const checkNames = ['confirmed', 'documents', 'questions', 'travel'];
const statuses = ['planned', 'complete', 'cancelled'];
const columns = 'id, title, facility, date, time, checks, status, revision, updated_at';
const maxBody = 4096;

function json(data, status = 200, headers = {}) {
  return Response.json(data, {status, headers: {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  }});
}

function failure(error, status) {
  return json({error}, status);
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return JSON.parse(await new Blob(chunks).text());
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function visitInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (Object.keys(body).some(key => !['title','facility','date','time','checks','status','revision','requestId'].includes(key))) return null;
  const {title, facility, date, time, checks, status} = body;
  if (typeof title !== 'string' || !title.trim() || title.length > 100) return null;
  if (typeof facility !== 'string' || !facility.trim() || facility.length > 120) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01' || date > '2199-12-31') return null;
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  if (typeof time !== 'string' || (time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) return null;
  if (!Array.isArray(checks) || checks.length > checkNames.length || checks.some(check => !checkNames.includes(check))) return null;
  if (!statuses.includes(status)) return null;
  return [title.trim(), facility.trim(), date, time, JSON.stringify([...new Set(checks)]), status];
}

function visitResponse(row) {
  return {...row, checks: JSON.parse(row.checks)};
}

async function handleVisitRecords(request, env, ownerId, url, id) {
  const db = env.DB;
  if (!db) return failure('Account storage is unavailable. Try again later.', 503);

  if (request.method === 'GET') {
    if (id) return failure('This address does not support that method.', 405);
    const {results} = await db.prepare(
      `SELECT ${columns} FROM planner_visits WHERE owner_id = ? ORDER BY date ASC, time ASC, id ASC`,
    ).bind(ownerId).all();
    return json({visits: results.map(visitResponse)});
  }

  if (request.headers.get('Origin') !== url.origin) return failure('Open CareRoute directly to make changes.', 403);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return failure('Open CareRoute directly to make changes.', 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) {
    return failure('Expected a JSON request.', 415);
  }
  if (!((request.method === 'POST' && !id) || (id && ['PUT','DELETE'].includes(request.method)))) {
    return failure('This address does not support that method.', 405);
  }

  const body = await readBody(request);
  const now = new Date().toISOString();
  if (request.method === 'POST') {
    const values = visitInput(body);
    if (!values || typeof body.requestId !== 'string' || !uuid.test(body.requestId)) return failure('Check the visit name, provider, date and time.', 400);
    const row = await db.prepare(`
      INSERT INTO planner_visits (id, owner_id, title, facility, date, time, checks, status, updated_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM planner_visits WHERE owner_id = ?) < 100
      ON CONFLICT(id) DO NOTHING
      RETURNING ${columns}`).bind(body.requestId, ownerId, ...values, now, ownerId).first();
    if (row) return json({visit: visitResponse(row)}, 201);
    const existing = await db.prepare(`SELECT ${columns} FROM planner_visits WHERE id = ? AND owner_id = ?`)
      .bind(body.requestId, ownerId).first();
    if (existing) return json({visit: visitResponse(existing)});
    return failure('Could not add this visit. Check the planner’s 100-visit limit and refresh before trying again.', 409);
  }

  if (!Number.isSafeInteger(body?.revision) || body.revision < 1) {
    return failure('Reload the visit before making a change.', 400);
  }
  if (request.method === 'DELETE') {
    const row = await db.prepare('DELETE FROM planner_visits WHERE id = ? AND owner_id = ? AND revision = ? RETURNING id')
      .bind(id, ownerId, body.revision).first();
    if (row) return json({deleted: true});
  } else {
    const values = visitInput(body);
    if (!values) return failure('Check the visit name, provider, date and time.', 400);
    const row = await db.prepare(`
      UPDATE planner_visits
      SET title = ?, facility = ?, date = ?, time = ?, checks = ?, status = ?, updated_at = ?, revision = revision + 1
      WHERE id = ? AND owner_id = ? AND revision = ?
      RETURNING ${columns}`).bind(...values, now, id, ownerId, body.revision).first();
    if (row) return json({visit: visitResponse(row)});
  }

  const current = await db.prepare('SELECT id FROM planner_visits WHERE id = ? AND owner_id = ?')
    .bind(id, ownerId).first();
  return current ? failure('This visit changed in another window. Reload your visits before trying again.', 409)
    : failure('Visit not found.', 404);
}

export async function handleAccountRequest(request, env) {
  const url = new URL(request.url);
  const ownerId = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  if (url.pathname === '/api/account/session') {
    if (request.method !== 'GET') return failure('This address only supports GET.', 405);
    return json({account: ownerId && email ? {email} : null});
  }

  const id = url.pathname.match(visitPath)?.[1];
  if (url.pathname !== '/api/account/visits' && !id) return failure('Not found.', 404);
  if (!ownerId || !email) return failure('Sign in to open your visit planner.', 401);
  try {
    return await handleVisitRecords(request, env, ownerId, url, id);
  } catch {
    return failure('The visit planner could not complete the request. Try again later.', 503);
  }
}

export function createSiteHandler(assets) {
  return async function fetch(request, env) {
    const {pathname} = new URL(request.url);
    if (pathname.startsWith('/api/')) return handleAccountRequest(request, env);
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', {status: 405});
    const path = pathname === '/' ? '/index.html' : pathname;
    if (!Object.hasOwn(assets, path)) return new Response('Not found', {status: 404});
    const [contentType, content] = assets[path];
    const body = request.method === 'HEAD' ? null : Uint8Array.from(atob(content), char => char.charCodeAt(0));
    return new Response(body, {headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    }});
  };
}
