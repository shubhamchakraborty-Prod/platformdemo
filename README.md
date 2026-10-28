# Swift AI Academy - MVP Platform Prototype

Clickable demo of the Swift AI Academy learning platform. Sample data only: nothing is sent, billed or officially issued. State is saved in the viewer's browser (localStorage).

**Live demo:** https://shubhamchakraborty-prod.github.io/platformdemo/

## Demo accounts

Pick an account from the **Demo account** dropdown on the login screen. The email and password fill in for you. All credentials are demo-only.

| Account | Email | Password | Lands on |
|---|---|---|---|
| Isha Joshi (new learner, college) | isha.joshi@example.com | swift learner 2026 | Welcome |
| Sagar Pawar (new learner, ITI) | sagar.pawar@example.com | swift learner 2026 | Welcome |
| Ananya Mehta (new, college onboarding) | ananya.mehta@example.com | swift learner 2026 | Welcome |
| Rohan Kulkarni (career counselling) | rohan.kulkarni@example.com | swift learner 2026 | Career counselling chat |
| Sneha Kapoor (existing learner, has progress) | sneha.kapoor@example.com | swift learner 2026 | Home |
| Priya Kapoor (college admin) | priya.c41237@swiftaiacademy.in | admin123 | Admin dashboard |
| Sunita Rao (ITI admin) | sunita.gr27000142@swiftaiacademy.in | Institution Admin 2026 | Admin dashboard |

Career Counselling opens with a choice of English or Hindi.

## Courses section

The **Courses** tab lists in-house courses in four sections: Future Skills Lab, Applied AI, Communication and Vibe Coding. Courses with a link play inside the platform in the same tab (embedded player with back, previous/next, full screen and Mark as complete). Courses without a link show a cover and "Coming soon".

To add or change a course, edit `CX_COURSES` near the end of `mvp_prd_doc.html`: add `url` to make it playable, `img` to use a photo as its thumbnail, or `hidden:true` to hide it.

## Files

| File | What it is |
|---|---|
| `mvp_prd_doc.html` | The whole prototype (single file) |
| `index.html` | Redirects the site root to the prototype |
| `docs/contrast-audit-report.md` | Text contrast audit (WCAG AA): issues found and fixes |
| `.github/workflows/pages.yml` | Publishes the site to GitHub Pages on every push |
