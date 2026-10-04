import { Rng } from '../random';
import type { Question } from '../types';
import { addDays, dayMonth, money, num, ranking, randomDate, single, type PriorityScenario } from './shared';

/*
 * Campaign Manager assessment: 6 timed questions, 160 seconds in total.
 *
 *   1. Attention to Detail       15s  two campaign records, count the differences (1–3)
 *   2. Financial Accuracy        30s  costs vs client budget: £x MORE / £x LESS / EQUAL
 *   3. Applying Requirements     30s  three creators vs five requirements: which one qualifies (or more than one)
 *   4. Prioritisation            30s  rank four items; weighted scoring
 *   5. Logical Reasoning         25s  campaign dependencies, one objectively correct answer
 *   6. Operational Judgement     30s  report figures don’t match the dashboard two hours before the deadline
 *
 * Every question is generated from a seeded RNG so candidates receive different
 * names, figures and scenarios, and the answer key is computed from those values.
 */

export const CM_VERSION = 'CM-2026.7';
export const CM_TIMES = [15, 30, 30, 30, 25, 30];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NAME_VARIANTS: [string, string][] = [
  ['Sophie Martin', 'Sofie Martin'],
  ['Hannah Clarke', 'Hanna Clarke'],
  ['Jordan Matthews', 'Jordan Mathews'],
  ['Chloe Davies', 'Chloe Davis'],
  ['Ellie Thompson', 'Ellie Thomson'],
  ['Priya Shah', 'Priya Shaw'],
  ['Grace Phillips', 'Grace Philips'],
  ['Zara Ahmed', 'Zara Ahmad'],
  ['Freya Robinson', 'Freya Robertson'],
  ['Omar Hussain', 'Omar Hussein'],
  ['Maya Stevens', 'Maya Stephens'],
  ['Liam O’Connor', 'Liam O’Conner'],
];

// ---------------------------------------------------------------------------
// 1. Attention to Detail (15s)
// ---------------------------------------------------------------------------

function q1AttentionToDetail(rng: Rng): Question {
  const [name, nameVariant] = rng.pick(NAME_VARIANTS);
  const fee = rng.int(1200, 4800, 50);
  const date = randomDate(rng);
  const usage = rng.pick([1, 3, 6, 12]);
  const videos = rng.int(1, 4);
  const platform = rng.pick(['TikTok', 'Instagram']);
  const paid = rng.pick(['Included', 'Not included']);

  const fields = ['name', 'fee', 'date', 'usage', 'deliverables', 'paid'] as const;
  const diffCount = rng.pick([1, 2, 3]);
  const changed = new Set(rng.sample(fields, diffCount));

  // Small but meaningful changes that need careful checking.
  const transposedFee = (() => {
    const s = String(fee).split('');
    for (const i of rng.shuffle([0, 1, 2].filter((i) => i + 1 < s.length))) {
      if (s[i] !== s[i + 1] && !(i === 0 && s[i + 1] === '0')) {
        [s[i], s[i + 1]] = [s[i + 1], s[i]];
        return Number(s.join(''));
      }
    }
    return fee + 100;
  })();
  const otherUsage = rng.pick([1, 3, 6, 12].filter((u) => u !== usage));
  const deliverables = (n: number) => `${n} ${platform} video${n === 1 ? '' : 's'}`;
  const months = (n: number) => `${n} month${n === 1 ? '' : 's'}`;

  const a: [string, string][] = [
    ['Creator', name],
    ['Fee', money(fee)],
    ['Posting Date', dayMonth(date)],
    ['Usage Rights', months(usage)],
    ['Deliverables', deliverables(videos)],
    ['Paid Usage', paid],
  ];
  const b: [string, string][] = [
    ['Creator', changed.has('name') ? nameVariant : name],
    ['Fee', money(changed.has('fee') ? transposedFee : fee)],
    ['Posting Date', dayMonth(changed.has('date') ? addDays(date, rng.pick([-1, 1, 10])) : date)],
    ['Usage Rights', months(changed.has('usage') ? otherUsage : usage)],
    ['Deliverables', deliverables(changed.has('deliverables') ? (videos === 1 ? 2 : videos - 1) : videos)],
    ['Paid Usage', changed.has('paid') ? (paid === 'Included' ? 'Not included' : 'Included') : paid],
  ];

  return single(rng, {
    templateId: 'Q1-records',
    category: 'attention_to_detail',
    timeLimitSeconds: CM_TIMES[0],
    blocks: [{ type: 'columns', records: [{ title: 'Record A', rows: a }, { title: 'Record B', rows: b }] }],
    prompt: 'How many differences are there between the two records?',
    options: [0, 1, 2, 3].map((n) => ({ text: String(n), correct: n === diffCount })),
  });
}

// ---------------------------------------------------------------------------
// 2. Financial Accuracy (30s)
// ---------------------------------------------------------------------------

function q2FinancialAccuracy(rng: Rng): Question {
  const creator = rng.int(20000, 35000, 250);
  const paidMedia = rng.int(6000, 12000, 500);
  const production = rng.int(2000, 5000, 250);
  const other = rng.int(4000, 9000, 500);
  const total = creator + paidMedia + production + other;

  const outcome = rng.pick(['MORE', 'LESS', 'EQUAL'] as const);
  const delta = rng.pick([250, 500, 750, 1000]);
  // MORE = costs exceed the budget, so the approved budget is lower than the total.
  const budget = outcome === 'EQUAL' ? total : outcome === 'MORE' ? total - delta : total + delta;

  return single(rng, {
    templateId: 'Q2-budget',
    category: 'financial_accuracy',
    timeLimitSeconds: CM_TIMES[1],
    blocks: [
      { type: 'record', rows: [['Client Budget', money(budget)]] },
      {
        type: 'record',
        rows: [
          ['Creator Costs', money(creator)],
          ['Paid Media', money(paidMedia)],
          ['Production / Fulfilment Costs', money(production)],
          ['Other Campaign Costs', money(other)],
        ],
      },
    ],
    prompt: 'How do the total campaign costs compare with the client budget?',
    layout: 'bar',
    // Fixed order: £x MORE, £x LESS, EQUAL. When the outcome is EQUAL, x is still a
    // plausible difference, so the options look the same.
    options: [
      { text: `${money(delta)} MORE`, correct: outcome === 'MORE' },
      { text: `${money(delta)} LESS`, correct: outcome === 'LESS' },
      { text: 'EQUAL', correct: outcome === 'EQUAL' },
    ],
  });
}

// ---------------------------------------------------------------------------
// 3. Applying Campaign Requirements (30s) — three creators, which one qualifies
// ---------------------------------------------------------------------------

type Criterion = 'followers' | 'engagement' | 'fee' | 'location' | 'ukAudience';
const CRITERIA: Criterion[] = ['followers', 'engagement', 'fee', 'location', 'ukAudience'];

/** A value that meets the requirement, sometimes exactly on the threshold. */
function passing(rng: Rng, c: Criterion): string {
  const edge = rng.chance(0.2);
  switch (c) {
    case 'followers': return num(edge ? 50000 : rng.int(52, 160) * 1000);
    case 'engagement': return `${(edge ? 3 : rng.int(31, 52) / 10).toFixed(1)}%`;
    case 'fee': return money(edge ? 1500 : rng.int(18, 29) * 50);
    case 'location': return 'UK';
    case 'ukAudience': return `${edge ? 45 : rng.int(46, 68)}%`;
  }
}

/** A value that just misses the requirement. */
function failing(rng: Rng, c: Criterion): string {
  switch (c) {
    case 'followers': return num(rng.int(40, 49) * 1000);
    case 'engagement': return `${(rng.int(24, 29) / 10).toFixed(1)}%`;
    case 'fee': return money(rng.int(31, 36) * 50);
    case 'location': return rng.pick(['Ireland', 'France', 'Spain', 'Netherlands']);
    case 'ukAudience': return `${rng.int(38, 44)}%`;
  }
}

function q3Requirements(rng: Rng): Question {
  // Usually exactly one creator qualifies; about a quarter of the time two do.
  const qualifying = rng.chance(0.25) ? 2 : 1;
  const passes = rng.shuffle([0, 1, 2]).slice(0, qualifying);
  // Each creator who doesn't qualify misses a different requirement, by a small margin.
  const misses = rng.shuffle([...CRITERIA]);
  const creators = [0, 1, 2].map((i) => {
    const miss = passes.includes(i) ? null : misses.pop()!;
    return Object.fromEntries(CRITERIA.map((c) => [c, c === miss ? failing(rng, c) : passing(rng, c)])) as Record<Criterion, string>;
  });
  const row = (label: string, c: Criterion) => [label, ...creators.map((cr) => cr[c])];

  return single(rng, {
    templateId: 'Q3-three-creators',
    category: 'following_requirements',
    timeLimitSeconds: CM_TIMES[2],
    blocks: [
      {
        type: 'list',
        title: 'Campaign Requirements',
        items: ['50,000+ followers', 'Engagement rate ≥ 3%', 'Fee ≤ £1,500', 'UK based', 'UK audience ≥ 45%'],
      },
      {
        type: 'table',
        columns: ['Creator A', 'Creator B', 'Creator C'],
        rows: [
          row('Followers', 'followers'),
          row('Engagement', 'engagement'),
          row('Fee', 'fee'),
          row('Location', 'location'),
          row('UK Audience', 'ukAudience'),
        ],
      },
    ],
    prompt: 'Which creator meets all campaign requirements?',
    options: [
      { text: 'Creator A', correct: qualifying === 1 && passes[0] === 0 },
      { text: 'Creator B', correct: qualifying === 1 && passes[0] === 1 },
      { text: 'Creator C', correct: qualifying === 1 && passes[0] === 2 },
      { text: 'More than one creator', correct: qualifying > 1 },
    ],
  });
}

// ---------------------------------------------------------------------------
// 4. Prioritisation (30s) — drag to rank, weighted scoring
// ---------------------------------------------------------------------------

const INTRO = 'It is 10:00 AM and you have four things requiring attention.';

const PRIORITY_SCENARIOS: PriorityScenario[] = [
  {
    intro: INTRO,
    id: 'Q4-prohibited-claim',
    items: [
      ['A creator video that is already live contains a factual claim the client explicitly prohibited.', 3],
      ['A creator is waiting to know whether their draft has been approved.', 2],
      ['Your manager needs an internal campaign update by 4:00 PM.', 2],
      ['A creator has asked when their invoice will be paid.', 1],
    ],
  },
  {
    intro: INTRO,
    id: 'Q4-missing-disclosure',
    items: [
      ['A live sponsored post is missing the required #ad disclosure and the client has flagged it.', 3],
      ['Finance needs this month’s creator invoices by the end of the day.', 2],
      ['A creator wants to confirm the brief for a shoot next week.', 1],
      ['A colleague has asked you to review a case study when you have time.', 1],
    ],
  },
  {
    intro: INTRO,
    id: 'Q4-wrong-tag',
    items: [
      ['The client reports that a live campaign video tags their competitor instead of their brand.', 3],
      ['A creator cannot start filming until you confirm which product to feature.', 2],
      ['Your manager wants the weekly campaign report by 5:00 PM.', 2],
      ['A creator has asked for feedback on their media kit.', 1],
    ],
  },
  {
    intro: INTRO,
    id: 'Q4-expired-code',
    items: [
      ['A live creator post is promoting an expired discount code and customers are complaining to the client.', 3],
      ['The client wants the shortlist for next month’s campaign by tomorrow morning.', 2],
      ['A creator has asked whether you received their bank details.', 1],
      ['A colleague has asked you to update the shared campaign tracker.', 1],
    ],
  },
];

function q4Prioritisation(rng: Rng): Question {
  return ranking(rng, rng.pick(PRIORITY_SCENARIOS), 'prioritisation', CM_TIMES[3]);
}

// ---------------------------------------------------------------------------
// 5. Logical Reasoning (25s)
// ---------------------------------------------------------------------------

function q5Logic(rng: Rng): Question {
  const letter = rng.pick(['X', 'Y', 'Z', 'K', 'M', 'P', 'R']);
  const variants: { id: string; rules: string[]; correct: string; wrong: string[] }[] = [
    {
      id: 'Q5-approval-paid',
      rules: [
        'Every creator requires client approval before publishing.',
        'Paid media cannot begin until the creator’s content is live.',
        `Campaign ${letter} requires paid media.`,
        `Campaign ${letter}’s creator has not yet received client approval.`,
      ],
      correct: 'Client approval must happen before the creator publishes, and the creator must publish before paid media can begin.',
      wrong: ['Paid media can begin immediately.', 'The creator can publish while approval is pending.'],
    },
    {
      id: 'Q5-sow-booking',
      rules: [
        'A creator cannot be booked until the client signs the statement of work.',
        'Content cannot be filmed until the creator is booked.',
        `Campaign ${letter}’s client has not yet signed the statement of work.`,
      ],
      correct: `Content for Campaign ${letter} cannot be filmed yet.`,
      wrong: [`The creator for Campaign ${letter} can be booked now.`, 'Filming can start while the statement of work is being signed.'],
    },
    {
      id: 'Q5-legal-review',
      rules: [
        'Every video must pass legal review before it is sent to the client.',
        'The client must approve a video before it is posted.',
        `Video ${letter} has not passed legal review.`,
      ],
      correct: `Video ${letter} cannot be posted yet.`,
      wrong: [`Video ${letter} can be sent to the client now.`, `Video ${letter} can be posted today if the client approves it.`],
    },
    {
      id: 'Q5-contract-boost',
      rules: [
        'A post can only go live after the creator signs their contract.',
        'Paid boosting can only start after a post has gone live.',
        `The creator for Campaign ${letter} has not signed their contract.`,
      ],
      correct: `Paid boosting for Campaign ${letter} cannot start yet.`,
      wrong: [`Campaign ${letter}’s post can go live today.`, 'Paid boosting can start now if the client agrees.'],
    },
  ];
  const v = rng.pick(variants);
  return single(rng, {
    templateId: v.id,
    category: 'logical_reasoning',
    timeLimitSeconds: CM_TIMES[4],
    blocks: [{ type: 'list', title: 'Campaign Rules', items: v.rules }],
    prompt: 'Which statement must be true?',
    options: [{ text: v.correct, correct: true }, ...v.wrong.map((text) => ({ text })), { text: 'There is not enough information.' }],
    shuffle: true,
    keepLast: true,
  });
}

// ---------------------------------------------------------------------------
// 6. Operational Judgement (30s)
// ---------------------------------------------------------------------------

function q6Judgement(rng: Rng): Question {
  return single(rng, {
    templateId: 'Q6-report-mismatch',
    category: 'operational_judgement',
    timeLimitSeconds: CM_TIMES[5],
    blocks: [
      {
        type: 'list',
        title: 'Scenario',
        items: [
          'The client expects a performance report at 3:00 PM today.',
          'At 1:00 PM, you notice that the views in your report do not match the platform dashboard.',
          'Your manager is in meetings all afternoon.',
        ],
      },
    ],
    prompt: 'What is the best next step?',
    options: [
      { text: 'Wait until your manager is free before taking any action.' },
      { text: 'Send the report at 3:00 PM using the figures currently available so the deadline is not missed.' },
      {
        text: 'Check the source data, correct the report, and immediately flag the discrepancy and any revised timing to the Account Manager so the client can be updated with verified information.',
        correct: true,
      },
      { text: 'Contact the client directly, explain that the report is wrong, and ask them to wait for a corrected version.' },
    ],
    shuffle: true,
  });
}

// ---------------------------------------------------------------------------

export function generateCampaignManager(seed: number): Question[] {
  const rng = new Rng(seed);
  return [q1AttentionToDetail(rng), q2FinancialAccuracy(rng), q3Requirements(rng), q4Prioritisation(rng), q5Logic(rng), q6Judgement(rng)];
}
