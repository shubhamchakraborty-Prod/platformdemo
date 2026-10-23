'use strict';
/* Course catalogue: validation at ingestion (B9.1), add or change a course by metadata only (B9.2),
   and a version hash that every plan records (B10). */
const crypto = require('crypto');
const { SKILLS, INTERESTS, TRADES, EDU_RANK, CATEGORY } = require('./data');
const { LANGS } = require('./questionnaire');
const { HI } = require('./i18n');

const STAGES = ['foundation', 'skill', 'applied'];
const STATUSES = ['repository', 'demo', 'authored'];
const TAGS = ['jobReady', 'short', 'access'];
const LIVE_LANGS = ['hi']; // English lives on the record itself
const TRADE_IDS = new Set(['all', ...TRADES.map(t => t.id), ...TRADES.map(t => t.group)]);

const isStr = v => typeof v === 'string' && v.trim() !== '';
const isList = v => Array.isArray(v);

function validateCourse(c, { tracks = ['ai', 'comm'] } = {}) {
  const errors = [];
  const req = (k, ok, msg) => { if (!ok) errors.push({ field: k, error: msg }); };
  if (!c || typeof c !== 'object') return [{ field: '*', error: 'Course must be a JSON object' }];

  req('id', isStr(c.id) && /^[A-Z0-9][A-Z0-9-]{1,19}$/.test(c.id), 'Required. Upper-case letters, digits and hyphens, up to 20 characters');
  req('name', isStr(c.name), 'Required: official course name');
  req('category', Object.keys(CATEGORY).includes(c.category), 'Required: one of ' + Object.keys(CATEGORY).join(', '));
  req('domain', isStr(c.domain), 'Required');
  req('subdomain', isStr(c.subdomain), 'Required');
  req('status', STATUSES.includes(c.status), 'Required: one of ' + STATUSES.join(', '));
  req('source', isStr(c.source), 'Required: where the content comes from');
  req('stage', STAGES.includes(c.stage), 'Required: one of ' + STAGES.join(', '));
  req('difficulty', Number.isInteger(c.difficulty) && c.difficulty >= 1 && c.difficulty <= 5, 'Required: whole number 1-5');
  req('hours', typeof c.hours === 'number' && c.hours > 0, 'Required: total learning hours');
  req('modules', isList(c.modules) && c.modules.length > 0 && c.modules.every(m => isStr(m) || (m && isStr(m.n) && typeof m.h === 'number' && m.h > 0)), 'Required: list of module names, or {n, h} with hours');
  req('langs', isList(c.langs) && c.langs.length > 0 && c.langs.every(l => LANGS.includes(l)), 'Required: delivery languages from the language list');
  req('langStrict', typeof c.langStrict === 'boolean', 'Required: true when learners must read a delivery language');
  req('prereq', c.prereq && isList(c.prereq.all) && isList(c.prereq.any), 'Required: {all: [], any: []}');
  req('teaches', isList(c.teaches) && c.teaches.length > 0, 'Required: skills taught, from the skill list');
  req('trades', isList(c.trades) && c.trades.length > 0 && c.trades.every(t => TRADE_IDS.has(t)), 'Required: trade IDs, trade groups or "all"');
  req('tradeContext', c.tradeContext === undefined || typeof c.tradeContext === 'boolean', 'Must be true or false');
  req('interests', isList(c.interests) && c.interests.every(i => INTERESTS[i]), 'Required: list of interest IDs (may be empty)');
  req('tags', isList(c.tags) && c.tags.every(t => TAGS.includes(t)), 'Required: subset of ' + TAGS.join(', '));
  req('oneLiner', isStr(c.oneLiner), 'Required: one-line description');
  req('promise', isStr(c.promise), 'Required: promise sentence that closes every reason');
  req('nsqf', isStr(c.nsqf), 'Required: NSQF text, or "NSQF to be confirmed"');

  if (c.prereq && isList(c.prereq.all) && isList(c.prereq.any)) {
    req('prereq.minEducation', c.prereq.minEducation === undefined || EDU_RANK[c.prereq.minEducation] !== undefined, 'Unknown education level');
    req('prereq.experience', c.prereq.experience === undefined || c.prereq.experience === 'job', 'Only "job" is supported');
  }
  const skillRefs = [...(isList(c.teaches) ? c.teaches : []), ...(c.prereq && isList(c.prereq.all) ? c.prereq.all : []), ...(c.prereq && isList(c.prereq.any) ? c.prereq.any : [])];
  const unknown = [...new Set(skillRefs.filter(s => !SKILLS[s]))];
  if (unknown.length) errors.push({ field: 'skills', error: 'Unknown skill IDs: ' + unknown.join(', ') + '. Add new skills to the vocabulary first (B9.2 step 2)' });

  if (isList(c.modules) && c.modules.length && c.modules.every(m => m && typeof m.h === 'number') && typeof c.hours === 'number') {
    const sum = Math.round(c.modules.reduce((t, m) => t + m.h, 0) * 100) / 100;
    req('modules', sum === c.hours, `Module hours add up to ${sum}, but hours is ${c.hours}`);
  }
  // learners see NSQF text only when it is a real or proposed level; anything else stays "to be confirmed" (A7 rule 7)
  if (isStr(c.nsqf)) req('nsqf', /^NSQF to be confirmed$/.test(c.nsqf) || /^NSQF \d+(\.\d+)?(-\d+(\.\d+)?)?( \(proposed\))?$/.test(c.nsqf), 'Use "NSQF 4", "NSQF 2.5-3", "NSQF 4 (proposed)" or "NSQF to be confirmed"');
  req('nsqfNum', c.nsqfNum == null || typeof c.nsqfNum === 'number', 'Must be a number or null');
  if (c.ladder != null) req('ladder', tracks.includes(c.ladder.track) && Number.isInteger(c.ladder.rung) && c.ladder.rung >= 1, 'Must be {track: ' + tracks.join('|') + ', rung: 1+}');
  if (c.series != null) req('series', isStr(c.series.id) && Number.isInteger(c.series.order), 'Must be {id, order}');
  if (c.device != null) req('device', c.device === 'computer', 'Only "computer" is supported');
  if (c.minRelevance != null) req('minRelevance', typeof c.minRelevance === 'number' && c.minRelevance >= 0 && c.minRelevance <= 1, 'Must be a number 0-1');
  if (c.url != null) req('url', isStr(c.url) && /^https:\/\/[^\s]+$/.test(c.url), 'Must be an https URL');

  // every live language must carry the learner copy (B9.1)
  LIVE_LANGS.forEach(l => {
    const have = (c.i18n && c.i18n[l]) || (HI.course[c.id] || {});
    req(`i18n.${l}.one`, isStr(have.one), `One-liner in "${l}" is required`);
    req(`i18n.${l}.promise`, isStr(have.promise), `Promise sentence in "${l}" is required`);
  });
  return errors;
}

/* Wraps an engine with persistent, validated catalogue changes. */
function makeCatalogue(engine, store) {
  let version = hashCourses(engine.courses);

  function hashCourses(list) {
    const h = crypto.createHash('sha256').update(JSON.stringify(list.map(c => ({ ...c, i18n: c.i18n })))).digest('hex');
    return 'cat-' + h.slice(0, 12);
  }
  function registerText(c) {
    if (c.i18n && c.i18n.hi) HI.course[c.id] = { ...(HI.course[c.id] || {}), one: c.i18n.hi.one, promise: c.i18n.hi.promise };
  }
  function apply(c) {
    registerText(c);
    const r = engine.addCourse(c);
    version = hashCourses(engine.courses);
    return r;
  }

  // replay saved changes on boot
  (store.read('catalogue') || { courses: [] }).courses.forEach(c => { if (!validateCourse(c).length) apply(c); });
  version = hashCourses(engine.courses);

  function persist(c) {
    const saved = store.read('catalogue') || { courses: [] };
    saved.courses = saved.courses.filter(x => x.id !== c.id).concat([c]);
    store.write('catalogue', saved);
  }

  return {
    get version() { return version; },
    list: () => engine.courses,
    get: id => engine.courses.find(c => c.id === id) || null,
    add(c) {
      if (engine.courses.some(x => x.id === c.id)) return { ok: false, status: 409, errors: [{ field: 'id', error: 'A course with this ID exists. Use PATCH to change it' }] };
      const errors = validateCourse(c);
      if (errors.length) return { ok: false, status: 422, errors };
      const placement = apply(c); persist(c);
      return { ok: true, status: 201, course: c, placement };
    },
    patch(id, changes) {
      const cur = engine.courses.find(c => c.id === id);
      if (!cur) return { ok: false, status: 404, errors: [{ field: 'id', error: 'No such course' }] };
      if (changes.id && changes.id !== id) return { ok: false, status: 422, errors: [{ field: 'id', error: 'ID cannot change' }] };
      const next = { ...cur, ...changes, prereq: changes.prereq ? { ...cur.prereq, ...changes.prereq } : cur.prereq };
      const errors = validateCourse(next);
      if (errors.length) return { ok: false, status: 422, errors };
      const placement = apply(next); persist(next);
      return { ok: true, status: 200, course: next, placement };
    },
  };
}

module.exports = { validateCourse, makeCatalogue };
