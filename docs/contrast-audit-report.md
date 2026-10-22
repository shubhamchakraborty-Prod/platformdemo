# Swift AI Academy MVP Prototype - Text Contrast Audit

| Item | Detail |
|---|---|
| File audited | `mvp_prd_doc.html` (clickable prototype, 1.8 MB, single file) |
| Date | 22 Oct 2026 |
| Standard | WCAG 2.1 AA - 4.5:1 for body text, 3:1 for large text (24px+, or 18.66px+ bold) |
| Method | Headless Chromium rendered 38 routes (learner + admin) in OS light and OS dark mode. Each visible text node's colour was measured against its real rendered background (stacked translucent layers composited; gradients checked against every colour stop). The Career Mentor iframe was audited too. |
| Result | **833 failing text instances (208 unique) before. 0 real failures after** (see "Residual" below) |

## 1. Summary

| Metric | Before | After |
|---|---|---|
| Failing text instances, OS light mode | 378 | 20 flagged, 0 real (15 poster false positives + 5 decorative stars) |
| Failing text instances, OS dark mode | 455 | Same as light (dark mode now renders the light theme) |
| Routes with at least one failure | 35 of 38 | 1 (Opportunities - false positive, see Residual) |
| Failures inside buttons / clickable cards | 216 | 0 |
| Worst ratio found | 1.00:1 (text invisible) | 4.6:1+ on all real text |

## 2. Root causes

| # | Root cause | Impact | Severity |
|---|---|---|---|
| R1 | **Dark mode is half-built.** The page has `prefers-color-scheme: dark` blocks that flip text tokens to near-white, but most cards, heroes and the whole V2 layer (`body.v2`) hard-code white surfaces. 16 dark-mode overrides are written for `[data-theme="dark"]`, which nothing ever sets, so they never apply. | Anyone whose phone/laptop is in dark mode sees white text on white cards (1.07-1.14:1) and dark text on dark green / navy (1.2-1.5:1). Headings like "Personal details", "Password and security", "Your journey", "Your profile" disappear. | Critical |
| R2 | **V2 layer forces `.small / .muted / .faint` to `#32304B`** (dark ink) everywhere, including inside navy hero cards. | MC4 course hero subtitle + "Governing document" line invisible (1.21:1) in light mode too. | Critical |
| R3 | **White text on the bright end of gradients.** Opportunity posters fade from dark to light green / orange / sky blue exactly where the title sits. | "Yuva Yodha", "PM Internship Scheme", "XCELerate 2026" etc. at 1.7-2.9:1. | High |
| R4 | **Accent colours used as text on tinted chips are too light.** Success green `#00BA34`, link blue `#2F6BEA / #386AF6`, red `#D93025`, amber `#C98A00`. | Status badges ("Completed", "Verified", "Start here", "Action required"), "View All", "See all", eyebrows, required `*` at 2.4-4.4:1. | High |
| R5 | **Faint text token `#8A8FB0`** used for table headers, timestamps, metadata. | 2.9-3.2:1 across admin dashboard, institution, community, reviews. | Medium |
| R6 | **Muted light-blue text on blue heroes** (`#B9C8F5`, `#8890D6`, white at 75-82% opacity). | Career Counselling journey steps, "Your answers are saved", Explore banner, pathway hero, signup hero note at 2.0-4.3:1. | Medium |
| R7 | **White on mid-saturated fills** - green tick circles `#00BA34`, red bell badge `#EB5757`, red "Register Now" `#E53935`, certificate seal `#3B82F6`. | 2.6-4.2:1. | Medium |

## 3. Issue register (unique issues, light mode unless stated)

| # | Screen / route | Element | Text example | Before | Fix applied | After |
|---|---|---|---|---|---|---|
| 1 | All screens (OS dark mode) | Page headings, cards, chat side panel, course cards | "Personal details", "Your journey", "Python for data work" | 1.00-1.52 | Theme locked to light (`data-theme="light"` on page + Career Mentor iframe) | Light-mode values |
| 2 | Course MC4 `#/courses/MC4` | Hero subtitle + governing doc line | "Produce a tested, repeatable…" | 1.21 | `color:#fff` on both lines | 12+ |
| 3 | Opportunities | Featured poster title / kicker / subtitle | "Yuva Yodha", "PM Internship Scheme" | 1.70-2.87 | Bottom scrim (dark 55%) behind text; light scrim on the one dark-text poster | 4.5+ (visual check) |
| 4 | Opportunities | "Register Now" chip | "Register Now" | 4.23 | `#E53935` to `#C62828` | 5.62 |
| 5 | Opportunities | Prize money, "View All", "Access to 32M+", "CODE" | "Prize pool up to ₹2 crore" | 2.45-4.18 | Green `#146C2E`, blue `#1F4FC9`, amber `#7A5200` | 5.7-6.1 |
| 6 | Pathway, Achievements, Skill Passport, Community, Admin | Green badges | "Completed", "✓ Verified", "Tour done" | 2.36-3.28 | `#146C2E` | 5.92 |
| 7 | Skill Passport, Community, Admin, Pathway | Blue badges | "Start here", "Core", "Password set" | 3.95-4.08 | `#1F45C9` | 6.55 |
| 8 | Institution overview | Red badge | "Action required" | 4.11 | `#B3261E` | 5.63 |
| 9 | Pathway | Completed step circles / unit ticks | "✓" | 2.60 | Fill `#15803D` | 5.02 |
| 10 | Pathway | Next-step numbers, "Recommended by your Career Mentor" | "2", "3" | 4.12 | `#1F45C9` | 6.82 |
| 11 | Career report / compare | Journey steps on blue hero | "Assessment", "Report", step "1" | 2.01-4.04 | Darker panel behind steps, text `#E3EAFF`, current step `#FFD666` | 7+ |
| 12 | Career compare | Hero note + "In progress" | "Your answers are saved…" | 3.99 | `#E3EAFF` | 5.51 |
| 13 | Explore | "Your next step" banner | "with your Career Mentor" | 2.75-3.28 | Banner gradient deepened to `#1E40AF → #2563EB`, text white | 5.2+ |
| 14 | Pathway | Hero side "complete" | "complete" | 4.18 | White 95% | 7.4 |
| 15 | Achievements | Certificate seal | "EST 2026", "Swift AI" | 3.10-3.68 | Seal `#2563EB → #1E40AF`, full-opacity text | 5.17+ |
| 16 | Admin dashboard, Institution, Reviews, Community | Faint text, table headers | "Learner", "22 Oct, 06:55 am" | 2.93-3.16 | `--text-faint` `#8A8FB0` to `#5F6485` | 5.32-5.76 |
| 17 | Admin tables | Tick marks | "✓" | 3.61 | `#167A31` | 5.44 |
| 18 | Top nav (all screens) | Bell count badge | "4" | 3.48 | `#C62828` | 5.62 |
| 19 | Explore, Achievements | Eyebrows, "See all", "Coming soon", "Certificate locked" | "ACHIEVEMENTS", "See all →" | 4.26-4.46 | `#2449D8`, `#1F45C9`, `#4B5063` | 6.4-7.2 |
| 20 | Skill Passport, Help, Demo, Admin | Page eyebrows | "Skill Passport", "Admin portal" | 4.40 | `#2449D8` | 6.43 |
| 21 | Inbox | Message preview | "– Explore personalised…" | 4.45 | `#555E7D` | 6.07 |
| 22 | Signup | Hero note, "Back to log in", required `*` | "Demo signup - no email…" | 4.34-4.41 | `#C9CEF2`, `#2449D8`, `#B3261E` | 6.0-8.4 |
| 23 | Login / Signup | Input placeholder | "Enter your email address" | 3.0 | `#6B7391` | 4.7 |

## 4. Residual (not fixed, by design)

| Item | Why left |
|---|---|
| Opportunity posters still flag in the automated scan | Scanner reads the gradient colour stops but not the new scrim pseudo-element. Rendered screenshots confirm white text now sits on a darkened base. |
| Notification star "★" (3.33) and certificate star (4.15) | Decorative icons. WCAG non-text threshold is 3:1, both pass. |

## 5. Decision taken: light theme locked

Dark mode was only partially implemented (tokens flip, components do not). Fixing it properly means re-theming every card, hero, table and the V2 layer. Locking the designed light theme removes every dark-mode failure in one change. A full dark theme can be built later as its own task.

## 6. Not covered by this audit

| Area | Note |
|---|---|
| Hover / pressed / disabled button states | Default state only. Hover-state scan not run. |
| Modals, toasts, tour overlay | Only content visible on route load was scanned. |
| Text over photos | Skipped by the scanner (needs manual review). |
| Mobile widths | Audited at 1366 × 900. |

## 7. Where the fixes live

| Change | Location in `mvp_prd_doc.html` |
|---|---|
| Light-theme lock | Inline script before `<style id="v59-css">`, and `data-theme` on the Career Mentor iframe `<html>` |
| MC4 hero text colour | `renderMC4()` markup |
| Signup hero note + back link | `renderSignup` markup |
| All other overrides | `<style id="contrast-fix">` at the end of the file (loads last, one place to review) |
