# Future Skills Lab (Swift AI Academy)

One page with the seven Future Skills Lab labs. No login. Each lab opens and plays on the same page, in the same tab.

## Deploy on Netlify

| Option | Steps |
|---|---|
| Drag and drop | Open app.netlify.com/drop and drop this `future-skills-lab` folder. |
| From GitHub | New site from Git, pick `platformdemo`, set **Base directory** to `future-skills-lab`, leave the build command empty. |

## Edit labs

Lab data is in `COURSES` near the bottom of `index.html`. Each lab needs `id`, `title` and `url`. Its thumbnail is `images/courses/<id>.webp` (800 x 500).

Each lab site must allow being shown inside another page. Default Netlify and Vercel sites allow this. Progress is saved only in the viewer's own browser.
