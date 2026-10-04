import { Rng } from './random';
import type { Category, Option, Question } from './types';

/*
 * Campaign Manager assessment: 6 timed questions, 145 seconds in total.
 *
 *   1. Attention to Detail       15s  two campaign records, count the differences (1–3)
 *   2. Financial Accuracy        25s  costs vs approved budget: MORE / LESS / EQUAL
 *   3. Following Requirements    20s  apply creator rules: APPROVE / REJECT / NEEDS REVIEW
 *   4. Prioritisation            30s  rank four items; weighted scoring
 *   5. Logical Reasoning         25s  campaign dependencies, one objectively correct answer
 *   6. Operational Judgement     30s  realistic situation, one clearly preferable response
 *
 * Every question is generated from a seeded RNG so candidates receive different
 * names, figures and scenarios, and the answer key is computed from those values.
 */

export const ASSESSMENT_VERSION = 'CM-2026.2';
export const QUESTION_TIMES = [15, 25, 20, 30, 25, 30];

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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function money(n: number): string {
  return '£' + n.toLocaleString('en-GB');
}

function num(n: number): string {
  return n.toLocaleString('en-GB');
}

function dayMonth(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

function randomDate(rng: Rng): Date {
  return addDays(new Date(Date.UTC(2026, 8, 1)), rng.int(0, 90));
}

function ids(rng: Rng, n: number): string[] {
  const out = new Set<string>();
  while (out.size < n) out.add(Math.floor(rng.next() * 0xffffff).toString(36).padStart(5, '0'));
  return [...out];
}

interface Draft {
  templateId: string;
  category: Category;
  timeLimitSeconds: number;
  blocks: Question['blocks'];
  prompt: string;
  options: { text: string; correct?: boolean }[];
  /** Shuffle the options. Leave false where a fixed order reads naturally (0–3, MORE/LESS/EQUAL). */
  shuffle?: boolean;
  /** With shuffle: keep the last option last (e.g. "There is not enough information"). */
  keepLast?: boolean;
}

function single(rng: Rng, d: Draft): Question {
  const optionIds = ids(rng, d.options.length);
  let opts = d.options.map((o, i) => ({ ...o, id: optionIds[i] }));
  if (d.shuffle) {
    opts = d.keepLast ? [...rng.shuffle(opts.slice(0, -1)), opts[opts.length - 1]] : rng.shuffle(opts);
  }
  const correct = opts.filter((o) => o.correct).map((o) => o.id);
  if (correct.length !== 1) throw new Error(`${d.templateId}: expected exactly one correct option`);
  if (new Set(opts.map((o) => o.text)).size !== opts.length) throw new Error(`${d.templateId}: duplicate options`);
  return {
    templateId: d.templateId,
    category: d.category,
    timeLimitSeconds: d.timeLimitSeconds,
    blocks: d.blocks,
    prompt: d.prompt,
    kind: 'single',
    options: opts.map(({ id, text }) => ({ id, text })),
    correct,
  };
}

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
    timeLimitSeconds: QUESTION_TIMES[0],
    blocks: [{ type: 'columns', records: [{ title: 'Record A', rows: a }, { title: 'Record B', rows: b }] }],
    prompt: 'How many differences are there between the two records?',
    options: [0, 1, 2, 3].map((n) => ({ text: String(n), correct: n === diffCount })),
  });
}

// ---------------------------------------------------------------------------
// 2. Financial Accuracy (25s)
// ---------------------------------------------------------------------------

function q2FinancialAccuracy(rng: Rng): Question {
  const creator = rng.int(15000, 30000, 250);
  const paidMedia = rng.int(4000, 10000, 500);
  const production = rng.int(1000, 4000, 250);
  const agency = rng.int(3000, 7000, 500);
  const total = creator + paidMedia + production + agency;

  const outcome = rng.pick(['MORE', 'LESS', 'EQUAL'] as const);
  const delta = rng.pick([250, 500, 750, 1000]);
  // MORE = costs exceed the budget, so the approved budget is lower than the total.
  const budget = outcome === 'EQUAL' ? total : outcome === 'MORE' ? total - delta : total + delta;

  return single(rng, {
    templateId: 'Q2-budget',
    category: 'financial_accuracy',
    timeLimitSeconds: QUESTION_TIMES[1],
    blocks: [
      { type: 'record', rows: [['Client Budget', money(budget)]] },
      {
        type: 'record',
        rows: [
          ['Creator Costs', money(creator)],
          ['Paid Media', money(paidMedia)],
          ['Production Costs', money(production)],
          ['Agency Fee', money(agency)],
        ],
      },
    ],
    prompt: 'Compared with the approved client budget, the total campaign costs are:',
    options: [
      { text: 'MORE than the approved budget', correct: outcome === 'MORE' },
      { text: 'LESS than the approved budget', correct: outcome === 'LESS' },
      { text: 'EQUAL to the approved budget', correct: outcome === 'EQUAL' },
    ],
  });
}

// ---------------------------------------------------------------------------
// 3. Following Campaign Requirements (20s)
// ---------------------------------------------------------------------------

function q3Requirements(rng: Rng): Question {
  const outcome = rng.pick(['APPROVE', 'REJECT', 'NEEDS REVIEW'] as const);
  const boundary = () => rng.chance(0.25);

  const shown: Record<'followers' | 'engagement' | 'fee' | 'location' | 'ukAudience', string> = {
    followers: num(boundary() ? 25000 : rng.int(26, 140) * 1000),
    engagement: `${(boundary() ? 2.5 : rng.int(26, 62) / 10).toFixed(1)}%`,
    fee: money(boundary() ? 1500 : rng.int(10, 29) * 50),
    location: 'UK',
    ukAudience: `${boundary() ? 40 : rng.int(42, 85)}%`,
  };
  const keys = Object.keys(shown) as (keyof typeof shown)[];

  if (outcome === 'REJECT') {
    // Fails exactly one criterion, by a small margin.
    const k = rng.pick(keys);
    if (k === 'followers') shown.followers = num(25000 - rng.int(2, 9) * 100);
    if (k === 'engagement') shown.engagement = `${(2.5 - rng.int(1, 3) / 10).toFixed(1)}%`;
    if (k === 'fee') shown.fee = money(1500 + rng.int(1, 4) * 25);
    if (k === 'location') shown.location = rng.pick(['Ireland', 'France', 'Spain', 'Netherlands']);
    if (k === 'ukAudience') shown.ukAudience = `${rng.int(34, 39)}%`;
  } else if (outcome === 'NEEDS REVIEW') {
    shown[rng.pick(keys)] = 'Not provided';
  }

  return single(rng, {
    templateId: 'Q3-requirements',
    category: 'following_requirements',
    timeLimitSeconds: QUESTION_TIMES[2],
    blocks: [
      {
        type: 'list',
        title: 'Campaign Requirements',
        items: [
          'Minimum 25,000 followers',
          'Engagement rate of at least 2.5%',
          'Creator fee no higher than £1,500',
          'Creator must be UK based',
          'UK audience must be at least 40%',
          'If any required information is missing, select NEEDS REVIEW',
        ],
      },
      {
        type: 'record',
        title: 'Creator',
        rows: [
          ['Followers', shown.followers],
          ['Engagement Rate', shown.engagement],
          ['Fee', shown.fee],
          ['Location', shown.location],
          ['UK Audience', shown.ukAudience],
        ],
      },
    ],
    prompt: 'What should happen with this creator?',
    options: [
      { text: 'APPROVE', correct: outcome === 'APPROVE' },
      { text: 'REJECT', correct: outcome === 'REJECT' },
      { text: 'NEEDS REVIEW', correct: outcome === 'NEEDS REVIEW' },
    ],
  });
}

// ---------------------------------------------------------------------------
// 4. Prioritisation (30s) — drag to rank, weighted scoring
// ---------------------------------------------------------------------------

/** Each scenario: one clearly high-risk item (urgency 3) plus three others. */
const PRIORITY_SCENARIOS: { id: string; items: [string, number][] }[] = [
  {
    id: 'Q4-prohibited-claim',
    items: [
      ['A creator video that is already live contains a factual claim the client explicitly prohibited.', 3],
      ['A creator is waiting to know whether their draft has been approved.', 2],
      ['Your manager needs an internal campaign update by 4:00 PM.', 2],
      ['A creator has asked when their invoice will be paid.', 1],
    ],
  },
  {
    id: 'Q4-missing-disclosure',
    items: [
      ['A live sponsored post is missing the required #ad disclosure and the client has flagged it.', 3],
      ['Finance needs this month’s creator invoices by the end of the day.', 2],
      ['A creator wants to confirm the brief for a shoot next week.', 1],
      ['A colleague has asked you to review a case study when you have time.', 1],
    ],
  },
  {
    id: 'Q4-wrong-tag',
    items: [
      ['The client reports that a live campaign video tags their competitor instead of their brand.', 3],
      ['A creator cannot start filming until you confirm which product to feature.', 2],
      ['Your manager wants the weekly campaign report by 5:00 PM.', 2],
      ['A creator has asked for feedback on their media kit.', 1],
    ],
  },
  {
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
  const scenario = rng.pick(PRIORITY_SCENARIOS);
  const itemIds = ids(rng, scenario.items.length);
  const items: (Option & { urgency: number })[] = scenario.items.map(([text, urgency], i) => ({ id: itemIds[i], text, urgency }));
  const ideal = [...items].sort((a, b) => b.urgency - a.urgency).map((i) => i.id);

  return {
    templateId: scenario.id,
    category: 'prioritisation',
    timeLimitSeconds: QUESTION_TIMES[3],
    blocks: [{ type: 'text', text: 'It is 10:00 AM and you have four things requiring attention.' }],
    prompt: 'Arrange the four items from highest priority to lowest priority.',
    kind: 'ranking',
    // Display order is randomised before the candidate starts.
    options: rng.shuffle(items).map(({ id, text }) => ({ id, text })),
    correct: ideal,
    ranking: { critical: ideal[0], urgency: Object.fromEntries(items.map((i) => [i.id, i.urgency])) },
  };
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
    timeLimitSeconds: QUESTION_TIMES[4],
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
  const hours = rng.int(5, 7);
  const days = rng.int(3, 5);
  const variants: { id: string; situation: string[]; correct: string; wrong: string[] }[] = [
    {
      id: 'Q6-missed-post',
      situation: [
        'A creator was due to post yesterday.',
        'They have not posted.',
        `You followed up this morning and have received no response for ${hours} hours.`,
        'The client has not raised the issue yet.',
        `The final campaign deadline is ${days} days away.`,
      ],
      correct: 'Follow up again, use another agreed contact method if available, establish a revised posting time and flag the risk internally.',
      wrong: [
        'Wait until the final campaign deadline because there is still time.',
        'Immediately tell the client that the creator has failed the campaign.',
        'Immediately terminate the creator and replace them.',
      ],
    },
    {
      id: 'Q6-report-mismatch',
      situation: [
        'The client expects a performance report at 3:00 PM today.',
        'At 1:00 PM you notice the views in your report do not match the platform dashboard.',
        'Your manager is in meetings all afternoon.',
      ],
      correct: 'Check the source data, correct the report, and let the client know it will arrive with verified figures if there is a short delay.',
      wrong: [
        'Send the report on time with the figures you have.',
        'Ask the client to check the platform dashboard themselves.',
        'Wait until your manager is free before doing anything.',
      ],
    },
    {
      id: 'Q6-missing-message',
      situation: [
        'A creator’s draft is strong but is missing a mandatory brand message.',
        `Posting is due in ${rng.int(2, 3)} days.`,
        'The client must approve the draft before it is posted.',
      ],
      correct: 'Ask the creator for a quick edit that adds the brand message, then send the draft for client approval.',
      wrong: [
        'Send the draft to the client as it is.',
        'Add the message yourself as on-screen text without telling anyone.',
        'Replace the creator immediately.',
      ],
    },
    {
      id: 'Q6-scope-creep',
      situation: [
        'On a call, the client asks for two extra creator posts.',
        'They do not want to change the budget.',
        'Creator fees are already agreed.',
      ],
      correct: 'Acknowledge the request, check creator availability and cost, and come back with options and the budget impact.',
      wrong: [
        'Agree immediately to keep the client happy.',
        'Refuse outright because it is not in the contract.',
        'Ask the creators to make the extra posts for free.',
      ],
    },
  ];
  const v = rng.pick(variants);
  return single(rng, {
    templateId: v.id,
    category: 'operational_judgement',
    timeLimitSeconds: QUESTION_TIMES[5],
    blocks: [{ type: 'list', items: v.situation }],
    prompt: 'What is the best next step?',
    options: [{ text: v.correct, correct: true }, ...v.wrong.map((text) => ({ text }))],
    shuffle: true,
  });
}

// ---------------------------------------------------------------------------

export function generateAssessment(seed: number): Question[] {
  const rng = new Rng(seed);
  return [q1AttentionToDetail(rng), q2FinancialAccuracy(rng), q3Requirements(rng), q4Prioritisation(rng), q5Logic(rng), q6Judgement(rng)];
}

export function newSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}
