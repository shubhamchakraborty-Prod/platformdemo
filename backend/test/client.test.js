'use strict';
/* The bot-facing client works against the real server. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer } = require('../src/server');
const { createClient, ApiError } = require('../client/course-finder-client');
const { PERSONAS } = require('../src/personas');

test('client: session flow, validation errors and staff calls', async () => {
  const server = createServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cf-cl-')), env: { STAFF_TOKEN: 's3', QUIET: '1' } });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const cf = createClient(`http://127.0.0.1:${server.address().port}/`, { staffToken: 's3' });
  try {
    assert.equal((await cf.config('hi')).lang, 'hi');
    const { session_id } = await cf.createSession('en');
    await assert.rejects(cf.saveAnswers(session_id, { trade: 'fitter' }, 'iti'), e => e instanceof ApiError && e.status === 422 && e.errors.itiStatus.code === 'required');
    await cf.saveAnswers(session_id, PERSONAS[3].answers);
    const plan = await cf.plan(session_id, 'hi');
    assert.equal(plan.start.name, 'Everyday AI Basics');
    assert.equal((await cf.trace(session_id)).courses.length, 19);
    await assert.rejects(cf.planFromAnswers({}), e => e.status === 422 && e.missing.length > 10);
    await cf.event('plan_feedback', { value: 'up' }, session_id);
  } finally { await new Promise(r => server.close(r)); }
});
