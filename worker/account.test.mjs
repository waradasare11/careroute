import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {test} from 'node:test';
import {handleAccountRequest} from './account.mjs';

test('account API protects records and supports the complete visit lifecycle', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(readFileSync(new URL('../drizzle/0000_planner_visits.sql', import.meta.url), 'utf8'));
    const env = {DB: {prepare: sql => ({bind: (...parameters) => ({
      first: async () => sqlite.prepare(sql).get(...parameters) ?? null,
      all: async () => ({results: sqlite.prepare(sql).all(...parameters)}),
    })})}};
    const origin = 'https://planner.example';
    const list = '/api/account/visits';
    const session = '/api/account/session';
    const alice = 'local-test-alice';
    const bob = 'local-test-bob';
    const data = {title: 'Sample follow-up', facility: 'Example clinic', date: '2027-02-01',
      time: '10:30', status: 'planned', checks: ['travel'], requestId: crypto.randomUUID()};
    const request = (path, owner, method = 'GET', body, from = origin) => {
      const headers = {Origin: from, 'Content-Type': 'application/json'};
      if (owner) {
        headers['oai-authenticated-user-id'] = owner;
        headers['oai-authenticated-user-email'] = owner + '@example.test';
      }
      return handleAccountRequest(new Request(origin + path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)}), env);
    };
    assert.equal((await request(list)).status, 401);
    assert.deepEqual(await (await request(session)).json(), {account: null});
    assert.deepEqual(await (await request(session, alice)).json(), {account: {email: alice + '@example.test'}});
    assert.equal((await request(list, alice, 'POST', data, 'https://outside.example')).status, 403);
    assert.equal((await request(list, alice, 'POST', {...data, date: '2027-02-30'})).status, 400);
    assert.equal((await request(list, alice, 'POST', {...data, title: 'x'.repeat(5000)})).status, 400);
    const response = await request(list, alice, 'POST', data);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    const {visit} = await response.json();
    const detail = list + '/' + visit.id;
    assert.deepEqual(await (await request(list, bob)).json(), {visits: []});
    assert.equal((await request(list, alice, 'POST', data)).status, 200);
    assert.equal((await (await request(list, alice)).json()).visits.length, 1);
    assert.equal((await request(detail, bob, 'DELETE', {revision: 1})).status, 404);
    assert.equal((await request(detail, bob, 'PUT', {...data, revision: 1})).status, 404);
    const edited = await request(detail, alice, 'PUT', {...data, status: 'complete', revision: 1});
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).visit.revision, 2);
    assert.equal((await request(detail, alice, 'DELETE', {revision: 1})).status, 409);
    assert.equal((await request(detail, alice, 'DELETE', {revision: 2})).status, 200);
    assert.deepEqual(await (await request(list, alice)).json(), {visits: []});
  } finally {
    sqlite.close();
  }
});
