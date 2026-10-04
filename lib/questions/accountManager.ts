import { Rng } from '../random';
import type { Question } from '../types';
import { addDays, dayMonth, money, num, ranking, randomDate, single, type PriorityScenario } from './shared';

/*
 * Account Manager assessment: 6 timed questions, 180 seconds in total.
 *
 *   1. Attention to Detail        30s  two versions of a client campaign, count the differences (1–3)
 *   2. Commercial Accuracy        30s  variance between total costs and budget: +£x / −£x / £0
 *   3. Client Requirements        25s  brief vs proposed plan, find the one requirement it narrowly misses
 *   4. Prioritisation             30s  rank four account items; scored on the high-risk item being first
 *   5. Commercial Reasoning       35s  effect of a budget change on the amount remaining
 *   6. Scope Change               30s  add France on the same budget: which option fits
 */

export const AM_VERSION = 'AM-2026.3';
export const AM_TIMES = [30, 30, 25, 30, 35, 30];

const MARKETS = ['UK', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Ireland', 'Sweden'];
const REPORTING = ['Weekly', 'Fortnightly', 'Monthly'];

// ---------------------------------------------------------------------------
// 1. Attention to Detail (30s) — commercially meaningful differences only
// ---------------------------------------------------------------------------

function q1AttentionToDetail(rng: Rng): Question {
  const budget = rng.int(40, 150) * 1000;
  const markets = rng.sample(MARKETS, 3);
  const launch = randomDate(rng);
  const creators = rng.int(12, 48);
  const usage = rng.pick([3, 6, 12]);
  const reporting = rng.pick(REPORTING);

  const fields = ['budget', 'markets', 'launch', 'creators', 'usage', 'reporting'] as const;
  const diffCount = rng.pick([1, 2, 3]);
  const changed = new Set(rng.sample(fields, diffCount));

  const swapMarket = () => {
    const replaced = rng.int(0, 2);
    const other = rng.pick(MARKETS.filter((m) => !markets.includes(m)));
    return markets.map((m, i) => (i === replaced ? other : m));
  };
  const months = (n: number) => `${n} months`;

  const a: [string, string][] = [
    ['Budget', money(budget)],
    ['Markets', markets.join(', ')],
    ['Launch', dayMonth(launch)],
    ['Creators', String(creators)],
    ['Usage Rights', months(usage)],
    ['Reporting', reporting],
  ];
  const b: [string, string][] = [
    ['Budget', money(changed.has('budget') ? budget + rng.pick([-10000, -5000, 5000, 10000]) : budget)],
    ['Markets', (changed.has('markets') ? swapMarket() : markets).join(', ')],
    ['Launch', dayMonth(changed.has('launch') ? addDays(launch, rng.pick([-7, -2, 2, 7])) : launch)],
    ['Creators', String(changed.has('creators') ? creators + rng.pick([-6, -4, 4, 6]) : creators)],
    ['Usage Rights', months(changed.has('usage') ? rng.pick([3, 6, 12].filter((u) => u !== usage)) : usage)],
    ['Reporting', changed.has('reporting') ? rng.pick(REPORTING.filter((r) => r !== reporting)) : reporting],
  ];

  return single(rng, {
    templateId: 'AM-Q1-versions',
    category: 'attention_to_detail',
    timeLimitSeconds: AM_TIMES[0],
    blocks: [{ type: 'columns', records: [{ title: 'Version A', rows: a }, { title: 'Version B', rows: b }] }],
    prompt: 'How many differences are there?',
    options: [0, 1, 2, 3].map((n) => ({ text: String(n), correct: n === diffCount })),
  });
}

// ---------------------------------------------------------------------------
// 2. Commercial Accuracy (30s) — direction and size of the variance
// ---------------------------------------------------------------------------

function signed(n: number): string {
  if (n === 0) return '= £0';
  return `${n > 0 ? '+' : '−'} ${money(Math.abs(n))}`;
}

function q2CommercialAccuracy(rng: Rng): Question {
  const creator = rng.int(25000, 60000, 500);
  const paidMedia = rng.int(8000, 20000, 1000);
  const production = rng.int(2000, 8000, 500);
  const agency = rng.int(6000, 15000, 500);
  const total = creator + paidMedia + production + agency;

  const step = rng.pick([500, 1000, 1500, 2000]);
  const variance = rng.pick([step, -step, 0]); // total costs minus client budget
  const budget = total - variance;

  // Same amount both ways, exact match, and a decoy of a different size.
  const d = variance === 0 ? step : Math.abs(variance);
  const decoy = rng.pick([d * 2, d + 500, d === 500 ? 1000 : d - 500]) * (rng.chance(0.5) ? 1 : -1);
  const values = [d, -d, 0, decoy];

  return single(rng, {
    templateId: 'AM-Q2-variance',
    category: 'commercial_accuracy',
    timeLimitSeconds: AM_TIMES[1],
    blocks: [
      { type: 'record', rows: [['Client Budget', money(budget)]] },
      {
        type: 'record',
        rows: [
          ['Creator Costs', money(creator)],
          ['Paid Media', money(paidMedia)],
          ['Production', money(production)],
          ['Agency Fee', money(agency)],
        ],
      },
      { type: 'text', text: '+ means total costs are above the client budget. − means they are below it.' },
    ],
    prompt: 'What is the difference between the total costs shown and the client budget?',
    options: values.map((v) => ({ text: signed(v), correct: v === variance })),
    shuffle: true,
  });
}

// ---------------------------------------------------------------------------
// 3. Interpreting a Client Brief (25s) — exactly one requirement is narrowly missed
// ---------------------------------------------------------------------------

function q3ClientBrief(rng: Rng): Question {
  const budget = rng.int(60, 150) * 1000;
  const minCreators = rng.pick([20, 24, 30]);
  const minGermany = rng.pick([8, 10, 12]);
  const deadline = randomDate(rng);
  const minFollowing = rng.pick([25000, 50000, 100000]);
  const issue = rng.pick(['germany', 'tiktok', 'launch', 'total'] as const);

  // Every value sits close to its threshold, so nothing stands out at a glance. Exactly one
  // requirement is missed, by the smallest possible margin (one creator, one day).
  const total = issue === 'total' ? minCreators - 1 : minCreators + rng.int(0, 2);
  const germany = issue === 'germany' ? minGermany - 1 : minGermany + rng.int(0, 1);
  const uk = total - germany;
  const half = Math.ceil(total / 2); // smallest count that is at least 50%
  const tiktok = issue === 'tiktok' ? half - 1 : half + rng.int(0, 1);
  const instagram = total - tiktok;
  const launch = addDays(deadline, issue === 'launch' ? 1 : -rng.int(0, 2));

  return single(rng, {
    templateId: `AM-Q3-${issue}`,
    category: 'client_requirements',
    timeLimitSeconds: AM_TIMES[2],
    blocks: [
      {
        type: 'columns',
        records: [
          {
            title: 'Client Brief',
            rows: [
              ['Budget', money(budget)],
              ['Markets', 'UK and Germany'],
              ['Minimum Creators', String(minCreators)],
              ['Germany-Based Creators', `At least ${minGermany}`],
              ['TikTok Creators', 'At least 50%'],
              ['Launch Deadline', dayMonth(deadline)],
              ['Minimum Following', num(minFollowing)],
            ],
          },
          {
            title: 'Proposed Plan',
            rows: [
              ['Budget', money(budget)],
              ['Creators', String(total)],
              ['UK Creators', String(uk)],
              ['Germany Creators', String(germany)],
              ['TikTok Creators', `${tiktok} of ${total}`],
              ['Instagram Creators', String(instagram)],
              ['Launch', dayMonth(launch)],
              ['All Creators', `${num(minFollowing)}+ followers`],
            ],
          },
        ],
      },
    ],
    prompt: 'What needs to change before this plan meets the client’s requirements?',
    options: [
      { text: 'Increase the number of Germany-based creators', correct: issue === 'germany' },
      { text: 'Increase the number of TikTok creators', correct: issue === 'tiktok' },
      { text: 'Move the launch date earlier', correct: issue === 'launch' },
      { text: 'Increase the total number of creators', correct: issue === 'total' },
    ],
  });
}

// ---------------------------------------------------------------------------
// 4. Account Prioritisation (30s)
// ---------------------------------------------------------------------------

const INTRO = 'It is 10:00 AM. Four things need your attention.';

const PRIORITY_SCENARIOS: PriorityScenario[] = [
  {
    id: 'AM-Q4-rejected-claim',
    intro: INTRO,
    items: [
      ['A £200k existing client has emailed saying that live campaign content contains a claim their legal team has just rejected.', 3],
      ['A client renewal proposal worth £80k is due tomorrow afternoon.', 2],
      ['A client has asked for last month’s performance report by the end of today.', 2],
      ['A prospect has asked whether you can send the agency credentials deck today.', 1],
    ],
  },
  {
    id: 'AM-Q4-broken-link',
    intro: INTRO,
    items: [
      ['A key client’s live paid campaign is sending shoppers to an out-of-stock product page.', 3],
      ['An existing client wants a call today to discuss increasing next quarter’s budget.', 2],
      ['A quarterly business review deck is due to a client on Friday.', 2],
      ['A prospect has asked for two case studies by next week.', 1],
    ],
  },
  {
    id: 'AM-Q4-competitor-mention',
    intro: INTRO,
    items: [
      ['A client’s CMO has escalated that a creator’s live post mentions a competitor brand.', 3],
      ['A £60k contract renewal needs your sign-off by 3:00 PM today.', 2],
      ['A client has asked for copies of last month’s invoices by the end of the week.', 1],
      ['An existing client has asked for pricing for an additional campaign they want to launch next month.', 1],
    ],
  },
  {
    id: 'AM-Q4-missing-disclaimer',
    intro: INTRO,
    items: [
      ['An existing client reports that a live paid ad is running without a legally required disclaimer.', 3],
      ['A client’s monthly performance report is due by the end of today.', 2],
      ['A £50k upsell proposal for an existing client is due on Thursday.', 2],
      ['A prospect has asked for your rate card.', 1],
    ],
  },
];

function q4Prioritisation(rng: Rng): Question {
  return ranking(rng, rng.pick(PRIORITY_SCENARIOS), 'prioritisation', AM_TIMES[3]);
}

// ---------------------------------------------------------------------------
// 5. Commercial Reasoning (35s)
// ---------------------------------------------------------------------------

function q5CommercialReasoning(rng: Rng): Question {
  for (;;) {
    const budget = rng.int(60, 160) * 5000;
    const creator = rng.int(25, 60) * 1000;
    const paidMedia = rng.int(5, 25) * 1000;
    const other = rng.int(2, 8) * 1000;
    const remaining = budget - creator - paidMedia - other;
    const change = rng.pick([5000, 10000, 15000, 20000]);
    const up = rng.chance(0.3);
    const newBudget = up ? budget + change : budget - change;
    const after = remaining + (up ? change : -change);
    if (remaining < 10000 || after <= 0) continue;

    return single(rng, {
      templateId: up ? 'AM-Q5-budget-up' : 'AM-Q5-budget-down',
      category: 'commercial_reasoning',
      timeLimitSeconds: AM_TIMES[4],
      blocks: [
        { type: 'text', text: `A client has approved a ${money(budget)} campaign.` },
        {
          type: 'record',
          title: 'Current Planned Costs',
          rows: [
            ['Creator Costs', money(creator)],
            ['Paid Media', money(paidMedia)],
            ['Other Delivery Costs', money(other)],
          ],
        },
        {
          type: 'text',
          text: `The client now asks to ${up ? 'increase' : 'reduce'} the total campaign budget to ${money(newBudget)} but wants exactly the same scope. Assume the planned costs remain unchanged.`,
        },
      ],
      prompt: 'What happens to the amount remaining after campaign costs?',
      options: [
        { text: `It increases from ${money(remaining)} to ${money(remaining + change)}`, correct: up },
        { text: `It decreases from ${money(remaining)} to ${money(remaining - change)}`, correct: !up },
        { text: `It stays at ${money(remaining)}` },
        { text: 'There is not enough information' },
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// 6. Scope Change & Commercial Judgement (30s)
// ---------------------------------------------------------------------------

function q6ScopeChange(rng: Rng): Question {
  // The figures vary, but the logic never does: the uncontracted UK budget covers exactly
  // four UK creators, French creators cost a little less, so swapping the four slots fits.
  const ukCost = rng.pick([1500, 2000, 2500]);
  const frCost = ukCost - rng.pick([200, 250, 300]);
  const budget = rng.pick([40000, 50000, 60000]);
  const contracted = budget - 4 * ukCost;

  return single(rng, {
    templateId: 'AM-Q6-scope-change',
    category: 'client_judgement',
    timeLimitSeconds: AM_TIMES[5],
    blocks: [
      { type: 'text', text: 'The client asks to add France midway through a UK campaign without increasing the budget or moving the end date.' },
      {
        type: 'list',
        title: 'Current Position',
        items: [
          `Creator budget: ${money(budget)}`,
          `UK creators already contracted: ${money(contracted)}`,
          '4 additional UK creator slots were planned but have not yet been contracted',
          `Planned cost per remaining UK creator: ${money(ukCost)}`,
          `Typical cost per French creator: ${money(frCost)}`,
          'Client wants at least 4 French creators',
          'The client is open to reallocating creator slots between markets',
          'Campaign ends in 5 weeks',
        ],
      },
    ],
    prompt: 'Which option best meets the client’s request while staying within the existing creator budget?',
    options: [
      { text: 'Keep all 4 remaining UK creators and add 4 French creators.' },
      { text: 'Replace the 4 uncontracted UK creator slots with 4 French creators.', correct: true },
      { text: 'Add 2 French creators and keep 2 of the planned UK creators.' },
      { text: 'Renegotiate the fees of the UK creators who are already contracted.' },
    ],
    shuffle: true,
  });
}

// ---------------------------------------------------------------------------

export function generateAccountManager(seed: number): Question[] {
  const rng = new Rng(seed);
  return [
    q1AttentionToDetail(rng),
    q2CommercialAccuracy(rng),
    q3ClientBrief(rng),
    q4Prioritisation(rng),
    q5CommercialReasoning(rng),
    q6ScopeChange(rng),
  ];
}
