'use strict';
/* Questionnaire rules on the server: which questions are visible, which answers are valid,
   and what is still missing before a plan can be built (spec A3, A4, B2 Question, B11 Validation). */
const { SCREENS } = require('./questionnaire');

const ALL_QS = SCREENS.flatMap(sc => sc.qs.map(q => ({ ...q, screen: sc.key, section: sc.section })));
const Q_BY_ID = Object.fromEntries(ALL_QS.map(q => [q.id, q]));
const SCREEN_BY_KEY = Object.fromEntries(SCREENS.map(sc => [sc.key, sc]));
const FREE_FIELDS = ['name']; // optional first name, not a question (B13)

/* Declarative copy of every showIf / optionsFn, for clients that cannot run our functions.
   test/questions.test.js proves these match the functions for random answer sets. */
const SHOW_IF = {
  tradeOther: { q: 'trade', in: ['other'] },
  stream: { q: 'education', in: ['class12', 'graduate', 'diploma'] },
  phoneDone: { q: 'phone', notIn: ['none'] },
  computerDone: { q: 'computerUse', notIn: ['never'] },
  aiTools: { q: 'aiUsed', in: ['yes'] },
  aiFreq: { q: 'aiUsed', in: ['yes'] },
  aiPurpose: { q: 'aiUsed', in: ['yes'] },
};
const OPTION_SHOW_IF = { stream: { none12: { q: 'education', in: ['diploma', 'graduate'] } } };

const isVisible = (q, a) => !q.showIf || !!q.showIf(a);
const optionsOf = (q, a) => (q.optionsFn ? q.optionsFn(a) : q.options || []);

function answered(v) {
  return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '';
}

/* Hidden questions are stripped before rules run, so a stale answer can never create a skill (B3). */
function cleanAnswers(a) {
  const out = {};
  if (typeof a.name === 'string' && a.name.trim()) out.name = a.name.trim().slice(0, 40);
  ALL_QS.forEach(q => {
    if (!isVisible(q, a) || a[q.id] === undefined) return;
    if (q.optionsFn && !optionsOf(q, a).some(o => o[0] === a[q.id])) return;
    out[q.id] = a[q.id];
  });
  return out;
}

/* Checks one answer's shape against its question. Returns an error code or null. */
function checkValue(q, v, a) {
  const vals = optionsOf(q, a).map(o => o[0]);
  switch (q.type) {
    case 'text':
      if (typeof v !== 'string') return 'type';
      if (v.length > 80) return 'tooLong';
      return null;
    case 'select':
    case 'single':
      if (typeof v !== 'string') return 'type';
      return vals.includes(v) ? null : 'option';
    case 'multi':
    case 'chips': {
      if (!Array.isArray(v) || v.some(x => typeof x !== 'string')) return 'type';
      if (new Set(v).size !== v.length) return 'duplicate';
      if (v.some(x => !vals.includes(x))) return 'option';
      if (q.max && v.length > q.max) return 'max';
      if (q.exclusive && v.includes(q.exclusive) && v.length > 1) return 'exclusive';
      return null;
    }
    default:
      return 'type';
  }
}

/* Partial update (PATCH): only the keys sent are checked; unknown keys are rejected. */
function validatePartial(patch, merged) {
  const errors = {};
  Object.entries(patch).forEach(([id, v]) => {
    if (FREE_FIELDS.includes(id)) {
      if (v !== null && (typeof v !== 'string' || v.length > 40)) errors[id] = 'type';
      return;
    }
    const q = Q_BY_ID[id];
    if (!q) { errors[id] = 'unknown'; return; }
    if (v === null) return; // null clears an answer
    const e = checkValue(q, v, merged);
    if (e) errors[id] = e;
  });
  return errors;
}

/* Continue on a screen: every visible required question must be answered and valid (B11). */
function validateScreen(key, a) {
  const sc = SCREEN_BY_KEY[key];
  if (!sc) return { unknownScreen: true, errors: {} };
  const errors = {};
  sc.qs.filter(q => isVisible(q, a)).forEach(q => {
    const v = a[q.id];
    if (!answered(v)) { if (q.required) errors[q.id] = 'required'; return; }
    const e = checkValue(q, v, a);
    if (e) errors[q.id] = e;
  });
  return { errors, firstError: Object.keys(errors)[0] || null };
}

/* Everything a plan needs: visible required questions across all 15 screens. */
function missingForPlan(a) {
  return ALL_QS.filter(q => q.required && isVisible(q, a) && !answered(a[q.id])).map(q => q.id);
}

module.exports = { ALL_QS, Q_BY_ID, SCREEN_BY_KEY, SHOW_IF, OPTION_SHOW_IF, isVisible, optionsOf, answered, cleanAnswers, checkValue, validatePartial, validateScreen, missingForPlan };
