'use strict';
/* Spec B9.2 and B12 ingestion: a course added by metadata alone is placed and recommended;
   invalid records are rejected with reasons. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const D = require('../src/data');
const { makeEngine } = require('../src/engine');
const { makeStore } = require('../src/store');
const { makeCatalogue, validateCourse } = require('../src/catalogue');
const { PERSONAS } = require('../src/personas');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cf-cat-'));
const env = { QUIET: '1' };
const CV = { ...D.NEW_COURSE_DEMO, i18n: { hi: { one: 'एक पेज का CV बनाइए और बिना गलती ऑनलाइन नौकरी के लिए आवेदन कीजिए।', promise: 'यह छोटा कोर्स आपको एक पेज का CV बनाना और सुरक्षित तरीके से ऑनलाइन आवेदन करना सिखाता है।' } } };

test('every catalogue course passes ingestion validation, except known gaps', () => {
  // the 4 manager-level communication courses (never shown to ITI learners) lack Hindi copy and 3 lack a promise
  const known = ['COM-L6', 'COM-L65', 'COM-L7', 'COM-L8'];
  D.COURSES.filter(c => !known.includes(c.id)).forEach(c => assert.deepEqual(validateCourse(c), [], c.id));
});

test('adding "CV and Job Application Basics" by metadata places it and changes plans (B9.2 proof)', () => {
  const engine = makeEngine(D);
  const cat = makeCatalogue(engine, makeStore({ dataDir: tmp(), env }));
  const before = cat.version;
  const r = cat.add(CV);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.notEqual(cat.version, before, 'catalogue version changes');
  ['AIF-1', 'AIF-2', 'COM-L12'].forEach(id => assert.ok(r.placement.precededBy.includes(id), 'preceded by ' + id));
  assert.ok(r.placement.leadsTo.includes('BOT-1'), 'linked to SwiftChat Bot Builder');
  assert.equal(r.placement.goals.length, 5, 'serves 5 goals');
  const plan = key => engine.recommend(PERSONAS.find(p => p.key === key).answers).recs;
  assert.ok(plan('arjun').some(x => x.slot === 'next' && x.c.id === 'CR-CV1'), "moves into Arjun's Next");
  ['ramesh', 'priya', 'meena'].forEach(k => assert.ok(plan(k).some(x => x.slot === 'also' && x.c.id === 'CR-CV1'), `optional for ${k}`));
});

test('invalid course records are rejected with reasons', () => {
  const engine = makeEngine(D);
  const cat = makeCatalogue(engine, makeStore({ dataDir: tmp(), env }));
  const errs = rec => cat.add(rec).errors.map(e => e.field);
  assert.ok(errs({ ...CV, teaches: ['flying'] }).includes('skills'), 'unknown skill');
  assert.ok(errs({ ...CV, hours: 9 }).includes('modules'), 'module hours must sum to total');
  assert.ok(errs({ ...CV, id: 'CR-NEW9', i18n: undefined }).includes('i18n.hi.one'), 'Hindi copy required');
  assert.ok(errs({ ...CV, nsqf: 'Level 3, maybe' }).includes('nsqf'), 'NSQF text format');
  assert.ok(errs({ ...CV, url: 'http://insecure.example' }).includes('url'), 'https only');
  assert.ok(errs({ ...CV, category: 'music' }).includes('category'));
  assert.equal(cat.add({ ...D.COURSES[0] }).status, 409, 'duplicate ID');
  assert.equal(engine.courses.length, D.COURSES.length, 'nothing was added');
});

test('catalogue changes persist and replay on restart', () => {
  const dir = tmp();
  const a = makeCatalogue(makeEngine(D), makeStore({ dataDir: dir, env }));
  a.add(CV);
  a.patch('CR-CV1', { hours: 7, modules: [{ n: 'What a CV Is For', h: 1 }, { n: 'Your One-Page CV', h: 4 }, { n: 'Applying Online Safely', h: 2 }] });
  const engine2 = makeEngine(D);
  const b = makeCatalogue(engine2, makeStore({ dataDir: dir, env }));
  assert.equal(b.get('CR-CV1').hours, 7);
  assert.equal(b.version, a.version, 'same catalogue version after restart');
  assert.equal(b.patch('CR-CV1', { hours: 99 }).status, 422, 'patched record is re-validated');
});
