# Mohammad Elsayed — Personal Portfolio

A handwritten portfolio inspired by [samouly.fun](https://samouly.fun), personalized using the supplied CV and original portfolio. Dependency-free HTML, CSS, and JavaScript.

## Features

- Dark/light themes, handwritten social links, pullable hanging note, animated arrow, and cursor-following eyes.
- One-time pink/red name arrival effect that settles to the normal heading.
- Work preview on hover/focus; five expandable projects, experience, toolkit, and keyboard navigation.
- Project notes link to real project details. No fictional blog posts or dates.
- Note composer opens an email draft for the visitor to send. Includes email copying, Twitter, GitHub, LinkedIn, and the supplied CV.
- Live contributions (last 8 months), six latest public commits, and recent public pull requests authored by `YACIINE105` across public repositories.
- RTL commit layout and structured pull request feed (states, repository names, PR titles, and links), newest first, with readable English messages, repository names, and hashes.
- Automatic refresh every five minutes while visible, refresh on return, and manual Refresh for commits and pull requests; contributions refresh periodically while the page remains open. Requests are separated by at least one minute.
- Cached commits and pull requests, explicit offline status, timeouts, validation, and rate-limit backoff. No API key or secret is embedded.
- Responsive layouts, reduced-motion support, focus states, and API fallbacks.

## Run and build

Node.js 22 or newer; no dependency installation required.

```sh
npm run dev
npm run check
npm run build
```

Preview: `http://127.0.0.1:4174`. Build output: `dist/`. Serve over HTTP; browser modules and APIs are not reliable from `file://`.

## Interaction checks

```sh
npm run check:note
npm run check:buddy
npm run check:name
```

Pull the hanging label downward and release to open the email composer. A short or cancelled pull returns to its resting position. Clicking or pressing Enter also works. Only the blue character's eyes follow the pointer; its body stays fixed. Clicking the character leaves all animations running. The name animates briefly on page load and then returns to its normal appearance. Reduced-motion mode skips the name effect and eye tracking and disables decorative animation.

## Existing Vercel portfolio

Use this source in the existing `YACIINE105/mohammad_portfolio` repository. The retained Vercel configuration builds with `npm run build` and publishes `dist/`. No environment variables are required. Canonical metadata retains https://mohammadportfolio-one.vercel.app/.

## Edit

- `index.html`: content, projects, experience, contact, and metadata.
- `assets/playground.css`: design, animations, and responsive styles.
- `assets/playground.js`: navigation, motion, and composer.
- `assets/name-intro.js`: one-time name effect and motion preferences.
- `assets/github-activity.js`: account, API calls (commits and pull requests), live 8-month contributions, caching, and refresh.
- `assets/Mohammad_Elsayed_CV.pdf`: supplied CV.
- `assets/fonts/`: Patrick Hand font and license.

GitHub exposes public, indexed commits and authored pull requests; new activity may take time to be indexed. Contributions use `github-contributions-api.jogruber.de` (showing the last 8 months), updating periodically while open, with repository links as fallback. No analytics scripts.

## API checks

```sh
postman simulation run postman/simulations/github.sim.yaml --port 4900 --output ndjson --no-history
npm run check:github
```

The synthetic mock follows GitHub's documented response and the live response inspected during implementation. It is excluded from the public build and has not been published to Postman. An owning-team mock was not used for this public-provider integration.

Checks cover ordering, deduplication, empty history, invalid/incomplete data, rate-limit backoff, HTML upstream errors, and timeout cancellation. Live browser checks separately confirmed real activity and cached offline behavior.

Claims come from the CV and preserved portfolio. Clinical metrics remain tied to the 40-question evaluation; fraud metrics retain their evaluation context. NDA details are omitted. See `VERIFICATION.md` for browser checks.
