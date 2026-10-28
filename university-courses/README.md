# Future Skills Labs and Swift AI Academy

One self-contained page with three tabs. No login.

| Tab | Contents |
|---|---|
| Future Skills Labs (`#/labs`) | For schools. 7 labs, "School level". Each lab plays on the same page, in the same tab. |
| Swift AI Academy (`#/academy`) | Higher education. Applied AI 1 ("NSQF Level 4", plays on the page). Communication Skills "NSQF Level 1": Module 1 samples (13 web samples, 3 Google Drive asset folders, open in a new tab). Upcoming: Applied AI Levels 1-4, Communication Skills Levels 2-8. |
| OEMs and Domains (`#/oem`) | Upcoming courses from Google, Snowflake, Intel, AWS and Britannica, plus 6 domains. All "Coming soon". |

## Deploy on Netlify

| Option | Steps |
|---|---|
| Drag and drop | Open app.netlify.com/drop and drop this `university-courses` folder. |
| From GitHub | New site from Git, pick `platformdemo`, set **Base directory** to `university-courses`, leave the build command empty. |

## Edit content

All data is near the bottom of `index.html`.

| To | Edit |
|---|---|
| Labs and playable courses | `COURSES`. Thumbnail is `images/courses/<id>.webp` (800 x 500). |
| Communication samples | `COMM_L1` |
| Upcoming levels | `UPCOMING` |
| Providers and domains | `PROVIDERS`, `DOMAINS` |

## Implementation notes (communication samples)

- Source: `Course Asset Creation & Design Process Tracker.xlsx`, sheet `Communications Course`, column G. URLs are copied verbatim. No column F script links are used.
- All samples are tracker status "To be Reviewed", approval "Pending". The page shows "Preview samples. Content is under review."
- Master asset folder (G2, implementation only, not shown to learners): https://drive.google.com/drive/folders/1jiQt4_c1SLx1O_0C7KrtT7NNpm5de4BB
- No link in column G, so not shown: Videos 1-5 (G5-G9), Voice Input 2-5 (G16-G19), Game 2 (G22).

## Before release

- Open every lab, Applied AI 1, all 13 web samples and all 3 asset folders from the published site. Embedded labs must allow being shown inside another page. Drive folders may need sharing set to "Anyone with the link".
- Progress ("In progress", "Completed") is saved only in the viewer's own browser.
