# Future Skills Labs and Swift AI Academy

One self-contained page with two tabs. No login.

| Tab | Audience | Contents |
|---|---|---|
| Future Skills Labs (`#/labs`) | Schools | 7 labs, "School level". Each lab plays on the same page, in the same tab. |
| Swift AI Academy (`#/academy`) | Higher education | Applied AI ("NSQF Level 4"), Communication Skills (Levels 1-8), Vibe Coding, and upcoming OEM and learning-provider courses. |

Communication Skills Level 1 opens a samples view (`#/samples/communication-level-1`) with 13 web samples and 3 Google Drive asset folders. These open in a new tab.

## Deploy on Netlify

| Option | Steps |
|---|---|
| Drag and drop | Open app.netlify.com/drop and drop this `university-courses` folder. |
| From GitHub | New site from Git, pick `platformdemo`, set **Base directory** to `university-courses`, leave the build command empty. |

## Edit content

All data is near the bottom of `index.html`.

| To | Edit |
|---|---|
| Courses and labs | `COURSES`. Add `url` to make one playable. Thumbnail is `images/courses/<id>.webp` (800 x 500). |
| Upcoming level entries | `UPCOMING_LEVELS` |
| Providers and domains | `PROVIDERS`, `DOMAINS` |
| Communication samples | `SAMPLE_SETS` |

## Implementation notes (communication samples)

- Source: `Course Asset Creation & Design Process Tracker.xlsx`, sheet `Communications Course`, column G. URLs are copied verbatim. No column F script links are used.
- All samples are tracker status "To be Reviewed", approval "Pending". The page shows "Preview samples. Content is under review."
- Master asset folder (G2, implementation only, not shown to learners): https://drive.google.com/drive/folders/1jiQt4_c1SLx1O_0C7KrtT7NNpm5de4BB
- No link in column G, so not shown: Videos 1-5 (G5-G9), Voice Input 2-5 (G16-G19), Game 2 (G22).

## Before release

- Open every lab, Applied AI 1, all 13 web samples and all 3 asset folders from the published site. Embedded labs must allow being shown inside another page. Drive folders may need sharing set to "Anyone with the link".
- Progress ("In progress", "Completed") is saved only in the viewer's own browser.
