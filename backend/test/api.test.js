'use strict';
/* API integration (B10): every endpoint over real HTTP, staff auth, persistence, encryption at rest. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { createServer } = require('../src/server');
const { PERSONAS } = require('../src/personas');
const { SCREENS } = require('../src/questionnaire');
const D = require('../src/data');

const STAFF = 'test-staff-token';
const KEY = crypto.randomBytes(32).toString('base64');
const env = { STAFF_TOKEN: STAFF, DATA_KEY: KEY, QUIET: '1' };

async function start(dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-api-')), e = env) {
  const server = createServer({ dataDir, env: e });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, url, body, headers = {}) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  };
  return { server, call, dataDir, close: () => new Promise(r => server.close(r)) };
}
const staff = { Authorization: 'Bearer ' + STAFF };

async function answerAll(call, sid, answers) {
  for (const sc of SCREENS) {
    const a = {}; sc.qs.forEach(q => { if (answers[q.id] !== undefined) a[q.id] = answers[q.id]; });
    if (sc.key === 'iti' && answers.name) a.name = answers.name;
    const r = await call('PATCH', `/v1/sessions/${sid}/answers`, { answers: a, screen: sc.key });
    assert.equal(r.status, 204, `${sc.key}: ${JSON.stringify(r.body)}`);
  }
}

test('full learner journey over the API, English then Hindi', async () => {
  const { call, close } = await start();
  try {
    assert.equal((await call('GET', '/v1/health')).body.ok, true);
    const cfg = await call('GET', '/v1/config?population=iti&lang=hi');
    assert.equal(cfg.status, 200);
    assert.equal(cfg.body.screens.length, 15);
    assert.equal(cfg.body.sections.length, 8);
    assert.match(cfg.body.screens[0].questions[0].options[0].label, /\(Electrician\)/, 'Hindi trade name with English in brackets (A6)');
    const notice = cfg.body.screens.flatMap(s => s.questions).find(q => q.id === 'readNotice');
    assert.equal(notice.scene.text, 'Workshop closed on Monday. Bring your ID card on Tuesday.', 'English notice kept in English');
    assert.equal((await call('GET', '/v1/config?population=btech')).status, 404);

    const { body: s } = await call('POST', '/v1/sessions', { population: 'iti', lang: 'en' });
    assert.match(s.session_id, /^[a-f0-9-]{36}$/);
    const priya = PERSONAS.find(p => p.key === 'priya').answers;
    await answerAll(call, s.session_id, priya);

    const got = await call('GET', `/v1/sessions/${s.session_id}`);
    assert.equal(got.body.plan_ready, true);
    assert.equal(got.body.answers.name, 'Priya');

    const plan = await call('POST', `/v1/sessions/${s.session_id}/plan`, { lang: 'en' });
    assert.equal(plan.status, 200);
    assert.equal(plan.body.start.name, 'Python for Data Work');
    assert.deepEqual(plan.body.next.map(c => c.name), ['Trade and Team Communication', 'SwiftChat Bot Builder']);
    assert.ok(plan.body.also.length >= 1);
    assert.equal(plan.body.header.title, 'Priya, here is your learning plan');
    assert.equal(plan.body.live.url, D.LIVE_COURSE.url);
    assert.ok(plan.body.engine_version && plan.body.catalogue_version, 'plan records versions');
    assert.equal(plan.body.profile.summary.length, 8);

    const planHi = await call('POST', `/v1/sessions/${s.session_id}/plan`, { lang: 'hi' });
    assert.equal(planHi.body.start.name, 'Python for Data Work', 'course names stay in English');
    assert.match(planHi.body.start.why, /[ऀ-ॿ]/, 'reason rebuilt in Hindi');

    const last = await call('GET', `/v1/sessions/${s.session_id}`);
    assert.equal(last.body.last_plan.start, 'AI01');
  } finally { await close(); }
});

test('validation: blocks malformed answers, saves the rest, focuses the first missing question', async () => {
  const { call, close } = await start();
  try {
    const sid = (await call('POST', '/v1/sessions', {})).body.session_id;
    let r = await call('PATCH', `/v1/sessions/${sid}/answers`, { answers: { trade: 'astronaut' } });
    assert.equal(r.status, 422); assert.equal(r.body.errors.trade.code, 'option'); assert.equal(r.body.saved, false);
    r = await call('PATCH', `/v1/sessions/${sid}/answers`, { answers: { trade: 'fitter' }, screen: 'iti', lang: 'hi' });
    assert.equal(r.status, 422); assert.equal(r.body.first_error, 'itiStatus'); assert.equal(r.body.saved, true);
    assert.equal(r.body.errors.itiStatus.message, 'कृपया एक जवाब चुनें।');
    assert.equal((await call('GET', `/v1/sessions/${sid}`)).body.answers.trade, 'fitter', 'valid answer kept');
    r = await call('POST', `/v1/sessions/${sid}/plan`, {});
    assert.equal(r.status, 422); assert.ok(r.body.missing.includes('itiStatus'));
    assert.equal((await call('PATCH', `/v1/sessions/${sid}/answers`, { answers: {}, screen: 'nope' })).status, 422);
    assert.equal((await call('PATCH', `/v1/sessions/${sid}/answers`, { nope: 1 })).status, 400);
    assert.equal((await call('PATCH', `/v1/sessions/${sid}/answers`, '{bad json')).status, 400);
    assert.equal((await call('GET', '/v1/sessions/00000000-0000-0000-0000-000000000000')).status, 404);
  } finally { await close(); }
});

test('stateless /v1/plan for the career bot', async () => {
  const { call, close } = await start();
  try {
    const r = await call('POST', '/v1/plan', { answers: PERSONAS.find(p => p.key === 'kavya').answers, lang: 'en' });
    assert.equal(r.status, 200);
    assert.equal(r.body.start.name, 'Applied AI 3: Trust, Safety and Harm');
    assert.equal((await call('POST', '/v1/plan', { answers: { trade: 'fitter' } })).status, 422);
    assert.equal((await call('POST', '/v1/plan', { answers: { trade: 'x' } })).body.errors.trade.code, 'option');
  } finally { await close(); }
});

test('staff endpoints need the staff token; trace explains every course', async () => {
  const { call, close } = await start();
  try {
    const sid = (await call('POST', '/v1/sessions', {})).body.session_id;
    await answerAll(call, sid, PERSONAS.find(p => p.key === 'ramesh').answers);
    assert.equal((await call('GET', `/v1/staff/sessions/${sid}/trace`)).status, 401);
    assert.equal((await call('GET', `/v1/staff/sessions/${sid}/trace`, undefined, { Authorization: 'Bearer wrong' })).status, 401);
    const t = await call('GET', `/v1/staff/sessions/${sid}/trace`, undefined, staff);
    assert.equal(t.status, 200);
    assert.equal(t.body.courses.length, D.COURSES.length);
    assert.equal(t.body.courses[0].id, 'AIF-1');
    assert.equal(t.body.courses[0].score, 0.74);
    assert.ok(Array.isArray(t.body.unserved));
    assert.ok(t.body.courses.every(c => ['eligible', 'later', 'excluded'].includes(c.status)));

    assert.equal((await call('POST', '/v1/courses', D.NEW_COURSE_DEMO)).status, 401, 'adding courses is staff only');
    const add = await call('POST', '/v1/courses', D.NEW_COURSE_DEMO, staff);
    assert.equal(add.status, 201, JSON.stringify(add.body));
    assert.ok(add.body.placement.leadsTo.includes('BOT-1'));
    const bad = await call('POST', '/v1/courses', { id: 'X1' }, staff);
    assert.equal(bad.status, 422); assert.ok(bad.body.errors.length > 5);
    assert.equal((await call('PATCH', '/v1/courses/CR-CV1', { difficulty: 9 }, staff)).status, 422);
    assert.equal((await call('PATCH', '/v1/courses/CR-CV1', { difficulty: 3 }, staff)).status, 200);
    assert.equal((await call('GET', '/v1/courses/CR-CV1')).body.difficulty, 3);
    assert.equal((await call('GET', '/v1/courses')).body.courses.length, D.COURSES.length + 1);
  } finally { await close(); }
});

test('staff access is closed when no token is configured', async () => {
  const { call, close } = await start(undefined, { DATA_KEY: KEY, QUIET: '1' });
  try { assert.equal((await call('POST', '/v1/courses', {}, staff)).status, 503); } finally { await close(); }
});

test('sessions persist across restarts and are encrypted at rest; delete erases them', async () => {
  const a = await start();
  const sid = (await a.call('POST', '/v1/sessions', {})).body.session_id;
  await a.call('PATCH', `/v1/sessions/${sid}/answers`, { answers: { name: 'Zubeida', trade: 'welder' } });
  await a.close();
  const raw = fs.readdirSync(path.join(a.dataDir, 'sessions')).map(f => fs.readFileSync(path.join(a.dataDir, 'sessions', f), 'utf8')).join('')
    + fs.readdirSync(path.join(a.dataDir, 'names')).map(f => fs.readFileSync(path.join(a.dataDir, 'names', f), 'utf8')).join('');
  assert.ok(!raw.includes('welder') && !raw.includes('Zubeida'), 'answers and name are not stored in plain text');
  const events = fs.readFileSync(path.join(a.dataDir, 'events.jsonl'), 'utf8');
  assert.ok(!events.includes('Zubeida'), 'events carry the session ID only');

  const b = await start(a.dataDir);
  try {
    const s = await b.call('GET', `/v1/sessions/${sid}`);
    assert.equal(s.body.answers.trade, 'welder');
    assert.equal(s.body.answers.name, 'Zubeida');
    assert.equal((await b.call('DELETE', `/v1/sessions/${sid}`)).status, 204);
    assert.equal((await b.call('GET', `/v1/sessions/${sid}`)).status, 404);
  } finally { await b.close(); }

  const wrongKey = await start(a.dataDir, { ...env, DATA_KEY: crypto.randomBytes(32).toString('base64') });
  try { assert.equal((await wrongKey.call('GET', '/v1/courses')).status, 200, 'a wrong key cannot read data but the API still runs'); } finally { await wrongKey.close(); }
});

test('events, CORS, routing errors', async () => {
  const { call, close } = await start();
  try {
    const sid = (await call('POST', '/v1/sessions', {})).body.session_id;
    assert.equal((await call('POST', '/v1/events', { session_id: sid, name: 'plan_feedback', props: { value: 'up' } })).status, 202);
    assert.equal((await call('POST', '/v1/events', { name: 'clicked_ad' })).status, 422);
    const pre = await call('OPTIONS', '/v1/plan', undefined, { Origin: 'https://example.org' });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), '*');
    assert.equal((await call('GET', '/v1/nothing')).status, 404);
    assert.equal((await call('DELETE', '/v1/courses')).status, 405);
  } finally { await close(); }
});
