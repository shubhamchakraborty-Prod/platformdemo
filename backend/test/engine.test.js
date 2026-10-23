'use strict';
/* Spec B12: persona regression, randomised profiles, prerequisite guarantee, no blanks, performance. */
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/data');
const { makeEngine } = require('../src/engine');
const { makeTextPack } = require('../src/i18n');
const { PERSONAS } = require('../src/personas');
const { toPlan } = require('../src/planView');
const { cleanAnswers } = require('../src/questions');
const { rng, randomAnswers } = require('./helpers');

const engine = makeEngine(D);
const name = id => D.COURSES.find(c => c.id === id).name;
const versions = { engine_version: 'test', catalogue_version: 'test' };

/* A2 table: each persona must keep producing this plan unless a rule change is approved */
const EXPECTED = {
  ramesh: { start: 'AI First Steps on Your Phone', next: ['Everyday AI Basics', 'Basic and Foundational Workplace Communication'] },
  priya: { start: 'Python for Data Work', next: ['Trade and Team Communication', 'SwiftChat Bot Builder'] },
  arjun: { start: 'Everyday AI Basics', next: ['Written Workplace English', 'Trade and Team Communication'] },
  salim: { start: 'Everyday AI Basics', next: ['Applied AI 1: Use It, and Check It'], laterOption: 'Applied AI 3: Trust, Safety and Harm' },
  kavya: { start: 'Applied AI 3: Trust, Safety and Harm', next: ['Applied AI 4: Make It Stick', 'SwiftChat Bot Builder'] },
  meena: { start: 'AI First Steps on Your Phone', next: ['Everyday AI Basics'], noEnglishInNext: true },
};

for (const lang of ['en', 'hi']) {
  test(`persona regression (${lang})`, () => {
    for (const p of PERSONAS) {
      const r = engine.recommend(p.answers, makeTextPack(lang, D));
      const slot = s => r.recs.filter(x => x.slot === s);
      const want = EXPECTED[p.key];
      assert.equal(slot('start')[0].c.name, want.start, `${p.name} start`);
      assert.deepEqual(slot('next').map(x => x.c.name), want.next, `${p.name} next`);
      if (want.laterOption) {
        const later = slot('also').find(x => x.c.name === want.laterOption);
        assert.ok(later && later.e.status === 'later', `${p.name}: ${want.laterOption} shown as a later option`);
      }
      if (want.noEnglishInNext) assert.ok(slot('next').every(x => x.c.domain !== 'communication'), `${p.name}: no English course pushed`);
    }
  });
}

test('worked example in B7 (Ramesh scores)', () => {
  const r = engine.recommend(PERSONAS.find(p => p.key === 'ramesh').answers);
  const score = id => r.rows.find(x => x.c.id === id).r.score;
  assert.equal(score('AIF-1'), 0.74);
  assert.equal(score('COM-L12'), 0.69);
});

test('randomised profiles: 20,000 answer sets hold every product rule (A7, B12)', () => {
  const rand = rng(20261007);
  const START_LIMIT = 1, NEXT_LIMIT = 2, ALSO_LIMIT = 3;
  for (let i = 0; i < 20000; i++) {
    const a = cleanAnswers(randomAnswers(rand));
    let r;
    assert.doesNotThrow(() => { r = engine.recommend(a); }, `run ${i}`);
    const start = r.recs.filter(x => x.slot === 'start');
    const next = r.recs.filter(x => x.slot === 'next');
    const also = r.recs.filter(x => x.slot === 'also');
    const ctx = () => `run ${i}: ${JSON.stringify(a)}`;
    assert.equal(start.length, START_LIMIT, 'every plan has a Start course ' + ctx());
    assert.equal(start[0].c.domain, 'ai', 'Start is always an AI course ' + ctx());
    assert.equal(start[0].e.status, 'eligible', 'Start is eligible now ' + ctx());
    assert.ok(next.length <= NEXT_LIMIT && also.length <= ALSO_LIMIT, 'short plans ' + ctx());
    assert.ok(also.length >= 1, 'You may also like is never empty ' + ctx());
    assert.ok(r.recs.every(x => x.e.status !== 'excluded'), 'no excluded course anywhere ' + ctx());
    // Next: eligible now, or eligible right after Start
    const afterStart = new Set([...r.profile.skills, ...start[0].c.teaches]);
    next.forEach(n => assert.ok(n.e.status === 'eligible' || engine.eligibility(n.c, afterStart, r.profile).status === 'eligible', 'Next is reachable ' + ctx()));
    assert.equal(new Set(r.recs.map(x => x.c.id)).size, r.recs.length, 'no course twice ' + ctx());
  }
});

test('no blanks: every card field filled in both languages (A7 rule 5)', () => {
  const rand = rng(7);
  const BAD = /coming soon|to be confirmed|तय होना बाकी|\bundefined\b|\bnull\b|\bNaN\b|\{\w+\}/;
  for (let i = 0; i < 1500; i++) {
    const a = cleanAnswers(randomAnswers(rand));
    for (const lang of ['en', 'hi']) {
      const plan = toPlan(engine.recommend(a, makeTextPack(lang, D)), engine, lang, versions);
      [plan.start, ...plan.next, ...plan.also].forEach(c => {
        const fields = { name: c.name, oneLiner: c.oneLiner, level: c.level, time: c.time.text, language: c.languages.text, why: c.why, category: c.category.label };
        Object.entries(fields).forEach(([k, v]) => {
          assert.ok(typeof v === 'string' && v.trim().length > 0, `${lang} ${c.id} ${k} is blank`);
          assert.ok(!BAD.test(v), `${lang} ${c.id} ${k} has placeholder text: "${v}"`);
        });
        assert.ok(c.modules.length > 0 && c.modules.every(m => m.name), `${lang} ${c.id} course parts`);
        if (c.status === 'later') assert.ok(c.after && engine.courses.some(x => c.after.includes(x.name)), `${lang} ${c.id} "After X" names a course: "${c.after}"`);
      });
      plan.profile.summary.forEach(row => assert.ok(row.value !== undefined && !/undefined|NaN/.test(row.value), `${lang} summary ${row.key}`));
    }
  }
});

test('learners never see scores or skill codes (A7 rule 4)', () => {
  const plan = toPlan(engine.recommend(PERSONAS[1].answers), engine, 'en', versions);
  const text = JSON.stringify([plan.start, plan.next, plan.also]);
  assert.ok(!/"score"|"features"|"weights"/.test(text));
  Object.keys(D.SKILLS).forEach(s => assert.ok(![plan.start, ...plan.next, ...plan.also].some(c => c.why.includes(s)), `skill code ${s} in a reason`));
});

test('performance: plan in under 300 ms (B12)', () => {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 100; i++) engine.recommend(PERSONAS[i % PERSONAS.length].answers);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 100;
  assert.ok(ms < 300, `average ${ms.toFixed(2)} ms`);
});
