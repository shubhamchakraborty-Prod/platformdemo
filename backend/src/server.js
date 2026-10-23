'use strict';
/* Course Finder API (spec B10). No runtime dependencies: Node 18+ http only.
   The engine is the same pure recommend(answers, pack) the prototype runs in the browser. */
const http = require('http');
const { URL } = require('url');
const D = require('./data');
const { makeEngine } = require('./engine');
const { makeTextPack } = require('./i18n');
const { makeStore } = require('./store');
const { makeCatalogue } = require('./catalogue');
const { buildConfig } = require('./config');
const { toPlan, toTrace } = require('./planView');
const { makeLocale, LANGS_SUPPORTED } = require('./locale');
const Q = require('./questions');
const { version: ENGINE_VERSION } = require('../package.json');

const POPULATIONS = ['iti']; // B9.3: diploma, btech, bsc, ba packs plug in here
const EVENTS = ['onboarding_started', 'screen_completed', 'validation_error', 'language_switched', 'review_edit', 'results_viewed', 'course_started', 'live_link_copied', 'saved_for_later', 'plan_feedback'];
const MAX_BODY = 100 * 1024;

class HttpError extends Error { constructor(status, code, message, extra) { super(message); Object.assign(this, { status, code, extra }); } }

function createApp({ dataDir, env = process.env } = {}) {
  const store = makeStore({ dataDir, env });
  const engine = makeEngine(D);
  const catalogue = makeCatalogue(engine, store);
  const staffToken = env.STAFF_TOKEN || '';
  const origins = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
  const rate = new Map(); const RATE_MAX = Number(env.RATE_LIMIT_PER_MIN) || 300;
  const versions = () => ({ engine_version: ENGINE_VERSION, catalogue_version: catalogue.version });
  const langOf = l => (LANGS_SUPPORTED.includes(l) ? l : 'en');

  /* --- helpers --- */
  const errorMessages = (errors, a, lang) => {
    const loc = makeLocale(lang);
    const msg = (id, code) => {
      const q = Q.Q_BY_ID[id];
      if (code === 'required') return q && q.type === 'text' ? loc.t('errText') : q && ['multi', 'chips'].includes(q.type) ? loc.t('errMany') : loc.t('errOne');
      if (code === 'max') return loc.t('errMax', { n: q.max });
      return { unknown: 'Unknown question', type: 'Wrong answer type for this question', option: 'Not one of the options', duplicate: 'An option is repeated', exclusive: `"${q && q.exclusive}" cannot be combined with other options`, tooLong: 'Too long' }[code] || code;
    };
    return Object.fromEntries(Object.entries(errors).map(([id, code]) => [id, { code, message: msg(id, code) }]));
  };
  const planFor = (answers, lang) => {
    const clean = Q.cleanAnswers(answers);
    const result = engine.recommend(clean, makeTextPack(lang, D));
    return { result, plan: toPlan(result, engine, lang, versions()) };
  };
  const requireStaff = req => {
    if (!staffToken) throw new HttpError(503, 'staff_not_configured', 'Staff access is not configured on this server (set STAFF_TOKEN)');
    const h = req.headers.authorization || '';
    const ok = h.startsWith('Bearer ') && timingSafe(h.slice(7), staffToken);
    if (!ok) throw new HttpError(401, 'unauthorised', 'Staff token required');
  };
  const session = id => { const s = store.getSession(id); if (!s) throw new HttpError(404, 'session_not_found', 'No such session'); return s; };
  const planSummary = p => ({ start: p.start && p.start.id, next: p.next.map(c => c.id), also: p.also.map(c => c.id), levels: p.profile.levels });

  /* --- routes: [method, pattern, handler(req, params, body, url)] --- */
  const routes = [
    ['GET', /^\/v1\/health$/, () => ({ status: 200, body: { ok: true, ...versions(), populations: POPULATIONS } })],

    ['GET', /^\/v1\/config$/, (req, p, b, url) => {
      const population = url.searchParams.get('population') || 'iti';
      if (!POPULATIONS.includes(population)) throw new HttpError(404, 'population_not_found', `Population "${population}" has no pack yet. Available: ${POPULATIONS.join(', ')}`);
      return { status: 200, body: buildConfig({ lang: langOf(url.searchParams.get('lang')), population, versions: versions() }) };
    }],

    ['POST', /^\/v1\/sessions$/, (req, p, body) => {
      const population = body.population || 'iti';
      if (!POPULATIONS.includes(population)) throw new HttpError(422, 'population_not_found', `Population "${population}" is not available`);
      const lang = langOf(body.lang);
      const id = store.createSession({ population, lang, answers: {}, plans: [] });
      store.logEvent({ session_id: id, name: 'onboarding_started', props: { lang, has_name: false } });
      return { status: 201, body: { session_id: id, population, lang } };
    }],

    ['GET', /^\/v1\/sessions\/([a-f0-9-]{36})$/, (req, [id]) => {
      const s = session(id);
      const answers = { ...s.answers, ...(store.getName(id) ? { name: store.getName(id) } : {}) };
      const missing = Q.missingForPlan(Q.cleanAnswers(answers));
      return { status: 200, body: { session_id: id, population: s.population, lang: s.lang, answers, missing, plan_ready: missing.length === 0, last_plan: s.plans.slice(-1)[0] || null } };
    }],

    ['DELETE', /^\/v1\/sessions\/([a-f0-9-]{36})$/, (req, [id]) => { session(id); store.deleteSession(id); return { status: 204 }; }],

    ['PATCH', /^\/v1\/sessions\/([a-f0-9-]{36})\/answers$/, (req, [id], body) => {
      const s = session(id);
      const patch = body.answers;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new HttpError(400, 'bad_request', 'Send {"answers": {questionId: value}}');
      const lang = langOf(body.lang || s.lang);
      const merged = { ...s.answers };
      Object.entries(patch).forEach(([k, v]) => { if (k === 'name') return; if (v === null) delete merged[k]; else merged[k] = v; });
      if (body.screen && !Q.SCREEN_BY_KEY[body.screen]) throw new HttpError(422, 'screen_not_found', `Unknown screen "${body.screen}"`);
      const reject = (errors, first) => {
        store.logEvent({ session_id: id, name: 'validation_error', props: { screen_key: body.screen || null, question_id: first } });
        return { status: 422, body: { error: 'validation', errors: errorMessages(errors, merged, lang), first_error: first, saved: false } };
      };
      // 1. malformed values are rejected and nothing is saved
      const bad = Q.validatePartial(patch, merged);
      if (Object.keys(bad).length) return reject(bad, Object.keys(bad)[0]);
      // 2. well-formed answers are always saved, so nothing is lost (A3)
      if ('name' in patch) store.setName(id, (patch.name || '').trim().slice(0, 40));
      if (body.lang && body.lang !== s.lang) store.logEvent({ session_id: id, name: 'language_switched', props: { from: s.lang, to: lang, view: 'questions' } });
      store.saveSession(id, { ...s, lang, answers: merged });
      // 3. Continue on a screen: report unanswered required questions, first one first (B11)
      if (body.screen) {
        const v = Q.validateScreen(body.screen, merged);
        if (Object.keys(v.errors).length) {
          store.logEvent({ session_id: id, name: 'validation_error', props: { screen_key: body.screen, question_id: v.firstError } });
          return { status: 422, body: { error: 'validation', errors: errorMessages(v.errors, merged, lang), first_error: v.firstError, saved: true } };
        }
      }
      if (body.screen) store.logEvent({ session_id: id, name: 'screen_completed', props: { screen_key: body.screen, part: Q.SCREEN_BY_KEY[body.screen].section + 1, ms_on_screen: Number(body.ms_on_screen) || null } });
      return { status: 204 };
    }],

    ['POST', /^\/v1\/sessions\/([a-f0-9-]{36})\/plan$/, (req, [id], body) => {
      const s = session(id);
      const lang = langOf(body.lang || s.lang);
      const answers = { ...s.answers, name: store.getName(id) };
      const missing = Q.missingForPlan(Q.cleanAnswers(answers));
      if (missing.length) return { status: 422, body: { error: 'incomplete', message: 'Some questions are not answered yet', missing } };
      const { plan } = planFor(answers, lang);
      store.saveSession(id, { ...s, lang, plans: s.plans.concat([{ at: new Date().toISOString(), lang, ...planSummary(plan), ...versions() }]).slice(-20) });
      store.logEvent({ session_id: id, name: 'results_viewed', props: { start_course_id: plan.start && plan.start.id, next_ids: plan.next.map(c => c.id), also_ids: plan.also.map(c => c.id), ai_level: plan.profile.levels.ai, comm_level: plan.profile.levels.comm } });
      return { status: 200, body: { session_id: id, ...plan } };
    }],

    /* Stateless plan for bots (B10 integrations: "the career bot can call /plan with the same answers schema") */
    ['POST', /^\/v1\/plan$/, (req, p, body) => {
      const answers = body.answers;
      if (!answers || typeof answers !== 'object') throw new HttpError(400, 'bad_request', 'Send {"answers": {...}, "lang": "en"}');
      const lang = langOf(body.lang);
      const errors = Q.validatePartial(answers, answers);
      if (Object.keys(errors).length) return { status: 422, body: { error: 'validation', errors: errorMessages(errors, answers, lang) } };
      const missing = Q.missingForPlan(Q.cleanAnswers(answers));
      if (missing.length) return { status: 422, body: { error: 'incomplete', message: 'Some questions are not answered yet', missing } };
      return { status: 200, body: planFor(answers, lang).plan };
    }],

    ['GET', /^\/v1\/courses$/, () => ({ status: 200, body: { courses: catalogue.list(), ...versions() } })],
    ['GET', /^\/v1\/courses\/([A-Z0-9-]+)$/, (req, [id]) => {
      const c = catalogue.get(id); if (!c) throw new HttpError(404, 'course_not_found', 'No such course');
      return { status: 200, body: c };
    }],
    ['POST', /^\/v1\/courses$/, (req, p, body) => {
      requireStaff(req);
      const r = catalogue.add(body);
      return { status: r.status, body: r.ok ? { course: r.course, placement: r.placement, ...versions() } : { error: 'invalid_course', errors: r.errors } };
    }],
    ['PATCH', /^\/v1\/courses\/([A-Z0-9-]+)$/, (req, [id], body) => {
      requireStaff(req);
      const r = catalogue.patch(id, body);
      return { status: r.status, body: r.ok ? { course: r.course, placement: r.placement, ...versions() } : { error: 'invalid_course', errors: r.errors } };
    }],

    ['GET', /^\/v1\/staff\/sessions\/([a-f0-9-]{36})\/trace$/, (req, [id]) => {
      requireStaff(req);
      const s = session(id);
      const answers = Q.cleanAnswers(s.answers);
      const missing = Q.missingForPlan(answers);
      if (missing.length) return { status: 422, body: { error: 'incomplete', missing } };
      return { status: 200, body: { session_id: id, ...toTrace(engine.recommend(answers), engine, versions()) } };
    }],

    ['POST', /^\/v1\/events$/, (req, p, body) => {
      if (!EVENTS.includes(body.name)) throw new HttpError(422, 'unknown_event', 'Event must be one of: ' + EVENTS.join(', '));
      if (body.session_id) session(body.session_id);
      const props = body.props && typeof body.props === 'object' ? body.props : {};
      if (JSON.stringify(props).length > 2000) throw new HttpError(413, 'too_large', 'Event properties too large');
      store.logEvent({ session_id: body.session_id || null, name: body.name, props });
      return { status: 202 };
    }],
  ];

  /* --- request handling --- */
  async function handle(req, res) {
    const origin = req.headers.origin;
    const allow = origins.includes('*') ? '*' : origins.includes(origin) ? origin : null;
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
    if (allow) Object.assign(headers, { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', Vary: 'Origin' });
    const send = (status, body) => { res.writeHead(status, headers); res.end(body === undefined ? '' : JSON.stringify(body)); };
    try {
      if (req.method === 'OPTIONS') return send(204);
      const ip = req.socket.remoteAddress || '?'; const now = Date.now();
      const r = rate.get(ip) || { n: 0, t: now }; if (now - r.t > 60000) { r.n = 0; r.t = now; }
      if (++r.n > RATE_MAX) { rate.set(ip, r); throw new HttpError(429, 'rate_limited', 'Too many requests. Try again in a minute'); }
      rate.set(ip, r);
      const url = new URL(req.url, 'http://x');
      const route = routes.find(([m, re]) => m === req.method && re.test(url.pathname));
      if (!route) {
        const any = routes.some(([, re]) => re.test(url.pathname));
        throw new HttpError(any ? 405 : 404, any ? 'method_not_allowed' : 'not_found', any ? 'Method not allowed' : 'Not found');
      }
      const params = url.pathname.match(route[1]).slice(1);
      const body = ['POST', 'PATCH'].includes(req.method) ? await readJson(req) : {};
      const out = await route[2](req, params, body, url);
      send(out.status, out.body);
    } catch (e) {
      if (e instanceof HttpError) return send(e.status, { error: e.code, message: e.message, ...(e.extra || {}) });
      console.error('[api]', e);
      send(500, { error: 'server_error', message: 'Something went wrong on our side' });
    }
  }

  return { handle, store, engine, catalogue, versions };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new HttpError(413, 'too_large', 'Request body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' ? v : {}); }
      catch (e) { reject(new HttpError(400, 'bad_json', 'Body is not valid JSON')); }
    });
    req.on('error', reject);
  });
}

function timingSafe(a, b) {
  const crypto = require('crypto');
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function createServer(opts) {
  const app = createApp(opts);
  const server = http.createServer(app.handle);
  server.app = app;
  return server;
}

module.exports = { createApp, createServer, EVENTS, POPULATIONS };
