# Swift AI Academy Courses (university share)

One self-contained page with the Future Skills Lab and Applied AI courses. Communication and Vibe Coding are listed as upcoming. No login. Playable courses open on the same page, in the same tab.

## Deploy on Netlify

| Option | Steps |
|---|---|
| Drag and drop | Open app.netlify.com/drop and drop this `university-courses` folder. |
| From GitHub | New site from Git, pick `platformdemo`, set **Base directory** to `university-courses`, leave the build command empty. |

## Edit courses

All course data is in `COURSES` near the bottom of `index.html`.

| To | Do |
|---|---|
| Make a course playable | Add `url:'https://...'` |
| Change a thumbnail | Put an 800 x 500 WebP in `images/courses/` named after the course `id`, or set `img` |
| Add a course | Add a line with `id`, `sec` (`fsl` or `aai`) and `title` |
| Change the upcoming list | Edit `UPCOMING` in `index.html` |

Each embedded course site must allow being shown inside another page (no `X-Frame-Options: DENY` or restrictive `frame-ancestors`). Default Netlify and Vercel sites allow this.

Progress ("In progress", "Completed") is saved only in the viewer's own browser.
