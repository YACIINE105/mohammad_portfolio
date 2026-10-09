# Mohammad Elsayed — AI Engineer Portfolio

A responsive, dependency-free portfolio built from the supplied CV, inspected project repositories, and the published AlSadaf AI Agents & Automation role. It includes separate AI agent and automation sections, interactive architecture views, seven project/implementation case studies, original CV links, and a downloadable copy of the original CV.

Featured additions: Hotel Agent (multilingual text, English streaming voice, guarded tools, guest-confirmed booking, staff handoff, and MCP travel search) and CustomerSupport (authenticated async backend, conversation assignment, escalations, and call records). Their custom booking and escalation workflows also appear in the automation section.

## Deploy on Vercel

1. Unzip this project. Upload the contents of `mohammad-portfolio/` to a GitHub repository; `package.json` must be at the repository root.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Use **Other** as the framework preset. `vercel.json` supplies **Build Command: `npm run build`** and **Output Directory: `dist`**. Use Node.js **24.x** (or a supported version 22+). No environment variables or dependencies are needed.
4. Choose **Deploy**. Share the resulting URL with the recruiter.

Alternatively, from the project folder, use Vercel CLI:

```bash
npx vercel --prod
```

The CLI will ask you to sign in and select a Vercel account/project. No deployment or account action has been performed by the portfolio builder.

## Local use

Open `index.html` directly, or use a static server:

```bash
python3 -m http.server 3000
```

Then open `http://localhost:3000`. Local fonts and the CV are included. There are no external scripts, trackers, API keys, or paid services.

To build or run the structural check:

```bash
npm run check
npm run build
```

## Edit the content

- **Page copy, layout, colors, and mobile styles:** `index.html`. CSS is in the `<style>` block.
- **Project case studies and architecture tabs:** `cases` and `architectures` in the bottom `<script>` block.
- **CV:** replace `assets/Mohammad_Elsayed_CV.pdf`, retaining its name.
- **Social sharing image:** `assets/social-preview.png`.
- **Contact links:** search `index.html` for the email, phone number, and GitHub/LinkedIn URLs.
- **AlSadaf-specific section:** search for `<section class="section" id="sadaf"`. Remove or adapt it for another employer. The rest of the portfolio is reusable.
- **After deployment:** add your absolute production URL to `og:url`, a canonical link, and the absolute `og:image` URL if needed for your social platform’s crawler. The current root-relative image path works on standard Vercel hosting, but some social crawlers require an absolute URL.

Contact details intentionally come from the CV, including the phone number. Remove the phone link before a public deployment if you prefer email-only contact.

## Content sources and scope

- `assets/Mohammad_Elsayed_CV.pdf` is an unmodified copy of the supplied CV. Project metrics, dates, qualifications, and repository/demo/certificate links are sourced from it.
- AlSadaf company profile: https://www.linkedin.com/company/alsadaf-company-for-production
- Published role: https://eg.linkedin.com/jobs/view/4469705956/
- Research date: 9 October 2026. The job posting names Sadaf for Audio & Visual Production Co. Ltd. in its description and asks for agents, APIs, Odoo/email integrations, KPIs, testing, monitoring, and documentation.
- The company’s LinkedIn profile describes a drama production company within MBC Group. That context informed the proposed production-document use case.
- Clinical metrics are labeled with their 40-question evaluation context. The n8n workflow illustration is an overview, not a claim about exact node definitions or a production booking provider.
- Proposed AlSadaf use cases are clearly marked. Odoo is a proposed integration, not existing Odoo experience.
- PM Accelerator NDA details are not disclosed.
- CV repository, demo, and certificate links were preserved. Those older repository contents and link permissions were not independently verified in the initial build.
- **Hotel Agent:** https://github.com/YACIINE105/hotel_agent — code and documentation inspected at commit `6d0face6fdc4ddf1ee648816348c61c6ccb93010` on 9 October 2026. Reviewed the README, architecture, agent orchestrator, booking service, MCP supplier adapter, voice pipeline, knowledge service, and tests. The page distinguishes a simulated hotel connector from configured external travel-search integrations; current TTS is English-only.
- **CustomerSupport:** https://github.com/YACIINE105/CustomerSupport — code and documentation inspected at commit `5254626a8641d626aa257b105c18dabe9f0b0b8d` on 9 October 2026. Reviewed services, authentication, migrations, and tests. Later README milestones were checked against code because the older overview is stale. This is featured as an implemented backend foundation; LLM/RAG, frontend, and telephony extensions remain planned.
- Both added repositories were accessed directly through Git. Their application servers, suppliers, paid services, and test suites were not run for this portfolio edit. No repository code was modified. No latency, throughput, production-customer, or ROI claims were added from unverified measurements.

## Verification

The project includes a successful static build and structural validation: JavaScript syntax, JSON metadata, anchors, local assets, original CV integrity, and responsive/accessibility declarations. The page provides keyboard-operable tabs, native modal dialogs, focus styles, reduced-motion support, and mobile navigation. Browser rendering and real interaction QA were unavailable in the creation environment; review desktop and mobile on Vercel’s preview before sharing.

## Fonts

Rubik (regular/bold) and Source Code Pro are bundled for offline use under the SIL Open Font License 1.1. See `assets/fonts/OFL.txt`.
