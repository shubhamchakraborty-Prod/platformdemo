'use strict';
/* Spec B12 translation coverage: 0 missing Hindi strings across learner-visible IDs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/data');
const { HI, UI, SECTION_INTRO } = require('../src/i18n');
const { SCREENS, SECTIONS } = require('../src/questionnaire');
const { makeEngine } = require('../src/engine');
const { cleanAnswers } = require('../src/questions');
const { rng, randomAnswers } = require('./helpers');

/* kept in English on purpose (A6): product names, and the two items that measure English */
const KEEP_ENGLISH = new Set(['opt aiTools.ChatGPT', 'opt aiTools.Gemini', 'opt aiTools.SwiftChat', 'opt aiTools.Copilot', 'opt aiTools.Meta AI', 'sceneText scenarioInstr', 'sceneText readNotice']);

test('every learner-visible ID has Hindi text', () => {
  const miss = [];
  const need = (ok, id) => { if (!ok && !KEEP_ENGLISH.has(id)) miss.push(id); };
  Object.keys(UI.en).forEach(k => need(UI.hi[k] !== undefined, 'ui ' + k));
  SECTIONS.forEach((s, i) => { need(HI.sections[i], 'section ' + i); need(SECTION_INTRO.hi[i], 'intro ' + i); });
  SCREENS.forEach(sc => {
    need(HI.screens[sc.key], 'screen ' + sc.key);
    sc.qs.forEach(q => {
      const h = HI.q[q.id] || {};
      need(h.q, 'q ' + q.id);
      if (q.hint) need(h.hint, 'hint ' + q.id);
      if (q.placeholder) need(h.ph, 'ph ' + q.id);
      if (q.scene) { need(h.who, 'who ' + q.id); need(h.text, 'sceneText ' + q.id); }
      const opts = q.optionsFn ? q.optionsFn({ education: 'graduate' }) : q.options || [];
      opts.forEach(([v]) => need(q.id === 'trade' ? HI.trades[v] : ['speak', 'read'].includes(q.id) ? HI.langs[v] : (h.o || {})[v], `opt ${q.id}.${v}`));
    });
  });
  Object.keys(D.CATEGORY).forEach(c => need(HI.cat[c], 'cat ' + c));
  Object.keys(D.GOALS).forEach(g => need(HI.goal[g], 'goal ' + g));
  Object.keys(D.INTERESTS).forEach(i => need(HI.interest[i], 'interest ' + i));

  // courses, skill tags and gap clauses that can actually reach a learner
  const engine = makeEngine(D); const rand = rng(5);
  const shown = new Set(), tags = new Set(), gaps = new Set();
  for (let i = 0; i < 10000; i++) {
    const r = engine.recommend(cleanAnswers(randomAnswers(rand)));
    r.recs.forEach(x => { shown.add(x.c.id); x.c.teaches.filter(s => !r.profile.skills.has(s)).slice(0, 4).forEach(s => tags.add(s)); x.r.gap.forEach(s => gaps.add(s)); });
  }
  assert.equal(shown.size, 15, 'A8: 15 of the 19 courses can reach ITI learners');
  shown.forEach(id => { need((HI.course[id] || {}).one, 'course.one ' + id); need((HI.course[id] || {}).promise, 'course.promise ' + id); });
  tags.forEach(s => need(HI.skill[s], 'skill ' + s));
  gaps.forEach(s => need(HI.gap[s], 'gap ' + s));
  assert.deepEqual(miss, [], 'missing Hindi strings');
});

test('manager-level communication courses never reach ITI learners (A8)', () => {
  const engine = makeEngine(D); const rand = rng(11);
  const seen = new Set();
  for (let i = 0; i < 5000; i++) engine.recommend(cleanAnswers(randomAnswers(rand))).recs.forEach(x => seen.add(x.c.id));
  ['COM-L6', 'COM-L65', 'COM-L7', 'COM-L8'].forEach(id => assert.ok(!seen.has(id), id));
});
