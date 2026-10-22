# Swift AI Academy MVP - Phase 1 UX and Product Quality Audit

| Item | Detail |
|---|---|
| Product audited | `mvp_prd_doc.html` (clickable MVP, 11,422 lines, 1.9 MB, single file) at commit on branch `claude/lucid-knuth-9hacku` |
| Date | 22 Oct 2026 |
| Measured against | (1) The "UI/UX and Product Quality Standards - No Vibe-Coded Design" brief, sections 1-10. (2) Swift AI Academy Brand and Design Guidelines v1.0 (2026). |
| Production Script Checklist | **Not found** in the repo or Drive. Drive holds per-asset production scripts (e.g. `AAI-E-MC1-S01-VID02_L2_Production-Script.docx`). Component requirements below are taken from the brief itself and from those scripts. Replace with the checklist once supplied. |
| Method | Headless Chromium. 29 screens measured at 1366 × 900 and 390 × 844 (computed styles of every visible element). Learner and admin journeys walked end to end by clicking real controls (78 screenshots). The 3 Critical findings were re-tested on a fresh learner account. Code read for structure. |
| Screenshots | `docs/phase1/` |

## 1. Verdict

The MVP shows the full product scope and much of the copy is good. It does **not** yet meet the brief. Three things block it:

1. **The core learning loop is not real.** One click completes a course, an empty quiz earns a certificate, and a page reload logs the learner out.
2. **It is not on brand.** None of the three brand colours and neither brand font are used anywhere in the code.
3. **It is two products stitched together.** About 30 patch layers have produced two visual generations, 59 button styles and 9 heading styles.

Fix 1 first, whatever happens to the rest. Items 2 and 3 have a common fix: one design system, then screens rebuilt on it (Phase 2 proposal, section 9).

### Scorecard against the brief

| # | Standard | Result | Main reason |
|---|---|---|---|
| 1 | Visual design and aesthetics | Fail | Off-brand palette and type, gradients and decorative illustrations, emoji as icons, two visual styles |
| 2 | Layout and screen use | Partial | Player, chat and admin fit one viewport. Explore, Opportunities, Pathway and MC4 run 2.2-2.9 screens on desktop and 4-5.5 on mobile |
| 3 | Functional components | Fail | No video controls, no Next/Previous in the player, no Check Answer, Retry or feedback in quizzes |
| 4 | Stage-wise placement | Partial | Counselling test is a good model. Course player shows one generic control set for every step type |
| 5 | Timing, nudges, learning interactions | Fail | No task timers, no time-up reattempt, no hint escalation, no practice vs assessment distinction |
| 6 | UX and accessibility | Partial | Contrast now passes (fixed earlier today). Hype copy, demo controls shown to learners, mobile tab bar covers options |
| 7 | Functional completeness | Fail | 3 Critical defects. Simulated email, PDF and video presented as real |
| 8 | Design system and reuse | Fail | 117 functions replaced or wrapped. Same components restyled up to 13 times |
| 9 | Final quality review | Not run | Due at the end of Phase 3 |
| 10 | Credible, polished product | Fail | Follows from 1, 3, 5, 7 and 8 |

## 2. Critical and High defects (fix before anything else)

| # | Severity | Where | What happens | Evidence |
|---|---|---|---|---|
| D1 | Critical | Course player `#/learn/AI01/sub0` | One "Mark as complete" on step 1 of 7 skips all lessons and the checkpoint quiz and jumps to the module quiz. Response box can be left empty | `phase1/stage07_ai01_step1.png`. Re-tested on Isha (new learner) |
| D2 | Critical | Module quiz `#/learn/AI01/quiz` | Submitting with 0 of 8 answers selected marks the course **Completed** and unlocks the certificate. No score, no feedback, no retry. Page says "answers optional in this prototype" | `phase1/stage07_after_submit.png`, `phase1/stage07_quiz_feedback.png` |
| D3 | Critical | Whole app | A browser reload logs the learner out (`App._forceLogin`). Logging back in as a demo learner resets their progress, including a counselling test in progress | Re-tested: reload on `#/home` returns `#/login` |
| D4 | High | Onboarding final step | Required consent is pre-ticked. Unticking it does not stop "Agree & finish" | `phase1/stage02_onb_step3.png` |
| D5 | High | Certificate modal | Esc does not close it. It stays open over other routes and over the login screen after logout | `phase1/stage09_cert_persists_home.png` |
| D6 | High | Career test | "Demo: answer carelessly" and "Demo: skip to results" sit inside the learner's test | `phase1/stage05_cc_test_item.png` |
| D7 | High | MC4 course page | Internal production data shown to learners: "Governing document: PC and Level Draft v2.0 … source assets marked Not started", "PC PC1.1-1.4" | `phase1/stage07_mc4_course.png` |
| D8 | High | Lessons and quizzes | Placeholder content: templated "worked example", meta-questions such as "What is the goal of the unit 'Cleaning'?" | `phase1/stage07_quiz_feedback.png` |
| D9 | Medium | Counselling | Progress disagrees: hub shows 8%, chat panel shows 4% for the same state | `phase1/stage05_cc_hub.png` |
| D10 | Medium | Mobile chat | Fixed bottom tab bar covers the second option chip | `phase1/mobile_counselling_chat.png` |

## 3. Brand and design-system drift (measured)

| Token | Brand v1.0 | Found in product | Gap |
|---|---|---|---|
| Primary | Royal Blue `#3D5AFE` | 0 uses. 11 other blues: `#386AF6`, `#2548E8`, `#3B5BFF`, `#2F6BEA`, `#3B3FD6`, `#2B44C7` and 5 darker blues added by the contrast fix earlier today (`#1F45C9`, `#2449D8`, `#1F4FC9`, `#2563EB`, `#1D4ED8`) | Replace all with one blue scale |
| Ink | Deep Navy `#0E1B5C` | 0 uses. Text ink is `#0E0E0E`, `#16183F`, `#0B1A4A`, `#191D45`, `#141413` and others (47 text colours) | One ink + one secondary |
| Accent | Gold `#FBB034`, sparing | 0 uses. Amber `#F2A900`, `#F6A623`, `#F8B200` used as a hero wash and for "Resume" CTAs | Gold for verified moments only |
| Domain accents | Plum, Teal, Pink for domains only | Purple, teal and orange used decoratively (Home hero circle, Welcome "Tomorrow changemakers.") | Remove |
| Display and body type | Cabinet Grotesk | 0 uses. Inter (1,334 text nodes), Montserrat (1,183), Fraunces serif (51) | Brand rule: no serifs |
| Label and data type | JetBrains Mono, tracked | 0 uses | Eyebrows, IDs, credit counts |
| Type sizes | 5-step scale | 26 sizes between 10 and 44px | 6-7 sizes |
| Page headings | Mono eyebrow + Cabinet 800 | 9 different H1 styles (Inter 40/800, Montserrat 36/400, Fraunces 28-30/700 and more) | 1 |
| Buttons | Fully rounded, Royal Blue primary, one primary per view | 59 distinct button styles. Radii 10px, 999px, 50%, 8px | 4 variants × 3 sizes |
| Corner radius | 16px cards, 24-32px large, 14px pills | 23 radius values | 4 |
| Shadows | Soft three-layer navy | 18 shadows | 2 |
| Gradients | Not part of the system | 45 gradient elements per full pass | Heroes only, if at all |
| Icons | One line family, 1.75px stroke, 24px grid, no emoji | Lucide-style SVGs plus about 70 emoji entities: 🔒 (unit rail), 💬 👍 (community), 🏆 🏅 📄 (achievements), ⚡ (opportunities), 📋 (onboarding), ✎ 📥 (inbox) | Replace every emoji |
| Voice | Mentor, no hype, no exclamation marks | "Welcome to the Swift AI Academy World!", "Unlock Your Career!", "Tomorrow changemakers.", "Drill into this", "Add new Set" | Rewrite |
| Logo | Hexagon node with upward chevron | Three-dot node glyph in the nav | Confirm against brand asset |

**Two visual generations.** Home, Explore, Career and Pathways use Montserrat (the "v2 layer"). Skill Passport, Community, Help, Demo, Profile, Achievement sub-pages, Admin and the course player headings use Fraunces serif with Inter. Compare `phase1/explore_full.png` with `phase1/skill_passport_serif.png`.

## 4. Layout and screen use

| Screen | Desktop height | Mobile height | Issue |
|---|---|---|---|
| Opportunities | 2,612px (2.9 screens) | 3,217px (3.8) | Six carousels, hype H1 |
| Course MC4 | 2,522px (2.8) | 3,841px (4.6) | Internal metadata, long unit list |
| Pathway page | 2,397px (2.7) | 4,623px (5.5) | Every course tagged "Start here" |
| Explore | 2,010-2,539px (2.2+) | 2,415px (2.9) | Seven carousels repeating the same cards (Python for data work appears 3+ times) |
| Achievements | 1,830px (2.0) | 3,446px (4.1) | Decorative mini-charts in stat tiles, "00" zero-padded counts, left accent bars |
| Home | 1,574px (1.7) | 2,495px (3.0) | Half the hero is a decorative chart. About 100px empty band between sections |
| Welcome | 900px | 2,495px | 68px multicolour hype hero, decorative timeline and ticker |
| Counselling hub | 900px | 1,276px | Hero fills a third, rest is empty |
| Course player, chat, admin learners, inbox | 900px (1.0) | 844-915px | Good: fixed nav, one viewport |

Navigation is sticky on all screens. The admin bar differs from the learner bar (gold "Admin" badge, different items).

## 5. Stage-wise component map (brief section 4)

For each stage: what the learner must do, what must be visible, which controls it needs, timing, nudges, outcomes and the progress gate. "Today" is what the MVP shows now.

| Stage | User task | Must be visible | Controls needed | Timing | Nudges | Outcomes to handle | Gate to next stage | Today |
|---|---|---|---|---|---|---|---|---|
| 1 Login | Sign in | Email, password, error | Log in, Show password, Forgot password, Contact support | None | Error text under the field | Wrong password, unknown email, not yet activated | Valid credentials | Good. Add loading state. Mobile form starts below the fold |
| 2 Onboarding | Confirm prefilled details, consent | Step rail, locked fields with source, what's left | Back, Continue, Edit field, Agree & finish (disabled until consent) | "About 2 minutes" | Inline: missing required field | Incomplete, consent refused, interrupted (resume at step) | All required fields + explicit consent | D4 consent pre-ticked. 📋 emoji. Serif H1 |
| 3 Welcome + tour | Learn the layout | Step n of 5, highlighted area | Next, Previous, Skip, Finish | "1 minute" | None | Skipped (re-open from Help) | Finish or Skip | No Previous. Hype hero, decorative timeline |
| 4 Home | Resume learning | Current course, next step, its expected time | One primary Continue | Next step duration | Streak or deadline reminder, only when real | No course yet (empty state), all done | Continue | Good single CTA. Decorative hero chart, filler "Did you know?" |
| 5a Counselling intro | Start or resume | What happens, total time, progress if resumed | Start / Continue | "About 20 minutes" total | None | Previous attempt failed (retake) | Start | Good copy. Oversized hero. 8% vs 4% |
| 5b Language + profile check | Pick language, confirm details | Question, options | Option chips, Back to Career Counselling | None | None | Wrong details (edit) | Answer | Language step added today. Mobile chip hidden by tab bar |
| 5c Career test | Rate statements | Statement n of 18, scale ends labelled | Listen (word-level audio), scale, Back, Save and pause | Expected remaining time (not a countdown: this is a profile, not a test) | "Take your time" after long idle. Consistency warning on careless patterns | Careless pattern (retake), interrupted (resume) | All answered | Best stage in the product. Remove demo buttons from learner UI. Add remaining time |
| 5d Report | Read, choose pathway | Top pathways, why, fit | View courses, Download PDF (label as simulated until built), previous reports | None | None | No report yet (empty state exists) | Choose pathway | Good |
| 6 Explore / pathway | Choose what to learn | Recommended first, filters, course facts | Search, filters, Save, Start pathway | Weeks and hours per week | None | No results (empty state) | Start | Too long, repeated cards, "Start here" on every course |
| 7a Course page | Start or resume a course | Units, status, duration, credit (if confirmed) | Start / Continue, Back to pathway | Course duration, per-unit time | None | Locked units explain why | Start | Video trailer placeholder. Hide unconfirmed credit/NSQF or label "pending" |
| 7b Lesson: video | Watch | Video, title, step n of N | Play, Pause, Replay, Seek, Subtitles, Speed, Next (enabled at end or after 90%), Previous | Video length at top (production scripts give 0.25 h per video) | None during video | Interrupted (resume position), video fails to load (retry) | Watched | Placeholder only. No Next/Previous |
| 7c Lesson: reading + worked example | Read | Text, example | Next, Previous, Listen (word-level only where reading is assessed) | Reading time | None | None | Scrolled to end | Template filler content |
| 7d Lesson: response task | Write or record a response | Prompt, success criteria | Textarea or Record / Stop / Playback / Record again, Submit | Task-level limit if specified | Hint 1 after first failed or empty attempt, hint 2 after second, model answer only after submit | Empty (block with message), too short, interrupted (draft saved) | Valid submission | Empty response accepted. D1 |
| 7e Checkpoint quiz (practice) | Answer | "Practice - does not count" label, question n of N | Select, Check answer, Next, Retry | None or generous | Explanation after each check | Wrong (explain, allow retry) | Attempted all | No Check answer, no feedback |
| 7f Module quiz (assessment) | Answer for credit | "Assessed" label, pass mark, attempts left, time limit | Select, Previous, Next, Submit (confirm), Retry after fail | Task-level time limit shown at top. On time-up: submit what's answered and offer reattempt, no lockout | None during attempt. Feedback by topic after | Fail (show score, weak topics, retry), time-up, interrupted (resume attempt) | Score ≥ pass mark | D2: empty submit passes |
| 7g MC4 labs and demonstration | Build and record a method | Brief, checklist, evidence required | Form fields, Record / Stop / Playback / Record again for the spoken demonstration, Save, Submit | Task-level time | Escalating hints | Incomplete evidence, resubmit after review | Reviewer approval | D7 internal metadata. No recording |
| 8 Project + review | Submit project, get review | Brief, rubric, status | Upload, Submit, View feedback, Resubmit | Due date | Reminder near due date | Returned for changes, approved | Approved | Not reachable from the UI |
| 9 Certificate and passport | View, share, verify | Credential, ID, verify link | Download (label as simulated), Copy link, Share, Verify page, Close (Esc) | None | None | Not yet earned (locked state with what's left) | None | D5 modal. Serif certificate, ConveGenius branding on Swift credential |
| 10 Opportunities | Find and apply | Official portals first, eligibility | Filter, Save, Apply on official site, Track | Deadlines | Deadline reminder | Closed opportunity | None | Too long, hype H1, ⚡ |
| 11 Community, inbox, profile, notifications | Communicate, edit details | Posts, messages, fields | Post, Like, Comment, Report, Save/Cancel, Mark read | None | None | Empty states, errors | None | Emoji icons. Inbox mock mail client with disabled Compose |
| 12 Admin | Add, invite, track learners | Funnel, who needs a nudge | Add learners, Invite, Resend, Filters | None | "Needs a nudge" list | New institution (proper first-run empty state), send failure | None | Good structure. Weak empty state for a new institution ("Everyone invited is moving. Nice."). Simulated email worded as sent |

### Components missing from the product today

| Group | Missing |
|---|---|
| Navigation | Next / Previous in the course player. Previous in the tour. Exit-and-resume rules for quizzes |
| Timing | Task-level timers for assessed quizzes and labs. Time-up reattempt flow. Remaining time in the career test. Video length on lesson steps |
| Nudges | Any hint escalation. Idle nudges. Retry guidance after a failed attempt |
| Audio | Record, Stop, Playback, Record again, Submit (needed for spoken tasks and the MC4 demonstration). Listen exists only in the career test |
| Video | Every control: the player is a placeholder |
| Assessment | Check answer, per-question feedback, score, pass mark, attempts, Retry, practice vs assessed labels |
| System states | Loading and processing states on Log in, Submit and Send. Error states for failed saves. Interrupted-session resume beyond the career test |

## 6. Simulated features shown as real (brief section 7)

| Feature | Shown as | Should show |
|---|---|---|
| Password reset email | "We've sent the link" | "Demo: no email is sent" |
| Support message | "Message sent. Support will reply by email." | Same demo label |
| Admin invites | "2 invites sent… will receive their invites by email" | Demo label |
| Report and certificate PDF | Toast only | Label the button "Download (demo)" or build it |
| Video | Placeholder with a play button that toasts | Real player with a sample clip, or a clearly labelled "Video coming" state without a fake play button |
| QR on certificate | Loaded from a CDN. Blank where the CDN is blocked | Inline generator |
| Credits and NSQF level | "To be confirmed", "indicative" | Keep labelled. Hide on learner cards |

## 7. Code structure

| Measure | Value | Why it matters |
|---|---|---|
| Patch layers | About 30 (versions v41-v71, Batch 1-12) | Each layer re-styles or re-wraps earlier ones |
| Functions replaced or wrapped | 117 | Behaviour depends on load order. D1-D3 come from this |
| Times the main Career screen is redefined | 13 (`renderCareer`). Home 12, Login 9, Explore 9, the page renderer 13 | Same screen designed many times |
| Route overrides | 25 `ROUTES.unshift` calls | Several routes silently redirect (`#/admin/institutions` lands on the dashboard) |
| `!important` | 235 | Cascade fights. Caused today's hover bug |
| Inline `style=""` in templates | 952 | No reuse, no tokens |
| Career Counsellor | A second full app (212 KB) inside an iframe, with its own tokens, fonts and indigo accent `#3D3A9E` | A third visual style |

## 8. What is good and should be kept

| Area | Keep |
|---|---|
| Career test | Statement n of 18, progress, Listen, labelled scale, Back, Save and pause, careless-pattern detection and retake. The model for every other activity |
| Content and data model | Pathways, courses, units, roles, salaries with "indicative" labels, institution-prefilled profile with locked fields |
| Admin | Invite funnel, "Needs a nudge" list, learner status table |
| Copy | Most learner-facing copy is plain and specific ("Takes about 2 minutes. Most details are already filled in by your institution.") |
| Accessibility | Text contrast now meets WCAG AA (see `docs/contrast-audit-report.md`) |

## 9. Phase 2 proposal: one design system

### Recommendation

Rebuild the front end on a clean component system and port the existing data and copy into it. **Do not keep patching the current file.** With 117 wrapped functions, every in-place fix risks breaking another layer, which is how D1-D3 arose.

| Option | Effort | Risk | Result |
|---|---|---|---|
| A. Keep patching the current file | Low per fix | High: regressions like D1-D3 continue | Stays "vibe-coded" |
| **B. Rebuild on one design system, port data and copy (recommended)** | Medium-high | Medium. Mitigated by a feature inventory and the automated journey scripts from this audit, used as regression tests | Meets the brief |
| C. Restyle only (tokens over the current code) | Medium | High: hides structure problems, fails sections 3, 5 and 7 | Looks better, behaves the same |

### Phase 2 deliverables

| # | Deliverable | Content |
|---|---|---|
| 1 | Tokens | Brand v1.0: Royal Blue scale, Deep Navy ink, Gold for verified moments only, semantic colours, neutrals. Cabinet Grotesk + JetBrains Mono. 6-step type scale, 4px spacing grid, 4 radii, 2 shadows. Light default. Dark mode only if built fully |
| 2 | Core components | App shell (sticky top bar, learner and admin variants, mobile tab bar that never covers content), buttons (primary, secondary, ghost, danger × 3 sizes, loading and disabled), inputs, select, pills, cards, tables, modals (Esc, focus trap, closes on route change), toasts, empty states, error states |
| 3 | Learning components | Activity header (title, step n of N, expected time, task timer when assessed), Next / Previous bar, video player (play, pause, replay, seek, subtitles, speed, resume), audio player (word-level Listen), recorder (record, stop, playback, record again, submit, permission-denied state), quiz item (select, check, feedback), assessment shell (pass mark, attempts, time-up reattempt, resume), hint ladder (3 levels, revealed by behaviour), progress rail |
| 4 | Icon set | One line family (1.75px, 24px grid) replacing every emoji |
| 5 | Two reference screens | Course player (video step + quiz step) and Home, built on the system for sign-off before the rest |

### Phase 3 rebuild order

1. Course player and assessments (fixes D1, D2, D8)
2. Session and persistence (D3), onboarding (D4), modals (D5)
3. Career Counselling, re-skinned to the same system (D6, D9, D10)
4. Home, Explore, Pathway, Course page (layout and length)
5. Achievements, certificate, passport, verify (D5, brand)
6. Opportunities, community, inbox, notifications, profile
7. Admin
8. Section 9 quality review on every screen, desktop, tablet and mobile

## 10. Decisions needed from you

| # | Decision | Options |
|---|---|---|
| 1 | Approach | B (rebuild on a design system, recommended) or A or C |
| 2 | Production Script Checklist | Send it, or approve the component map in section 5 as the working checklist |
| 3 | Second language | The platform offers Hindi. The AAI-E production scripts specify **English and Gujarati** ("user-directed override"). Which one, or both? |
| 4 | Dark mode | Drop it (light only, as the brand defaults) or build it fully in Phase 2 |
| 5 | Media | Real sample video and audio files for the player, or labelled placeholders |
| 6 | Credential branding | Swift AI Academy only, or co-branded with ConveGenius and partners (Google, AWS) |
| 7 | Sign-off | Who approves the Phase 2 reference screens |
