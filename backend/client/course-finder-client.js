/* Course Finder API client for the career counsellor bot and any web front end.
   Works in browsers and Node 18+ (uses fetch). No dependencies.
   Usage: const cf = CourseFinder.createClient('https://api.example.org');
          const { session_id } = await cf.createSession('hi');
          await cf.saveAnswers(session_id, { trade: 'fitter', itiStatus: 'y1' }, 'iti');
          const plan = await cf.plan(session_id); */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CourseFinder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class ApiError extends Error {
    constructor(status, body) {
      super((body && body.message) || `Request failed with status ${status}`);
      this.status = status;
      this.body = body;
      this.errors = body && body.errors;   // validation: { questionId: { code, message } }
      this.missing = body && body.missing; // incomplete: [questionId]
    }
  }

  function createClient(baseUrl, { staffToken, fetchImpl } = {}) {
    const f = fetchImpl || fetch;
    const base = String(baseUrl).replace(/\/+$/, '');
    async function call(method, path, body, staff) {
      const headers = { 'Content-Type': 'application/json' };
      if (staff && staffToken) headers.Authorization = 'Bearer ' + staffToken;
      const res = await f(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new ApiError(res.status, data);
      return data;
    }
    return {
      health: () => call('GET', '/v1/health'),
      config: (lang = 'en', population = 'iti') => call('GET', `/v1/config?population=${encodeURIComponent(population)}&lang=${encodeURIComponent(lang)}`),
      createSession: (lang = 'en', population = 'iti') => call('POST', '/v1/sessions', { lang, population }),
      getSession: id => call('GET', `/v1/sessions/${id}`),
      /* screen: pass the screen key when the learner taps Continue, to get required-question errors */
      saveAnswers: (id, answers, screen, lang) => call('PATCH', `/v1/sessions/${id}/answers`, { answers, screen, lang }),
      plan: (id, lang) => call('POST', `/v1/sessions/${id}/plan`, lang ? { lang } : {}),
      planFromAnswers: (answers, lang = 'en') => call('POST', '/v1/plan', { answers, lang }),
      deleteSession: id => call('DELETE', `/v1/sessions/${id}`),
      event: (name, props, sessionId) => call('POST', '/v1/events', { name, props, session_id: sessionId }),
      courses: () => call('GET', '/v1/courses'),
      /* staff only */
      trace: id => call('GET', `/v1/staff/sessions/${id}/trace`, undefined, true),
      addCourse: course => call('POST', '/v1/courses', course, true),
      updateCourse: (id, changes) => call('PATCH', `/v1/courses/${id}`, changes, true),
    };
  }

  return { createClient, ApiError };
});
