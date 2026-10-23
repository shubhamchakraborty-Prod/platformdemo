'use strict';
/* GET /v1/config: screens, questions and translations for one population and language (B10).
   Functions in the questionnaire are sent in their declarative form (questions.SHOW_IF). */
const { SCREENS, SECTIONS } = require('./questionnaire');
const { UI } = require('./i18n');
const { SHOW_IF, OPTION_SHOW_IF } = require('./questions');
const { makeLocale } = require('./locale');

function question(q, loc) {
  // optionsFn: send the widest option set, each conditional option tagged with its rule
  const opts = q.optionsFn ? q.optionsFn({ education: 'graduate' }) : q.options || [];
  const optRules = OPTION_SHOW_IF[q.id] || {};
  return {
    id: q.id,
    type: q.type,
    text: loc.qText(q),
    hint: q.hint ? loc.qHint(q) : null,
    placeholder: q.placeholder ? loc.qPh(q) : null,
    required: !!q.required,
    max: q.max || null,
    exclusive: q.exclusive || null,
    examples: q.examples || null,
    scene: q.scene ? { who: loc.sceneWho(q), text: loc.sceneText(q), notice: !!q.scene.notice, keepEnglish: loc.hi && loc.sceneText(q) === q.scene.text } : null,
    showIf: SHOW_IF[q.id] || null,
    options: opts.map(([value, label]) => ({ value, label: loc.optText(q, value, label), ...(optRules[value] ? { showIf: optRules[value] } : {}) })),
  };
}

function buildConfig({ lang, population, versions }) {
  const loc = makeLocale(lang);
  return {
    population,
    lang: loc.lang,
    languages: [{ code: 'en', label: 'English' }, { code: 'hi', label: 'हिंदी (Hindi)' }],
    sections: SECTIONS.map((s, i) => ({ index: i, name: loc.secName(i), intro: loc.secIntro(i) || null })),
    screens: SCREENS.map(sc => ({ key: sc.key, section: sc.section, title: loc.screenTitle(sc), questions: sc.qs.map(q => question(q, loc)) })),
    ui: UI[loc.lang],
    ...versions,
  };
}

module.exports = { buildConfig };
