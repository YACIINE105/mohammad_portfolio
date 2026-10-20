# Verification — 20 October 2026

## Latest follow-up: final spacing, name arrival, and eyes-only tracking

- The hanging note moves 24px right on wide desktops, 8px on tablets, and 4px on phones relative to the previous layout.
- The name briefly scrambles with a pink-to-red effect, then returns to Mohammad. Its width is reserved during the effect. The effect runs once per page load and stops observing motion state after completion.
- Only the eyes follow the cursor. The blue body has no tracking transform or bob animation.
- Production-handler checks cover eye direction and bounds, body-transform exclusion, click-to-pause removal, touch exclusion, re-centering, live reduced-motion changes, and frame cleanup.
- Production name-effect checks cover scrambling, reserved width, final text, one-time completion, pause/resume, reduced-motion skip, and live motion-preference changes.
- Pull-handler and structural checks are retained for regression verification.
- Final verification used automated checks only, as explicitly requested by the user after the saved browser-origin rule continued to deny localhost. No alternate browser surface or bypass was used. Earlier browser observations below describe the prior version; a final visual comparison remains unverified.
- Structural checks and all three production interaction harnesses pass. The production build completes using `node scripts/build.mjs`, the command behind `npm run build`.
- The user manually verified the three initial edits, then reported that clicking the blue character paused the hanging note. The character is now decorative, with the global click-to-pause action removed. Regression checks confirm that the eyes keep tracking and no global paused state is set by a character click. This final click change was checked automatically; the visual comparison was not independently repeated by the assistant.

## Previous pull and layout verification

- User independently confirmed that pulling the note works.
- Production pointer-handler event checks passed threshold activation, rope tracking, armed feedback, short/upward/cancelled drags, single opening, focus loss, keyboard activation, and click recovery.
- Browser inspection confirmed both `noteArrowBounce` and `noteArrowInk` running, alongside `sway`. The earlier `bob` animation has since been removed from the blue character at the user's request.
- Compared the original website and portfolio at matching 1265px content viewports: both main content columns were 720px wide. The avatar's rotated bounding box began at y=113.76px locally versus y=116.80px in the reference.
- Corrected the desktop column and title scale, social positions, hanging-note position, one-line Currently/Also check/Work row, Work annotation, and toolbar sizing. CV/email utility links remain available near the footer.
- Browser pointer movement confirmed the earlier head-and-eye response. This was replaced by eyes-only tracking in the latest follow-up.
- The final mobile rendering pass was interrupted by the saved browser-origin denial. The viewport override was reset. No screenshot of the latest edits has been captured.

## Earlier redesign verification


- Source checks: unique IDs, internal links, assets including font paths, inline/external JavaScript syntax, JSON metadata, external-link attributes, valid CV and social image, tabs/dialog, and RTL declaration.
- Browser: desktop, 390px, and 320px widths in dark/light themes. Corrected narrow-screen heading and project-note overflow after inspection.
- Work: focus preview reached opacity 1 and visible state; explorer opened. Journey and Toolkit tabs, including arrow-key navigation, passed. Opening Hotel Agent showed the `enter` animation running.
- Motion: `sway` and `bob` animation timing advanced. Pause froze both at 12346.781ms across separate observations. Resume restored running state. Reduced-motion emulation produced zero animations and the paused control state. Temporary browser overrides were reset.
- Drawing: pen produced 612 ink pixels; eraser removed all. Highlighter produced 2954 pixels. Clear returned zero pixels; Exit restored browsing.
- Contact: dialog opening/closing and successful email-copy feedback verified. No message was sent.
- Live GitHub: real contributions and six commits rendered. Blocking GitHub retained saved commits with an explicit offline message; blocking was removed.
- Postman: the production client made seven HTTP requests recorded in simulation logs. Ordering, deduplication, empty/malformed/incomplete responses, 403 retry delay, HTML 502, and timeout cancellation passed.
- These earlier observations predate the final repository update; they are retained as historical evidence, not as a claim that the latest version was visually inspected.
