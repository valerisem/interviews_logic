# Candidate Assessment

A short, timed assessment for Campaign Manager candidates. It covers attention to detail, following instructions, prioritisation, numerical reasoning, logical reasoning and operational judgement.

It measures job-relevant skills only. It does not attempt to identify or diagnose ADHD, autism, dyslexia, neurodivergence, disability, health conditions or personality traits.

Built with Next.js (App Router) and Supabase. It runs on any Node host (Vercel, Railway, your own server) under your own domain.

## How it works

**Candidate**: one public link for everyone (the site root, e.g. `https://assessment.yourdomain.com`)
1. The landing page shows the required wording and asks for **name**, **email** and **the role they're interviewing for**. It has **Start Assessment** and **Contact Recruiter** (mailto `RECRUITER_EMAIL`) buttons. The timer does not run on this page.
2. **Start Assessment** saves the details, generates the candidate's 12 questions on the server and starts the server-side clock immediately. The page address changes to `/a/<token>`, so a reload resumes the same attempt. Each email can take the assessment once.
3. Candidates see one question at a time, with "Question n of 12" and a countdown. There is no back navigation, and no right/wrong or score feedback.
4. On submit or timeout, the completion screen shows only: *"Assessment completed. Thank you. Your responses have been submitted successfully and will be reviewed as part of your application."*

**Recruiter** (`/admin`, password protected)
- Shows the shared assessment link with a copy button. There are no per-candidate links to generate.
- The table shows name, email, role, date, overall score (/100), the six category scores (%), time taken, time limit and number of tab leaves.
- **Time limit** can be edited per candidate after they enrol, including while they're taking the test (for example, a reasonable adjustment). The new limit applies immediately, and the candidate's countdown updates on their next answer.
- **Review** opens every question with the candidate's answer, the correct answer and the result. You can expand each question to see it as the candidate saw it.
- Scores never reject anyone automatically. The recruiter or hiring manager makes the decision.

## Question bank

`lib/questionBank.ts` contains 23 generator templates:

| Category | Per assessment | Templates |
|---|---|---|
| Attention to Detail | 3 | version differences, budget reconciliation, campaign record with two errors (pick two), handle mismatch, posting window |
| Following Instructions | 2 | creator approval rules, content sign-off rules; the two questions always have different correct outcomes (Approve / Reject / Needs Review) |
| Prioritisation | 2 | 5 scenarios (live incorrect claims, broken discount code, Spark Ads blocker, missing #ad, wrong brand tag) |
| Numerical Reasoning | 2 | budget remaining, % remaining (same figures), cost per 1,000 views, engagement rate, fee increase |
| Logical Reasoning | 2 | 7 rule-based templates (must follow, launch before approval, affirming the consequent, contract rule, some/all, sequence, only-if) |
| Operational Judgement | 1 | 4 scenarios |

Each candidate gets randomly drawn templates, randomised names, budgets, dates and thresholds, and shuffled question and option order. Correct answers are computed from the generated values. `npm test` generates 5,000 assessments and checks structure, mix and scoring. The current bank yields about 4,900 distinct template combinations across 5,000 candidates.

## Scoring

- One mark per question. A "pick two" question needs both correct picks. Overall score = correct / 12 × 100.
- Category scores are the percentage correct within each category (e.g. 67% = 2 of 3).
- Completion time is stored separately and is **not** combined with accuracy.

## Anti-copy / anti-AI measures

- Text selection, copy, cut, paste, right-click, drag and the common Ctrl/⌘ shortcuts (C, X, V, A, P, S, U) are disabled, and printing renders a blank page.
- One question at a time, and no going back (enforced on the server, not just in the UI).
- The timer is server-side, so it keeps running if the candidate leaves the tab or reloads.
- Each time the candidate leaves the tab or window, it is counted and shown to the recruiter. Leaving is never penalised automatically.
- Varied values, a large bank and randomised order mean candidates don't all see the same questions.
- Correct answers never reach the browser.

Screenshots and photos of the screen **cannot** be blocked on a normal website, and the app does not claim to block them.

## Setup

1. **Supabase**: run `supabase/migrations/20261003000000_create_assessments.sql` in the SQL editor (or `supabase db push`). It creates the `assessments` table with RLS enabled and no public policies, so only the server, using the service role key, can access it.
2. **Environment**: copy `.env.example` to `.env.local` and fill in the values.
3. **Run**:
   ```bash
   npm install
   npm run dev       # http://localhost:3000/admin
   npm run build && npm start
   ```
4. **Deploy**: deploy to Vercel or any Node host, set the same environment variables, point your domain at it, and set `APP_BASE_URL` to that domain.

## Data stored (`public.assessments`)

Candidate name, email, role, assessment version, questions received (with options in the order shown), answers submitted, correct answers, overall score, category scores, completion time, start/completion timestamps, time limit, timeout flag and number of tab/window changes.
