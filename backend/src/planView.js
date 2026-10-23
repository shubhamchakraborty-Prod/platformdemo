'use strict';
/* Engine result -> API plan (spec A5 card fields, B7 slots, B10 response) and staff trace.
   Learners never receive scores, weights or skill codes (A7 rule 4); the trace is staff only. */
const { GOALS, CATEGORY, LIVE_COURSE } = require('./data');
const { Q_BY_ID } = require('./questions');
const { makeLocale } = require('./locale');

function laterNames(rec, result, engine, loc) {
  const miss = rec.e.blocks
    .flatMap(b => (b.type === 'skill' ? b.skills : b.type === 'skillAny' ? [b.skills.find(s => engine.graph.teachersOf[s])] : []))
    .filter(s => s && !result.profile.skills.has(s));
  const inPlan = result.recs.filter(r => r.slot !== 'also').map(r => r.c);
  const names = [...new Set(miss.map(s => {
    const c = inPlan.find(x => x.teaches.includes(s)) || engine.courses.find(x => x.teaches.includes(s));
    return c ? c.name : '';
  }))].filter(Boolean);
  return loc.listJoin(names);
}

function card(rec, result, engine, loc) {
  const c = rec.c, p = result.profile, cat = CATEGORY[c.category];
  const later = rec.e.status === 'later';
  const weeks = loc.weeks(c, p);
  const langOk = c.langs.some(l => p.prefLangs.includes(l) || p.readLangs.includes(l));
  return {
    id: c.id,
    slot: rec.slot,
    kind: rec.kind || null, // follow | parallel for Next
    status: later ? 'later' : 'eligible',
    name: c.name, // official name, always English (A6)
    category: { id: c.category, label: loc.catName(c), color: cat.color, tint: cat.tint },
    after: later ? loc.t('after', { x: laterNames(rec, result, engine, loc) }) : null,
    oneLiner: loc.oneLiner(c),
    level: loc.levelText(c),
    difficulty: c.difficulty,
    time: { hours: c.hours, weeks, text: loc.t('hoursWeeks', { h: c.hours, w: weeks, s: weeks > 1 ? 's' : '' }) },
    languages: { list: c.langs, text: loc.listJoin(c.langs.map(loc.langName)), note: langOk ? null : loc.t('langNote') },
    youWillLearn: c.teaches.filter(s => !p.skills.has(s)).slice(0, 4).map(loc.skillName),
    why: rec.why,
    modules: c.modules.map(m => (typeof m === 'string' ? { name: m, hours: null } : { name: m.n, hours: m.h })),
    stage: c.stage,
    action: later
      ? { type: 'save', label: loc.t('saveLater'), previewUrl: c.url || null }
      : { type: 'start', label: loc.t('startCourse'), url: c.url || null, external: !!c.url },
  };
}

function summary(p, loc) {
  const a = p.a, t = loc.t;
  const opt = (id, v) => { const q = Q_BY_ID[id]; const o = (q.optionsFn ? q.optionsFn(a) : q.options || []).find(x => x[0] === v); return o ? loc.optText(q, v, o[1]) : ''; };
  const goals = p.goalList.filter(g => !GOALS[g.id].implicit).map(g => loc.goalLabel(g.id)).join('; ');
  const status = (t('status') || {})[a.itiStatus] || '';
  const streamTxt = a.stream === 'none12' ? t('none12') : a.stream ? ', ' + opt('stream', a.stream) : '';
  const learn = a.learnLang === 'Regional' ? t('ownLang') : (t('learn') || {})[a.learnLang] || a.learnLang;
  const trade = a.trade === 'other' ? a.tradeOther || '' : loc.optText(Q_BY_ID.trade, a.trade, p.tradeLabel);
  return [
    { key: 'trade', label: t('sTrade'), value: `${trade}${status ? ', ' + status : ''}` },
    { key: 'studies', label: t('sStudied'), value: ((t('edu') || {})[a.education] || '') + streamTxt },
    { key: 'goals', label: t('sGoals'), value: goals },
    { key: 'languages', label: t('sLangs'), value: t('speaks', { a: loc.listJoin((a.speak || []).map(loc.langName)), b: learn }) },
    { key: 'phone', label: t('sPhone'), value: t(p.labels.phone) },
    { key: 'computer', label: t('sComp'), value: t(p.labels.comp) },
    { key: 'ai', label: t('sAI'), value: t(p.labels.ai) },
    { key: 'english', label: t('sEng'), value: t(p.labels.eng) },
  ];
}

function path(result, loc) {
  const order = { foundation: 0, skill: 1, applied: 2 };
  return result.recs.filter(r => r.slot !== 'also')
    .slice().sort((x, y) => (x.slot === 'start' ? -1 : 0) - (y.slot === 'start' ? -1 : 0) || order[x.c.stage] - order[y.c.stage])
    .map((r, i) => ({ step: i + 1, stage: r.c.stage, stageLabel: loc.t('stage_' + r.c.stage), courseId: r.c.id, name: r.c.name }));
}

function toPlan(result, engine, lang, versions) {
  const loc = makeLocale(lang);
  const cards = result.recs.map(r => card(r, result, engine, loc));
  const name = (result.profile.a.name || '').trim();
  return {
    lang: loc.lang,
    header: { eyebrow: loc.t('recEyebrow'), title: name ? loc.t('recH1Name', { name }) : loc.t('recH1'), lead: loc.t('recLead') },
    live: { ...LIVE_COURSE, tag: loc.t('liveTag'), title: loc.t('liveH'), text: loc.t('liveP', { c: LIVE_COURSE.label }), openLabel: loc.t('openLive'), copyLabel: loc.t('copyLink') },
    sections: { start: loc.t('startHere'), next: loc.t('next'), also: loc.t('alsoLike'), alsoHint: loc.t('alsoHint') },
    start: cards.find(c => c.slot === 'start') || null,
    next: cards.filter(c => c.slot === 'next'),
    also: cards.filter(c => c.slot === 'also'),
    path: path(result, loc),
    profile: { labels: result.profile.labels, levels: result.profile.levels, summary: summary(result.profile, loc) },
    ...versions,
  };
}

/* Staff view (B10 /trace): per-course eligibility, blocks, feature scores, bonuses, unserved needs. English only (B11). */
function toTrace(result, engine, versions) {
  const p = result.profile;
  const chosen = Object.fromEntries(result.recs.map(r => [r.c.id, r.slot]));
  return {
    profile: {
      skills: [...p.skills].sort(), levels: p.levels, labels: p.labels, trade: p.trade, tradeGroup: p.tradeGroup,
      goals: p.goalList, interests: [...p.interests], readLangs: p.readLangs, prefLangs: p.prefLangs, weekly: p.weekly, commNeeds: p.commNeeds,
    },
    courses: result.rows.map(x => ({
      id: x.c.id, name: x.c.name, slot: chosen[x.c.id] || null, status: x.e.status, blocks: x.e.blocks,
      gap: x.e.gap, score: x.r.score, features: x.r.f, purpose: x.r.purpose,
      bonuses: { risk: x.r.riskHits.length > 0, access: !!x.r.access, gateway: !!x.r.gateway },
      riskHits: x.r.riskHits, interestHits: x.r.interestHits, opens: x.r.opens, goalHits: x.r.goalHits, weeks: x.r.weeks,
    })).sort((a, b) => b.score - a.score),
    unserved: result.unserved,
    weights: engine.WEIGHTS,
    ...versions,
  };
}

module.exports = { toPlan, toTrace };
