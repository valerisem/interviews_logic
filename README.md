# Candidate Assessment — House of Marketers

Short, timed work-skills assessments for **Campaign Manager** and **Account Manager** candidates: 6 questions each, 145 seconds of question time, about 3 minutes overall. The candidate picks the role they're interviewing for on the landing page, and that decides which assessment they take.

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
| `/admin` | Admin dashboard (Google sign-in) |
| anything else | Redirects (302) to `REDIRECT_URL`, https://houseofmarketers.com |

## Candidate flow (`/form`)

1. **Landing:** a short description and the rules (6 questions, about 3 minutes, a timer per question, no going back, stay on the page, one attempt). The candidate enters name, email and the role they're interviewing for (Campaign Manager or Account Manager), and ticks a required checkbox: *"I confirm that I have read and understood the Candidate Assessment Privacy Notice"* (links to `/form/privacy`). The reasonable-adjustment wording is shown under Start. No timer runs here.
2. **Start Assessment** saves the details and the privacy confirmation (with the notice's effective date), generates the candidate's questions and starts question 1. The address becomes `/form/a/<token>`, so a reload resumes the same attempt. Each email can take the assessment once.
3. **Questions:** one per screen, each with its own visible timer. All the information needed stays visible. There is no going back and no right/wrong feedback. When a timer runs out, whatever is selected at that moment is recorded and the next question starts.
4. **Completion:** *"Assessment completed. Thank you. Your responses have been submitted successfully and will be reviewed as part of your application."* No score is shown.

Timers keep running if the candidate leaves the tab or closes the page. Questions whose time has passed are recorded as unanswered.

### Campaign Manager (`lib/questions/campaignManager.ts`)

| # | Category | Time | Format |
|---|---|---|---|
| 1 | Attention to Detail | 15s | Two campaign records side by side, count the differences (1, 2 or 3) |
| 2 | Financial Accuracy | 25s | Four cost lines vs approved budget: a row of three buttons, MORE / LESS / EQUAL |
| 3 | Following Requirements | 20s | Five creator rules + missing-information rule: APPROVE / REJECT / NEEDS REVIEW |
| 4 | Prioritisation | 30s | Drag four items into priority order (mouse, touch, or arrow buttons) |
| 5 | Logical Reasoning | 25s | Campaign dependency rules, one objectively correct statement |
| 6 | Operational Judgement | 30s | Realistic Campaign Manager situation, one clearly preferable response |

### Account Manager (`lib/questions/accountManager.ts`)

| # | Category | Time | Format |
|---|---|---|---|
| 1 | Attention to Detail | 15s | Two versions of a client campaign (budget, markets, launch, creators, usage rights, reporting); count the differences (1–3), never spelling tricks |
| 2 | Commercial Accuracy | 20s | Total costs vs client budget: pick the variance, e.g. + £500 / − £500 / = £0 / + £1,000 |
| 3 | Client Requirements | 25s | Client brief and proposed plan side by side; exactly one requirement is unmet (Germany creators, TikTok share, launch date or creator count) |
| 4 | Prioritisation | 30s | Drag four account items into priority order; same weighted scoring |
| 5 | Commercial Reasoning | 25s | Client changes the budget with the same scope; what happens to the amount remaining |
| 6 | Client Judgement | 30s | Four client situations (underperformance, discount request, late delivery, new market); the strongest answer shows ownership without unnecessary concessions |

Q2 is over, under or exact about a third of the time each. Q5 has the budget reduced in about 70% of versions and increased in the rest.

### Campaign Manager variation

Every Campaign Manager question is generated per candidate:

- **Q1:** names, fees, dates and values vary, with 1, 2 or 3 small differences.
- **Q2:** the figures vary; the outcome is MORE, LESS or EQUAL in roughly equal shares, with differences of £250–£1,000.
- **Q3:** the outcome is APPROVE, REJECT or NEEDS REVIEW in roughly equal shares. Reject cases fail exactly one rule by a small margin; Needs Review cases have one field missing.
- **Q4–Q6:** drawn from four equivalent scenarios each. Options are shuffled where appropriate, and Q4's display order is randomised.

## Scoring

- Each question is scored 0–1, and each category has one question (the categories differ by role). Overall score = average × 100.
- **Prioritisation is weighted, not one rigid order.** 60% goes to ranking the high-risk item first (15% if it is second). 40% goes to how well the other three follow their relative urgency, where equally urgent items may go in either order. That part is cut to a quarter if the high-risk item isn't first. Examples: the ideal order scores 100, putting an internal update first scores about 25.
- Completion time is stored separately and is not part of the score. Nobody is rejected automatically; a recruiter or hiring manager decides.

## Reasonable adjustments

Candidates are asked to contact their recruiter before starting. In the dashboard a recruiter can give any candidate **extra time** (None, +25%, +50%, +100%), applied to every remaining question. This can be done even mid-assessment. The app never asks for or stores the reason for an adjustment.

## Recruiter dashboard (`/admin`)

**Sign-in is with Google only.** A recruiter must use a verified houseofmarketers.com Google account and be a team member listed in the `ADMIN_TEAM_IDS` setting (comma-separated ids from `public.team`, currently `3`). Their work email and leaving date are read from the team record, and access stops automatically once they have left. No extra tables are used.


- Shows the shared assessment link with a copy button, and one tab per role (Campaign Manager / Account Manager), each with its own category columns.
- For each candidate: name, email, role, date, overall score, the six category scores, time taken, extra time and tab leaves.
- **Take Test** opens the assessment in test mode (see below).
- **Review** shows each question with the time used, the candidate's answer, the correct answer (the ideal order for Q4) and the result. It also shows the question exactly as the candidate saw it.

## Test mode

While signed in to the dashboard, `/form` runs in **test mode** (shown in the header): the one-attempt-per-email rule is skipped, so you can take either assessment as often as you like. Test attempts are saved like any other, with `-TEST` added to the assessment version, and are tagged **Test** on the dashboard. Candidates are never in test mode.

## Anti-copy measures

- Text selection, copy/cut/paste, right-click, drag and common Ctrl/⌘ shortcuts are disabled outside the form fields, and printing is blank.
- One question per screen; no going back (enforced on the server); timers are kept on the server.
- Leaving the tab or window is counted and shown to the recruiter, never penalised.
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
