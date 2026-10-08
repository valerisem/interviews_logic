# Candidate Assessment — House of Marketers

Short, timed work-skills assessments for **Campaign Manager** and **Account Manager** candidates: 6 questions each: 3 minutes 20 seconds of question time for Campaign Manager, 2 minutes 50 seconds for Account Manager. The candidate picks the role they're interviewing for on the landing page, and that decides which assessment they take.

- **Campaign Manager:** attention to detail, numerical accuracy, following campaign requirements, prioritisation, logical reasoning, operational judgement.
- **Account Manager:** attention to detail, commercial accuracy, interpreting client requirements, prioritisation, commercial reasoning, client judgement.

Both also measure working accurately under time pressure. It does **not** attempt to identify or diagnose ADHD, autism, dyslexia, neurodivergence, disability, health conditions or personality traits.

Next.js (App Router) + Supabase. Runs on any Node host (Railway, Vercel, your own server) under your own domain.

## Addresses

The app runs on **houseofmarketer.com**, next to a redirect to the main website:

| Path | What it serves |
|---|---|
| `/form` | Candidate assessment (the link you send candidates) |
| `/form/privacy` | Candidate Assessment Privacy Notice |
| `/form/a/<token>` | A candidate's attempt, so a reload resumes it |
| `/jobs/head-of-delivery-performance`, `/jobs/head-of-operations` | Public job descriptions, from `content/jobs/` (see `lib/jobs.ts`) |

The Head of Operations page also shows an interactive org chart (pan, zoom, hover for reporting lines): a frozen copy of the Org Chart Whiteboard board *Reorg draft — 2026-10-02* (`content/jobs/org/head-of-operations.json`, drawn by `components/OrgChart.tsx`). Later edits to that board don't change the page until the copy is refreshed.
| `/admin` | Admin dashboard (Google sign-in) |
| `/` | Redirects to `/form` |
| anything else | Redirects (302) to `REDIRECT_URL`, https://houseofmarketers.com |

## Candidate flow (`/form`)

1. **Landing:** the rules (6 questions, around 3 to 4 minutes, a timer per question, no going back, stay on the page, one attempt). The candidate enters name, email and the role they're interviewing for (Campaign Manager or Account Manager), and ticks a required checkbox: *"I confirm that I have read and understood the Candidate Assessment Privacy Notice"* (links to `/form/privacy`). A small italic footnote under Start Assessment asks candidates to contact their recruiter before starting or as soon as possible (extra time, an alternative format or assistive technology), says no diagnosis is needed, and that adjustment information is kept separate from scoring and won't disadvantage them. No timer runs here.
2. **Start Assessment** saves the details and the privacy confirmation (with the notice's effective date), generates the candidate's questions and starts question 1. The address becomes `/form/a/<token>`, so a reload resumes the same attempt. Each email can take the assessment once.
3. **Questions:** one per screen, each with its own visible timer. All the information needed stays visible. There is no going back and no right/wrong feedback. When a timer runs out, whatever is selected at that moment is recorded and the next question starts.
4. **Completion:** *"Assessment completed. Thank you. Your responses have been submitted successfully and will be reviewed as part of your application."* No score is shown.

Timers keep running if the candidate leaves the tab or closes the page. Questions whose time has passed are recorded as unanswered.

### Campaign Manager (`lib/questions/campaignManager.ts`)

| # | Category | Time | Format |
|---|---|---|---|
| 1 | Attention to Detail | 20s | Two campaign records side by side, count the differences (1, 2 or 3) |
| 2 | Financial Accuracy | 40s | Four cost lines vs client budget, answered with a row of three buttons: £x MORE / £x LESS / EQUAL |
| 3 | Following Requirements | 40s | Five campaign requirements and three creators side by side: which creator meets all of them (A, B, C or More than one) |
| 4 | Prioritisation | 30s | Drag four items into priority order (mouse, touch, or arrow buttons); scored on the high-risk item being first |
| 5 | Logical Reasoning | 40s | Campaign dependency rules, one objectively correct statement |
| 6 | Operational Judgement | 30s | Report views don’t match the platform dashboard two hours before a 3:00 PM client deadline, manager unavailable: check, correct and flag to the Account Manager. Options shuffled |

### Account Manager (`lib/questions/accountManager.ts`)

| # | Category | Time | Format |
|---|---|---|---|
| 1 | Attention to Detail | 20s | Two versions of a client campaign (budget, markets, launch, creators, usage rights, reporting); count the differences (1–3), never spelling tricks |
| 2 | Commercial Accuracy | 30s | Total costs vs client budget: pick the variance, e.g. + £500 / − £500 / = £0 / + £1,000 |
| 3 | Client Requirements | 25s | Client brief and proposed plan side by side; exactly one requirement is missed by the smallest margin (one creator short, TikTok one under 50% shown as e.g. 12 of 25, or launch one day late), and every passing value also sits close to its threshold |
| 4 | Prioritisation | 30s | Drag four account items into priority order; scored on the high-risk item being first |
| 5 | Commercial Reasoning | 35s | Client changes the budget with the same scope; what happens to the amount remaining |
| 6 | Client Judgement | 30s | Scope change: the client adds France on the same budget and end date. Which option fits (replace the 4 uncontracted UK slots with 4 French creators)? Figures vary; options shuffled |

Q2 is over, under or exact about a third of the time each. Q5 has the budget reduced in about 70% of versions and increased in the rest. In Q6 the uncontracted UK budget always covers exactly four UK creators, and French creators always cost £200–£300 less each.

### Campaign Manager variation

Every Campaign Manager question is generated per candidate:

- **Q1:** names, fees, dates and values vary, with 1, 2 or 3 small differences.
- **Q2:** four cost lines (Creator Costs, Paid Media, Production / Fulfilment Costs, Other Campaign Costs) with figures that vary; the outcome is MORE, LESS or EQUAL in roughly equal shares, with differences of £250–£1,000. The options always read £x MORE, £x LESS and EQUAL.
- **Q3:** usually exactly one creator qualifies (A, B or C equally often); about a quarter of the time two do (More than one creator). Each creator who doesn't qualify misses a different requirement by a small margin, and passing values sometimes sit exactly on a threshold (e.g. 3.0%, £1,500).
- **Q4–Q5:** drawn from four equivalent scenarios each. **Q6** is a single scenario. Options are shuffled where appropriate, and Q4's display order is randomised.

## Scoring

- Each question is scored 0–1, and each category has one question (the categories differ by role). Overall score = average × 100.
- **Prioritisation (both roles):** full credit if the high-risk item is placed first, nothing otherwise. The order of positions 2–4 doesn't affect the score; the full ranking is stored and shown to the recruiter in Review.
- Completion time is stored separately and is not part of the score. Nobody is rejected automatically; a recruiter or hiring manager decides.

## Reasonable adjustments

Candidates are asked to contact their recruiter before starting. In the dashboard a recruiter can give any candidate **extra time** (None, +25%, +50%, +100%), applied to every remaining question. This can be done even mid-assessment. The app never asks for or stores the reason for an adjustment.

## Recruiter dashboard (`/admin`)

**Sign-in is with Google only.** Two ways in, no extra tables:

- **Team members:** a verified houseofmarketers.com Google account belonging to a team member listed in `ADMIN_TEAM_IDS` (comma-separated ids from `public.team`, currently `3,1,10`: Valeria, Inigo, Valeriia). Work email and leaving date come from the team record, and access stops automatically once they have left.
- **People outside the company:** verified Google accounts listed by email in `ADMIN_EXTRA_EMAILS`. Google only lets them in if the OAuth consent screen is set to External.
- **Email and password:** for admins who can't use Google sign-in (currently maddy.worger@majorplayers.co.uk), the sign-in page also has an email and password form. Accounts are listed in `ADMIN_PASSWORDS` as `email:salt:hash` (scrypt); only the hash is stored. Five wrong attempts lock that email for 15 minutes. To add someone or reset a password, generate a new hash with `node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s+':'+c.scryptSync(process.argv[1],s,32).toString('hex'))" 'the-password'` and set `ADMIN_PASSWORDS` to `email:<output>`.


- Shows the shared assessment link with a copy button, and one tab per role (Campaign Manager / Account Manager), each with its own category columns.
- For each candidate: name, email, role, date, overall score, the six category scores, time taken, extra time and tab leaves.
- **Take Test** opens the assessment in test mode (see below).
- **Delete:** the trash icon (on each row and on the Review page) removes a submission from the dashboard after a confirmation prompt. It is not deleted from the database: the row stays in `candidate_assessments` with `hidden_at` set. To delete in bulk, tick the rows (or the header box to select the whole tab) and click **Delete Selected**.
- **Review** shows each question with the time used, the candidate's answer, the correct answer (a suggested order for Q4, where only item 1 is scored) and the result. It also shows the question exactly as the candidate saw it.

## Test mode

While signed in to the dashboard, `/form` runs in **test mode** (shown in the header): the one-attempt-per-email rule is skipped, so you can take either assessment as often as you like. Test attempts are saved like any other, with `-TEST` added to the assessment version, and are tagged **Test** on the dashboard. Candidates are never in test mode. Test attempts also have a **Pause** button next to the timer: the timer stops (even if you reload or leave the page) and Next Question is disabled until you resume. Pausing needs both a test attempt and your admin sign-in, so candidates can't pause. **Restart** (next to Pause) starts a fresh attempt straight away with the same name and email, and the completion screen offers **Retake Campaign Manager** / **Retake Account Manager**, so there's no need to fill in the form again.

## Discord notifications

When a candidate finishes an assessment (answers or times out on the last question while taking it), the company's Discord bot posts a summary to the hiring channel: name, email, role, overall and category scores, time taken, tab leaves, extra time and a **Review** link (admin sign-in required). Test attempts, and candidates who abandon partway (their remaining questions time out later), are not posted. Settings: `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_ID`; if either is missing nothing is sent, and a Discord failure never affects the candidate.

## Bot protection

The public start form has three invisible checks (`lib/botChecks.ts`), so bots can't fill the database with junk:

- a hidden trap field that people never see; if it's filled in, nothing is saved;
- a signed timestamp issued with the page: starting within 3 seconds of loading it is rejected, and posting without loading the page fails;
- at most 5 new assessments per internet connection per hour.

Signed-in admins (Google or password) skip all three.

## Anti-copy measures

- Text selection, copy/cut/paste, right-click, drag and common Ctrl/⌘ shortcuts are disabled outside the form fields, and printing is blank.
- One question per screen; no going back (enforced on the server); timers are kept on the server.
- Leaving the tab or window (the page losing focus or being hidden) is counted and shown to the recruiter, never penalised automatically. Only the count is stored, not timestamps. Candidates are told about this in How It Works and in the privacy notice (sections 2 and 3).
- Correct answers never reach the browser.

Screenshots can't be blocked on a normal website, and the app doesn't claim to block them.

## Design

House of Marketers brand colours taken from the logo: indigo `#200888` and fuchsia `#F0438F`, with brand navy `#0B0E1A` for dark mode. Typeface: Plus Jakarta Sans, bundled with the app so it doesn't depend on Google Fonts. Every page has a **light/dark switch** next to the logo (the landing page also has an **Admin Sign In** button there), which sits top-right; the choice is remembered in the browser. Dark mode uses a white version of the horizontal logo.

## Privacy notice

`/form/privacy` renders `content/privacy-notice.json` full width, with a contents list beside the text. It is the Candidate Assessment Privacy Notice (effective 4 October 2026). To update it, edit that file; candidates' confirmations record the effective date they agreed to.

## Setup

1. **Supabase:** apply the files in `supabase/migrations/` in order. They create `public.candidate_assessments` with RLS enabled and no public policies, so only the server, using the service role key, can access it. These have already been applied to the *Team* project.
2. **Environment:** copy `.env.example` to `.env.local` and fill it in.
3. **Google sign-in:** in Google Cloud Console → APIs & Services → Credentials, create an OAuth client ID (type *Web application*). Add the authorised redirect URI `<APP_BASE_URL>/api/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. **Run:**
   ```bash
   npm install
   npm test          # question bank + scoring checks
   npm run dev       # http://localhost:3000 (candidate) and /admin (recruiter)
   npm run build && npm start
   ```
5. **Deploy:** set the same environment variables on your host, point your domain at it and set `APP_BASE_URL`.
