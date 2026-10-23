'use strict';
/* Questionnaire rules: declarative show-if matches the functions, validation codes, hidden-answer stripping. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../src/questions');
const { rng, randomAnswers } = require('./helpers');

const evalRule = (r, a) => (r.in ? r.in.includes(a[r.q]) : a[r.q] !== undefined && !r.notIn.includes(a[r.q]));

test('declarative showIf in /v1/config matches the questionnaire functions', () => {
  const withRule = Q.ALL_QS.filter(q => q.showIf);
  assert.deepEqual(withRule.map(q => q.id).sort(), Object.keys(Q.SHOW_IF).sort(), 'every showIf has a declarative copy');
  const rand = rng(99);
  for (let i = 0; i < 3000; i++) {
    const a = randomAnswers(rand);
    if (rand() < 0.2) delete a.phone;
    if (rand() < 0.2) delete a.computerUse;
    withRule.forEach(q => assert.equal(evalRule(Q.SHOW_IF[q.id], a), !!q.showIf(a), `${q.id} for ${JSON.stringify(a)}`));
    const none12 = Q.optionsOf(Q.Q_BY_ID.stream, a).some(o => o[0] === 'none12');
    assert.equal(evalRule(Q.OPTION_SHOW_IF.stream.none12, a), none12, 'stream none12 option');
  }
});

test('validation codes', () => {
  const a = { phone: 'own' };
  assert.deepEqual(Q.validatePartial({ trade: 'pilot' }, a), { trade: 'option' });
  assert.deepEqual(Q.validatePartial({ goals: ['govt_job', 'private_job', 'business', 'freelance'] }, a), { goals: 'max' });
  assert.deepEqual(Q.validatePartial({ phoneDone: ['none', 'msg'] }, a), { phoneDone: 'exclusive' });
  assert.deepEqual(Q.validatePartial({ phoneDone: 'msg' }, a), { phoneDone: 'type' });
  assert.deepEqual(Q.validatePartial({ salary: 10 }, a), { salary: 'unknown' });
  assert.deepEqual(Q.validatePartial({ phoneDone: ['msg', 'msg'] }, a), { phoneDone: 'duplicate' });
  assert.deepEqual(Q.validatePartial({ trade: 'fitter', name: 'Asha', phoneDone: null }, a), {});
});

test('Continue on a screen flags the first unanswered required question', () => {
  const v = Q.validateScreen('phone', { phone: 'own' });
  assert.deepEqual(v.errors, { phoneDone: 'required' });
  assert.equal(v.firstError, 'phoneDone');
  assert.deepEqual(Q.validateScreen('phone', { phone: 'none' }).errors, {}, 'hidden follow-up is not required');
  assert.ok(Q.validateScreen('nope', {}).unknownScreen);
});

test('hidden questions are stripped before the engine runs (B3)', () => {
  const a = { phone: 'none', phoneDone: ['msg', 'search'], aiUsed: 'no', aiFreq: 'week', education: 'class12', stream: 'none12', name: '  Ravi  ' };
  const c = Q.cleanAnswers(a);
  assert.equal(c.phoneDone, undefined);
  assert.equal(c.aiFreq, undefined);
  assert.equal(c.stream, undefined, 'none12 is only valid after Diploma or Graduate');
  assert.equal(c.name, 'Ravi');
});

test('missingForPlan lists every visible required question', () => {
  assert.ok(Q.missingForPlan({}).includes('trade'));
  assert.ok(!Q.missingForPlan({ trade: 'fitter' }).includes('tradeOther'));
  assert.ok(Q.missingForPlan({ trade: 'other' }).includes('tradeOther'));
  assert.deepEqual(Q.missingForPlan(Q.cleanAnswers(randomAnswers(rng(3)))), []);
});
