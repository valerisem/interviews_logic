import { Rng } from './random';
import type { Block, Category, Question } from './types';

/*
 * Question bank for the Campaign Manager assessment.
 *
 * Every template is a generator: names, budgets, dates and other variables are
 * drawn from a seeded RNG, so each candidate receives different values, and the
 * correct answer is computed from those values. Options are shuffled per
 * candidate and given random ids so their order and ids reveal nothing.
 *
 * Assessment mix (12 questions):
 *   3 Attention to Detail     (3 of 5 templates)
 *   2 Following Instructions  (2 rule-set questions with different outcomes)
 *   2 Prioritisation          (2 of 5 scenarios)
 *   2 Numerical Reasoning     (2 of 5 templates)
 *   2 Logical Reasoning       (2 of 7 templates)
 *   1 Operational Judgement   (1 of 4 scenarios)
 */

export const ASSESSMENT_VERSION = 'CM-2026.1';

// ---------------------------------------------------------------------------
// Shared data and helpers
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Sophie', 'Amy', 'Mia', 'Hannah', 'Jordan', 'Chloe', 'Ellie', 'Liam', 'Priya', 'Noah',
  'Aisha', 'Tom', 'Grace', 'Leo', 'Zara', 'Ruby', 'Omar', 'Freya', 'Jack', 'Maya',
  'Isla', 'Ben', 'Nina', 'Sam', 'Lola', 'Kai', 'Ava', 'Theo', 'Layla', 'Finn',
];

/** Creator names paired with a near-identical variant, for spot-the-difference questions. */
const NAME_VARIANTS: [string, string][] = [
  ['Sophie Martin', 'Sofie Martin'],
  ['Hannah Clarke', 'Hanna Clarke'],
  ['Jordan Matthews', 'Jordan Mathews'],
  ['Chloe Davies', 'Chloe Davis'],
  ['Ellie Thompson', 'Ellie Thomson'],
  ['Liam O’Connor', 'Liam O’Conner'],
  ['Priya Shah', 'Priya Shaw'],
  ['Grace Phillips', 'Grace Philips'],
  ['Zara Ahmed', 'Zara Ahmad'],
  ['Freya Robinson', 'Freya Robertson'],
  ['Omar Hussain', 'Omar Hussein'],
  ['Maya Stevens', 'Maya Stephens'],
];

const CLIENTS = [
  'Nova Beauty', 'Peak Fitness', 'Bloom Skincare', 'Urban Eats', 'Lumen Tech', 'Harbour Coffee',
  'Velvet Home', 'Spark Energy', 'Fable Books', 'Cobalt Travel', 'Willow Pets', 'Orbit Gaming',
];

const COMPETITORS = ['Glow Labs', 'Pulse Drinks', 'Halo Cosmetics', 'Rally Sports', 'Ember Foods'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const LOCATIONS_NOT_UK = ['Spain', 'France', 'Germany', 'USA', 'Ireland', 'Netherlands'];

function money(n: number, decimals = 0): string {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function num(n: number): string {
  return n.toLocaleString('en-GB');
}

function dayMonth(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function weekdayDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** A random date in Sep–Nov 2026 (UTC). */
function randomDate(rng: Rng): Date {
  return addDays(new Date(Date.UTC(2026, 8, 1)), rng.int(0, 80));
}

function time(h: number, m = 0): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function creatorName(rng: Rng, avoid: string[] = []): string {
  const pool = FIRST_NAMES.filter((n) => !avoid.includes(n));
  return rng.pick(pool);
}

function campaignLetter(rng: Rng): string {
  return rng.pick(['A', 'B', 'D', 'F', 'K', 'M', 'P', 'Q', 'R', 'T', 'X', 'Y', 'Z']);
}

function optionId(rng: Rng): string {
  return Math.floor(rng.next() * 0xffffff).toString(36).padStart(5, '0');
}

interface DraftOption {
  text: string;
  correct?: boolean;
}

interface Draft {
  templateId: string;
  category: Category;
  blocks: Block[];
  prompt: string;
  options: DraftOption[];
  kind?: 'single' | 'multi';
  selectCount?: number;
}

function build(rng: Rng, d: Draft): Question {
  const used = new Set<string>();
  const withIds = d.options.map((o) => {
    let id = optionId(rng);
    while (used.has(id)) id = optionId(rng);
    used.add(id);
    return { ...o, id };
  });
  const shuffled = rng.shuffle(withIds);
  const correct = shuffled.filter((o) => o.correct).map((o) => o.id);
  const kind = d.kind ?? 'single';
  if (kind === 'single' && correct.length !== 1) throw new Error(`${d.templateId}: expected 1 correct option`);
  if (kind === 'multi' && correct.length !== d.selectCount) throw new Error(`${d.templateId}: correct count mismatch`);
  if (new Set(d.options.map((o) => o.text)).size !== d.options.length) throw new Error(`${d.templateId}: duplicate options`);
  return {
    templateId: d.templateId,
    category: d.category,
    blocks: d.blocks,
    prompt: d.prompt,
    kind,
    ...(kind === 'multi' ? { selectCount: d.selectCount } : {}),
    options: shuffled.map(({ id, text }) => ({ id, text })),
    correct,
  };
}

/** Distinct numeric distractors around a correct value. */
function distractors(rng: Rng, correct: number, candidates: number[], n: number, valid: (v: number) => boolean = (v) => v > 0): number[] {
  const seen = new Set<number>([correct]);
  const out: number[] = [];
  for (const c of rng.shuffle(candidates)) {
    if (out.length === n) break;
    if (!seen.has(c) && valid(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  if (out.length < n) throw new Error('Not enough distractors');
  return out;
}

// ---------------------------------------------------------------------------
// Attention to Detail
// ---------------------------------------------------------------------------

/** Two versions of a creator booking; count the differences (0–3). */
function adVersionDifferences(rng: Rng): Question {
  const [name, nameVariant] = rng.pick(NAME_VARIANTS);
  const fee = rng.int(1200, 4800, 50);
  const date = randomDate(rng);
  const usage = rng.pick([1, 3, 6, 12]);
  const platform = rng.pick(['TikTok', 'Instagram Reels', 'YouTube Shorts']);
  const videos = rng.int(1, 4);

  const fields = ['name', 'fee', 'date', 'usage', 'platform', 'deliverables'] as const;
  const diffCount = rng.pick([0, 1, 1, 2, 2, 2, 3, 3]);
  const changed = new Set(rng.sample(fields, diffCount));

  const swappedFee = (() => {
    // Transpose two adjacent digits that differ, e.g. 2,850 → 2,580.
    const s = String(fee).split('');
    for (const i of rng.shuffle([0, 1, 2].filter((i) => i + 1 < s.length))) {
      if (s[i] !== s[i + 1] && !(i === 0 && s[i + 1] === '0')) {
        [s[i], s[i + 1]] = [s[i + 1], s[i]];
        return Number(s.join(''));
      }
    }
    return fee + 100;
  })();

  const otherPlatform = rng.pick(['TikTok', 'Instagram Reels', 'YouTube Shorts'].filter((p) => p !== platform));
  const otherUsage = rng.pick([1, 3, 6, 12].filter((u) => u !== usage));

  const plural = (n: number) => `${n} video${n === 1 ? '' : 's'}`;
  const months = (n: number) => `${n} month${n === 1 ? '' : 's'}`;

  const a: [string, string][] = [
    ['Creator', name],
    ['Fee', money(fee)],
    ['Posting date', dayMonth(date)],
    ['Usage rights', months(usage)],
    ['Platform', platform],
    ['Deliverables', plural(videos)],
  ];
  const b: [string, string][] = [
    ['Creator', changed.has('name') ? nameVariant : name],
    ['Fee', money(changed.has('fee') ? swappedFee : fee)],
    ['Posting date', dayMonth(changed.has('date') ? addDays(date, rng.pick([-1, 1, 10])) : date)],
    ['Usage rights', months(changed.has('usage') ? otherUsage : usage)],
    ['Platform', changed.has('platform') ? otherPlatform : platform],
    ['Deliverables', plural(changed.has('deliverables') ? (videos === 1 ? 2 : videos - 1) : videos)],
  ];

  return build(rng, {
    templateId: 'AD-versions',
    category: 'attention_to_detail',
    blocks: [{ type: 'columns', records: [{ title: 'Version A', rows: a }, { title: 'Version B', rows: b }] }],
    prompt: 'How many differences are there between Version A and Version B?',
    options: [0, 1, 2, 3].map((n) => ({ text: String(n), correct: n === diffCount })),
  });
}

/** Do the cost lines reconcile with the approved budget? */
function adBudgetReconcile(rng: Rng): Question {
  const creator = rng.int(6000, 24000, 25);
  const paid = rng.int(1500, 9000, 250);
  const agency = rng.int(800, 3500, 25);
  const total = creator + paid + agency;
  const reconciles = rng.chance(0.5);
  const approved = reconciles ? total : total + rng.pick([-1000, -500, -250, -90, 90, 250, 500, 1000]);

  return build(rng, {
    templateId: 'AD-reconcile',
    category: 'attention_to_detail',
    blocks: [
      {
        type: 'record',
        rows: [
          ['Client approved budget', money(approved)],
          ['Creator costs', money(creator)],
          ['Paid media budget', money(paid)],
          ['Agency fee', money(agency)],
        ],
      },
    ],
    prompt: 'Does the total reconcile with the approved budget?',
    options: [
      { text: 'Yes', correct: reconciles },
      { text: 'No', correct: !reconciles },
    ],
  });
}

/** A campaign record containing exactly two errors; pick both. */
function adCampaignRecordErrors(rng: Rng): Question {
  const errorTypes = ['total', 'approval', 'endDate', 'creatorMaths'] as const;
  const errors = new Set(rng.sample(errorTypes, 2));

  // Build a consistent campaign first.
  let budget = 0, creatorCount = 0, feePer = 0, creatorBudget = 0, paid = 0, agency = 0;
  for (;;) {
    creatorCount = rng.int(3, 8);
    feePer = rng.int(1500, 5000, 250);
    creatorBudget = creatorCount * feePer;
    paid = rng.int(3000, 9000, 500);
    agency = rng.int(1000, 5000, 250);
    if (agency < paid) break;
  }
  if (errors.has('creatorMaths')) creatorBudget += rng.pick([-2000, -1000, 1000, 2000, feePer]);
  budget = creatorBudget + paid + agency;
  if (errors.has('total')) budget += rng.pick([-2000, -1000, 1000, 2000]);

  const launch = randomDate(rng);
  const approval = errors.has('approval') ? addDays(launch, rng.int(1, 4)) : addDays(launch, -rng.int(3, 8));
  const end = errors.has('endDate') ? addDays(launch, -rng.int(3, 10)) : addDays(launch, rng.int(14, 35));

  const statements: Record<(typeof errorTypes)[number], string> = {
    total: 'The cost lines do not add up to the total budget.',
    approval: 'The content approval deadline falls after the launch date.',
    endDate: 'The campaign end date falls before the launch date.',
    creatorMaths: 'The creator budget does not equal the number of creators multiplied by the fee per creator.',
  };

  return build(rng, {
    templateId: 'AD-record-errors',
    category: 'attention_to_detail',
    blocks: [
      {
        type: 'record',
        title: 'Campaign record',
        rows: [
          ['Client', rng.pick(CLIENTS)],
          ['Total budget', money(budget)],
          ['Creators', `${creatorCount} at ${money(feePer)} each`],
          ['Creator budget', money(creatorBudget)],
          ['Paid media', money(paid)],
          ['Agency fee', money(agency)],
          ['Launch date', dayMonth(launch)],
          ['Content approval deadline', dayMonth(approval)],
          ['Campaign end date', dayMonth(end)],
        ],
      },
    ],
    prompt: 'This record contains two errors. Which two issues can you identify?',
    kind: 'multi',
    selectCount: 2,
    options: [
      ...errorTypes.map((t) => ({ text: statements[t], correct: errors.has(t) })),
      { text: 'The agency fee is higher than the paid media budget.' },
    ],
  });
}

/** Spot the creator handle in the tracker that differs from the contract list. */
function adHandleMismatch(rng: Rng): Question {
  const suffixes = ['.creates', '_uk', '.ugc', 'official', '.daily', '_studio', '.eats', '_fit'];
  const names = rng.sample(FIRST_NAMES, 5).map((n) => n.toLowerCase());
  const handles = names.map((n) => '@' + n + rng.pick(suffixes));

  const wrongIndex = rng.int(0, 4);
  const original = handles[wrongIndex];
  const mutate = (h: string): string => {
    const body = h.slice(1);
    const nameLen = names[wrongIndex].length;
    const kind = rng.pick(['swap', 'double', 'drop', 'separator']);
    if (kind === 'separator' && /[._]/.test(body)) return '@' + body.replace(/[._]/, (c) => (c === '.' ? '_' : '.'));
    if (kind === 'double') {
      const i = rng.int(1, nameLen - 1);
      return '@' + body.slice(0, i) + body[i] + body.slice(i);
    }
    if (kind === 'drop' && nameLen > 3) {
      const i = rng.int(1, nameLen - 2);
      return '@' + body.slice(0, i) + body.slice(i + 1);
    }
    for (let i = 1; i < nameLen - 1; i++) {
      if (body[i] !== body[i + 1]) return '@' + body.slice(0, i) + body[i + 1] + body[i] + body.slice(i + 2);
    }
    return '@' + body + 'x';
  };
  let changed = mutate(original);
  if (changed === original) changed = original + '_';
  const tracker = handles.map((h, i) => (i === wrongIndex ? changed : h));

  const otherOptions = rng.sample(tracker.filter((_, i) => i !== wrongIndex), 3);
  return build(rng, {
    templateId: 'AD-handles',
    category: 'attention_to_detail',
    blocks: [
      { type: 'text', text: 'The campaign tracker should list exactly the same creator handles as the signed contracts.' },
      {
        type: 'columns',
        records: [
          { title: 'Signed contracts', rows: handles.map((h, i) => [String(i + 1), h] as [string, string]) },
          { title: 'Campaign tracker', rows: tracker.map((h, i) => [String(i + 1), h] as [string, string]) },
        ],
      },
    ],
    prompt: 'Which handle in the campaign tracker does not match the signed contracts?',
    options: [
      { text: changed, correct: true },
      ...otherOptions.map((text) => ({ text })),
      { text: 'All handles match' },
    ],
  });
}

/** Which creator is scheduled outside the posting window? */
function adPostingWindow(rng: Rng): Question {
  const start = randomDate(rng);
  const length = rng.int(3, 6);
  const end = addDays(start, length);
  const creators = rng.sample(FIRST_NAMES, 4);
  const hasOutlier = rng.chance(0.85);
  const outlier = rng.int(0, 3);
  const schedule = creators.map((c, i) => {
    const d = hasOutlier && i === outlier
      ? (rng.chance(0.5) ? addDays(end, rng.int(1, 2)) : addDays(start, -rng.int(1, 2)))
      : addDays(start, rng.int(0, length));
    return [c, dayMonth(d)] as [string, string];
  });

  return build(rng, {
    templateId: 'AD-window',
    category: 'attention_to_detail',
    blocks: [
      { type: 'text', text: `Brief: all creators must post between ${dayMonth(start)} and ${dayMonth(end)} (inclusive).` },
      { type: 'record', title: 'Posting schedule', rows: schedule },
    ],
    prompt: 'Which creator is scheduled to post outside the agreed window?',
    options: [
      ...creators.map((c, i) => ({ text: c, correct: hasOutlier && i === outlier })),
      { text: 'None – all are within the window', correct: !hasOutlier },
    ],
  });
}

// ---------------------------------------------------------------------------
// Following Instructions
// ---------------------------------------------------------------------------

type Outcome = 'Approve' | 'Reject' | 'Needs Review';
const OUTCOMES: Outcome[] = ['Approve', 'Reject', 'Needs Review'];

function outcomeOptions(correct: Outcome) {
  return OUTCOMES.map((o) => ({ text: o, correct: o === correct }));
}

/** Creator approval rule set (followers, engagement, fee, UK-based). */
function fiCreatorApproval(rng: Rng, outcome: Outcome, avoidNames: string[]): Question {
  const minFollowers = rng.pick([10000, 20000, 25000, 50000]);
  const minEngagement = rng.pick([2, 2.5, 3]);
  const maxFee = rng.pick([1000, 1500, 2000]);
  const name = creatorName(rng, avoidNames);

  // Start with a passing profile; boundary values sometimes sit exactly on the limit.
  const values = {
    followers: rng.chance(0.25) ? minFollowers : minFollowers + rng.int(1, 40) * 1000,
    engagement: rng.chance(0.25) ? minEngagement : Math.round((minEngagement + rng.int(1, 30) / 10) * 10) / 10,
    fee: rng.chance(0.25) ? maxFee : maxFee - rng.int(1, 8) * 50,
    location: 'UK',
  };
  const shown: Record<keyof typeof values, string> = {
    followers: num(values.followers),
    engagement: `${values.engagement.toFixed(1)}%`,
    fee: money(values.fee),
    location: values.location,
  };
  const keys = ['followers', 'engagement', 'fee', 'location'] as const;

  if (outcome === 'Reject') {
    for (const k of rng.sample(keys, rng.pick([1, 1, 2]))) {
      if (k === 'followers') shown.followers = num(minFollowers - rng.int(1, 9) * 100);
      if (k === 'engagement') shown.engagement = `${(minEngagement - rng.int(1, 5) / 10).toFixed(1)}%`;
      if (k === 'fee') shown.fee = money(maxFee + rng.int(1, 6) * 50);
      if (k === 'location') shown.location = rng.pick(LOCATIONS_NOT_UK);
    }
  } else if (outcome === 'Needs Review') {
    shown[rng.pick(keys)] = 'Not provided';
  }

  return build(rng, {
    templateId: 'FI-creator-approval',
    category: 'following_instructions',
    blocks: [
      { type: 'text', text: 'Approve a creator only if all of the following are true:' },
      {
        type: 'list',
        items: [
          `At least ${num(minFollowers)} followers`,
          `Engagement rate of at least ${minEngagement.toFixed(1)}%`,
          `Fee no higher than ${money(maxFee)}`,
          'Based in the UK',
        ],
      },
      { type: 'text', text: 'If any required information is missing, select Needs Review.' },
      {
        type: 'record',
        rows: [
          ['Creator', name],
          ['Followers', shown.followers],
          ['Engagement', shown.engagement],
          ['Fee', shown.fee],
          ['Location', shown.location],
        ],
      },
    ],
    prompt: 'What should you select?',
    options: outcomeOptions(outcome),
  });
}

/** Content sign-off rule set (disclosure, brand mention, length, competitors). */
function fiContentApproval(rng: Rng, outcome: Outcome, avoidNames: string[]): Question {
  const brand = rng.pick(CLIENTS);
  const maxLength = rng.pick([45, 60, 90]);
  const name = creatorName(rng, avoidNames);
  const shown = {
    disclosure: rng.pick(['#ad in the first line of the caption', '#ad at the start of the caption, with a “Paid partnership” label']),
    brand: 'Yes, by name',
    length: `${rng.chance(0.25) ? maxLength : maxLength - rng.int(1, 6) * 5} seconds`,
    competitors: 'None',
  };
  const keys = ['disclosure', 'brand', 'length', 'competitors'] as const;

  if (outcome === 'Reject') {
    const k = rng.pick(keys);
    if (k === 'disclosure') shown.disclosure = '#ad at the end of a long caption, after the hashtags';
    if (k === 'brand') shown.brand = 'No, product shown but not named';
    if (k === 'length') shown.length = `${maxLength + rng.int(1, 4) * 5} seconds`;
    if (k === 'competitors') shown.competitors = `${rng.pick(COMPETITORS)} visible in the background`;
  } else if (outcome === 'Needs Review') {
    shown[rng.pick(keys)] = 'Not provided';
  }

  return build(rng, {
    templateId: 'FI-content-approval',
    category: 'following_instructions',
    blocks: [
      { type: 'text', text: `Approve a creator video for posting only if all of the following are true:` },
      {
        type: 'list',
        items: [
          'The #ad disclosure appears in the first line of the caption',
          `${brand} is mentioned by name`,
          `The video is no longer than ${maxLength} seconds`,
          'No competitor brands are shown',
        ],
      },
      { type: 'text', text: 'If any required information is missing, select Needs Review.' },
      {
        type: 'record',
        rows: [
          ['Creator', name],
          ['Disclosure', shown.disclosure],
          [`${brand} mentioned`, shown.brand],
          ['Length', shown.length],
          ['Competitor brands', shown.competitors],
        ],
      },
    ],
    prompt: 'What should you select?',
    options: outcomeOptions(outcome),
  });
}

// ---------------------------------------------------------------------------
// Prioritisation
// ---------------------------------------------------------------------------

interface PriorityScenario {
  id: string;
  make: (rng: Rng) => { situation: string[]; correct: string; others: string[] };
}

const PRIORITY_SCENARIOS: PriorityScenario[] = [
  {
    id: 'PR-incorrect-claims',
    make: (rng) => {
      const h = rng.int(9, 11);
      return {
        situation: [
          `It is ${time(h)}.`,
          'A client has reported that a live creator video contains incorrect claims.',
          'A creator is asking when their payment will arrive.',
          `Your manager wants a report by ${time(17)}.`,
          'Another creator is asking whether their brief has been approved.',
          `A client call starts at ${time(h, 30)}.`,
        ],
        correct: 'Deal with the incorrect live content',
        others: [`Prepare the ${time(17)} report`, 'Reply to the payment question', 'Reply about the creator brief'],
      };
    },
  },
  {
    id: 'PR-discount-code',
    make: (rng) => {
      const client = rng.pick(CLIENTS);
      const creator = rng.pick(FIRST_NAMES);
      const deadline = rng.int(15, 17);
      return {
        situation: [
          `It is ${time(rng.int(9, 11))}.`,
          `${client} has emailed: ${creator}’s live post shows an expired discount code and customers are complaining that it doesn’t work.`,
          'The internal campaign tracker needs updating with last week’s results.',
          'A creator is asking for feedback on a draft that is due next week.',
          `Finance needs this month’s creator invoices submitted by ${time(deadline)}.`,
        ],
        correct: 'Get the live discount code corrected',
        others: ['Update the internal campaign tracker', 'Give feedback on the creator’s draft', 'Submit the invoices to Finance'],
      };
    },
  },
  {
    id: 'PR-spark-codes',
    make: (rng) => {
      const h = rng.int(10, 13);
      return {
        situation: [
          `It is ${time(h)}.`,
          `The paid media team cannot launch the client’s Spark Ads, due to go live at ${time(h + 1)}, until they receive the creator authorisation codes you hold.`,
          'A colleague has asked you to review next month’s team rota.',
          'A creator is asking whether they can use a different song in a video posting next week.',
          `Your weekly client report is due at ${time(17)}.`,
        ],
        correct: 'Send the authorisation codes to the paid media team',
        others: ['Review the team rota', 'Reply to the creator about the song', 'Start the weekly client report'],
      };
    },
  },
  {
    id: 'PR-missing-disclosure',
    make: (rng) => {
      const mins = rng.pick([10, 20, 30]);
      const deadline = rng.int(14, 16);
      return {
        situation: [
          `It is ${time(rng.int(9, 12))}.`,
          `A creator posted sponsored content for your client ${mins} minutes ago without the required #ad disclosure.`,
          'The client has asked for a call next week to discuss plans for next quarter.',
          'The internal budget spreadsheet needs tidying before month end.',
          `The creator shortlist for a new campaign is due to the client at ${time(deadline)}.`,
        ],
        correct: 'Get the creator to add the #ad disclosure',
        others: ['Book the call for next week', 'Tidy the budget spreadsheet', 'Finish the creator shortlist'],
      };
    },
  },
  {
    id: 'PR-wrong-brand-tag',
    make: (rng) => {
      const client = rng.pick(CLIENTS);
      const deadline = rng.int(15, 17);
      return {
        situation: [
          `It is ${time(rng.int(9, 11))}.`,
          `${client} has noticed that a live campaign video tags their competitor’s account instead of theirs and wants it fixed urgently.`,
          'You have been asked to update the agency’s internal case-study template.',
          'A creator wants to know whether they can post one day later than planned next week.',
          `A content calendar is due to your manager at ${time(deadline)}.`,
        ],
        correct: 'Get the incorrect tag on the live video fixed',
        others: ['Update the case-study template', 'Reply to the creator about the posting date', 'Finish the content calendar'],
      };
    },
  },
];

function prioritisation(rng: Rng, scenario: PriorityScenario): Question {
  const s = scenario.make(rng);
  return build(rng, {
    templateId: scenario.id,
    category: 'prioritisation',
    blocks: [{ type: 'list', items: s.situation }],
    prompt: 'What should you deal with first?',
    options: [{ text: s.correct, correct: true }, ...s.others.map((text) => ({ text }))],
  });
}

// ---------------------------------------------------------------------------
// Numerical Reasoning
// ---------------------------------------------------------------------------

interface BudgetContext {
  budget: number;
  creator: number;
  other: number;
  remaining: number;
  pct: number;
}

/** A budget where the remaining amount is a whole percentage of the total. */
function budgetContext(rng: Rng): BudgetContext {
  for (;;) {
    const budget = rng.int(30, 90) * 1000;
    const pct = rng.int(20, 55);
    const remaining = (budget * pct) / 100;
    const other = rng.int(2000, 8000, 500);
    const creator = budget - remaining - other;
    if (Number.isInteger(remaining) && remaining % 100 === 0 && creator > other) {
      return { budget, creator, other, remaining, pct };
    }
  }
}

function budgetBlock(ctx: BudgetContext): Block {
  return {
    type: 'record',
    rows: [
      ['Client budget', money(ctx.budget)],
      ['Creator costs', money(ctx.creator)],
      ['Other campaign costs', money(ctx.other)],
    ],
  };
}

function nrRemaining(rng: Rng, ctx: BudgetContext): Question {
  const wrong = distractors(rng, ctx.remaining, [
    ctx.remaining - ctx.other,
    ctx.remaining + ctx.other,
    ctx.remaining + 5000,
    ctx.remaining - 3000,
    ctx.remaining + 1000,
  ], 3);
  return build(rng, {
    templateId: 'NR-remaining',
    category: 'numerical_reasoning',
    blocks: [budgetBlock(ctx)],
    prompt: 'How much of the client budget remains?',
    options: [ctx.remaining, ...wrong].map((v) => ({ text: money(v), correct: v === ctx.remaining })),
  });
}

function nrPercentRemaining(rng: Rng, ctx: BudgetContext): Question {
  const wrong = distractors(rng, ctx.pct, [-8, -6, -4, -2, 2, 4, 6, 8].map((d) => ctx.pct + d), 3, (v) => v > 0 && v < 100);
  return build(rng, {
    templateId: 'NR-percent-remaining',
    category: 'numerical_reasoning',
    blocks: [budgetBlock(ctx)],
    prompt: 'What percentage of the client budget remains?',
    options: [ctx.pct, ...wrong].map((v) => ({ text: `${v}%`, correct: v === ctx.pct })),
  });
}

function nrCostPerThousand(rng: Rng): Question {
  const cpm = rng.int(5, 24) / 2; // £2.50–£12.00 in 50p steps
  const views = rng.int(200, 900) * 1000;
  const spend = (cpm * views) / 1000;
  const wrong = distractors(rng, cpm, [cpm * 10, cpm + 1.5, cpm - 1, cpm + 0.5, cpm / 2], 3, (v) => v > 0);
  return build(rng, {
    templateId: 'NR-cost-per-thousand',
    category: 'numerical_reasoning',
    blocks: [
      {
        type: 'record',
        rows: [
          ['Paid media spend', money(spend)],
          ['Views delivered', num(views)],
        ],
      },
    ],
    prompt: 'What was the cost per 1,000 views?',
    options: [cpm, ...wrong].map((v) => ({ text: money(v, 2), correct: v === cpm })),
  });
}

function nrEngagementRate(rng: Rng): Question {
  for (;;) {
    const views = rng.int(40, 200) * 1000;
    const rate = rng.int(6, 19) / 2; // 3.0%–9.5%
    const total = (views * rate) / 100;
    const comments = Math.round(total * (rng.int(6, 10) / 100));
    const shares = Math.round(total * (rng.int(5, 12) / 100));
    const likes = total - comments - shares;
    if (!Number.isInteger(total) || likes <= 0) continue;
    const likesOnly = Math.round((likes / views) * 1000) / 10;
    const wrong = distractors(rng, rate, [likesOnly, rate + 1, rate - 1, rate * 2, rate + 2], 3, (v) => v > 0);
    return build(rng, {
      templateId: 'NR-engagement-rate',
      category: 'numerical_reasoning',
      blocks: [
        { type: 'text', text: 'Engagement rate = (likes + comments + shares) ÷ views × 100' },
        {
          type: 'record',
          rows: [
            ['Views', num(views)],
            ['Likes', num(likes)],
            ['Comments', num(comments)],
            ['Shares', num(shares)],
          ],
        },
      ],
      prompt: 'What is the engagement rate for this video?',
      options: [rate, ...wrong].map((v) => ({ text: `${v.toFixed(1)}%`, correct: v === rate })),
    });
  }
}

function nrFeeIncrease(rng: Rng): Question {
  const fee = rng.int(12, 60) * 100;
  const pct = rng.pick([10, 15, 20, 25]);
  const correct = fee + (fee * pct) / 100;
  const wrong = distractors(rng, correct, [
    fee + (fee * pct * 2) / 100,
    correct + fee * 0.05,
    correct - fee * 0.05,
    fee + pct * 10,
  ], 3);
  return build(rng, {
    templateId: 'NR-fee-increase',
    category: 'numerical_reasoning',
    blocks: [
      {
        type: 'text',
        text: `A creator’s agreed fee is ${money(fee)}. The client approves a ${pct}% increase to cover an extra month of usage rights.`,
      },
    ],
    prompt: 'What is the creator’s new fee?',
    options: [correct, ...wrong].map((v) => ({ text: money(v), correct: v === correct })),
  });
}

// ---------------------------------------------------------------------------
// Logical Reasoning
// ---------------------------------------------------------------------------

const TEAMS = ['Paid Media', 'Legal', 'Brand Safety', 'Compliance'];

const LOGIC_TEMPLATES: { id: string; make: (rng: Rng) => Question }[] = [
  {
    id: 'LR-must-review',
    make: (rng) => {
      const team = rng.pick(TEAMS);
      const trigger = rng.pick(['paid media approval', 'a giveaway', 'alcohol-related content', 'a health claim']);
      const c = `Campaign ${campaignLetter(rng)}`;
      const requires = trigger === 'paid media approval' ? 'requires paid media approval' : `includes ${trigger}`;
      return build(rng, {
        templateId: 'LR-must-review',
        category: 'logical_reasoning',
        blocks: [{ type: 'text', text: `Every campaign that ${requires} must be reviewed by the ${team} team. ${c} ${requires}.` }],
        prompt: 'What follows?',
        options: [
          { text: `${c} must be reviewed by ${team}`, correct: true },
          { text: `${c} might need ${team} review` },
          { text: `${c} does not need ${team} review` },
          { text: 'There is not enough information' },
        ],
      });
    },
  },
  {
    id: 'LR-launch-before-approval',
    make: (rng) => {
      const c = `Campaign ${campaignLetter(rng)}`;
      const launch = randomDate(rng);
      const approvalBefore = rng.chance(0.3);
      const approval = approvalBefore ? addDays(launch, -rng.int(1, 4)) : addDays(launch, rng.int(1, 5));
      return build(rng, {
        templateId: 'LR-launch-before-approval',
        category: 'logical_reasoning',
        blocks: [
          {
            type: 'text',
            text: `No campaign may launch before client approval. ${c} is scheduled to launch on ${weekdayDate(launch)}. Client approval is expected on ${weekdayDate(approval)}.`,
          },
        ],
        prompt: `Can ${c} launch on ${weekdayDate(launch)} under the current plan?`,
        options: [
          { text: 'Yes', correct: approvalBefore },
          { text: 'No', correct: !approvalBefore },
          { text: 'Not enough information' },
        ],
      });
    },
  },
  {
    id: 'LR-affirming-consequent',
    make: (rng) => {
      const team = rng.pick(TEAMS);
      const feature = rng.pick(['a giveaway', 'a discount code', 'a medical claim', 'a celebrity cameo']);
      const c = `Campaign ${campaignLetter(rng)}`;
      return build(rng, {
        templateId: 'LR-affirming-consequent',
        category: 'logical_reasoning',
        blocks: [{ type: 'text', text: `Every campaign that includes ${feature} must be reviewed by ${team}. ${c} was reviewed by ${team}.` }],
        prompt: `Does ${c} include ${feature}?`,
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not enough information', correct: true },
        ],
      });
    },
  },
  {
    id: 'LR-contract-rule',
    make: (rng) => {
      const limit = rng.pick([3000, 5000, 10000]);
      const name = rng.pick(FIRST_NAMES);
      const over = rng.chance(0.6);
      const fee = over ? limit + rng.int(2, 40) * 100 : limit - rng.int(2, 20) * 100;
      return build(rng, {
        templateId: 'LR-contract-rule',
        category: 'logical_reasoning',
        blocks: [
          {
            type: 'text',
            text: `Any creator paid more than ${money(limit)} must have a signed contract before posting. ${name} is being paid ${money(fee)} and has not signed a contract. ${name} is about to post.`,
          },
        ],
        prompt: 'Does the rule allow this to go ahead?',
        options: [
          { text: 'Yes', correct: !over },
          { text: 'No', correct: over },
          { text: 'Not enough information' },
        ],
      });
    },
  },
  {
    id: 'LR-some-all',
    make: (rng) => {
      const city = rng.pick(['Manchester', 'Leeds', 'Bristol', 'Glasgow', 'Birmingham']);
      const trait = rng.pick(['have completed brand-safety training', 'are over 18', 'have a signed NDA']);
      return build(rng, {
        templateId: 'LR-some-all',
        category: 'logical_reasoning',
        blocks: [{ type: 'text', text: `Some creators on the roster are based in ${city}. All creators on the roster ${trait}.` }],
        prompt: 'Which statement must be true?',
        options: [
          { text: `Some creators based in ${city} ${trait}`, correct: true },
          { text: `All creators based in ${city} are on the roster` },
          { text: `Only creators based in ${city} ${trait}` },
          { text: `Every creator who ${trait.replace(/^are /, 'is ').replace(/^have /, 'has ')} is on the roster` },
        ],
      });
    },
  },
  {
    id: 'LR-sequence',
    make: (rng) => {
      const steps = rng.pick([
        ['The creator brief is approved', 'Contracts are signed', 'Filming starts'],
        ['The client signs the SOW', 'Creators are booked', 'Content is posted'],
        ['Content is filmed', 'The client approves the content', 'The paid boost starts'],
      ]);
      return build(rng, {
        templateId: 'LR-sequence',
        category: 'logical_reasoning',
        blocks: [
          {
            type: 'text',
            text: `“${steps[1]}” can only happen after “${steps[0].charAt(0).toLowerCase() + steps[0].slice(1)}”. “${steps[2]}” can only happen after “${steps[1].charAt(0).toLowerCase() + steps[1].slice(1)}”.`,
          },
        ],
        prompt: 'Which of these must happen last?',
        options: [
          { text: steps[2], correct: true },
          { text: steps[1] },
          { text: steps[0] },
          { text: 'Not enough information' },
        ],
      });
    },
  },
  {
    id: 'LR-only-if',
    make: (rng) => {
      const c = `Campaign ${campaignLetter(rng)}`;
      const doc = rng.pick(['a signed statement of work', 'a purchase order number', 'client sign-off on the final report']);
      return build(rng, {
        templateId: 'LR-only-if',
        category: 'logical_reasoning',
        blocks: [{ type: 'text', text: `A campaign can be invoiced only if it has ${doc}. ${c} has been invoiced correctly under this rule.` }],
        prompt: 'What follows?',
        options: [
          { text: `${c} has ${doc}`, correct: true },
          { text: `${c} might not have ${doc}` },
          { text: `${c} does not have ${doc}` },
          { text: 'There is not enough information' },
        ],
      });
    },
  },
];

// ---------------------------------------------------------------------------
// Operational Judgement
// ---------------------------------------------------------------------------

const JUDGEMENT_TEMPLATES: { id: string; make: (rng: Rng) => Question }[] = [
  {
    id: 'OJ-missed-deadline',
    make: (rng) => {
      const hours = rng.int(4, 8);
      const days = rng.int(3, 6);
      return build(rng, {
        templateId: 'OJ-missed-deadline',
        category: 'operational_judgement',
        blocks: [
          {
            type: 'list',
            items: [
              'A creator missed their posting deadline yesterday.',
              `They have not replied for ${hours} hours.`,
              'The client has not noticed yet.',
              `The final campaign deadline is still ${days} days away.`,
            ],
          },
        ],
        prompt: 'What is the best next step?',
        options: [
          { text: 'Follow up with the creator, establish the revised posting time and escalate internally if there is no response', correct: true },
          { text: 'Immediately tell the client the creator has failed' },
          { text: 'Wait until the final deadline' },
          { text: 'Terminate the creator immediately' },
        ],
      });
    },
  },
  {
    id: 'OJ-draft-missing-point',
    make: (rng) => {
      const name = rng.pick(FIRST_NAMES);
      const client = rng.pick(CLIENTS);
      return build(rng, {
        templateId: 'OJ-draft-missing-point',
        category: 'operational_judgement',
        blocks: [
          {
            type: 'list',
            items: [
              `${name} has delivered a draft video ${rng.int(2, 3)} days before the posting date.`,
              'The video is strong but misses one mandatory talking point from the brief.',
              `${client} needs to approve the video by tomorrow.`,
            ],
          },
        ],
        prompt: 'What is the best next step?',
        options: [
          { text: `Ask ${name} for a quick re-edit that includes the talking point, then send it to ${client} for approval`, correct: true },
          { text: `Send it to ${client} as it is and hope they don’t notice` },
          { text: 'Add the talking point as on-screen text yourself without telling anyone' },
          { text: `Drop ${name} and look for a replacement creator` },
        ],
      });
    },
  },
  {
    id: 'OJ-scope-creep',
    make: (rng) => {
      const client = rng.pick(CLIENTS);
      const from = rng.int(3, 5);
      return build(rng, {
        templateId: 'OJ-scope-creep',
        category: 'operational_judgement',
        blocks: [
          {
            type: 'text',
            text: `On a call, ${client} asks to increase the campaign from ${from} creator posts to ${from + 2}, without changing the budget. Creator fees are already agreed.`,
          },
        ],
        prompt: 'What is the best response?',
        options: [
          { text: 'Acknowledge the request, check creator availability and cost, and come back with options and the budget impact', correct: true },
          { text: 'Agree immediately to keep the client happy' },
          { text: 'Refuse outright because it is not in the contract' },
          { text: 'Ask the creators to make the extra posts for free' },
        ],
      });
    },
  },
  {
    id: 'OJ-underperforming',
    make: (rng) => {
      const name = rng.pick(FIRST_NAMES);
      const pct = rng.int(40, 70);
      return build(rng, {
        templateId: 'OJ-underperforming',
        category: 'operational_judgement',
        blocks: [
          {
            type: 'list',
            items: [
              'The campaign is halfway through.',
              `${name}’s video is ${pct}% below the view benchmark; the other creators are on track.`,
              'The client has not commented yet.',
            ],
          },
        ],
        prompt: 'What is the best next step?',
        options: [
          { text: 'Review the data, identify likely reasons and proactively share findings with a recommendation for the client', correct: true },
          { text: 'Say nothing until the end-of-campaign report' },
          { text: `Ask ${name} to delete the video` },
          { text: `Tell the client that ${name} has let the campaign down` },
        ],
      });
    },
  },
];

// ---------------------------------------------------------------------------
// Assembling an assessment
// ---------------------------------------------------------------------------

export function generateAssessment(seed: number): Question[] {
  const rng = new Rng(seed);
  const questions: Question[] = [];

  // Attention to Detail: 3 of 5 templates.
  const adTemplates = [adVersionDifferences, adBudgetReconcile, adCampaignRecordErrors, adHandleMismatch, adPostingWindow];
  for (const t of rng.sample(adTemplates, 3)) questions.push(t(rng));

  // Following Instructions: two questions with different correct outcomes.
  const [o1, o2] = rng.sample(OUTCOMES, 2);
  const first = fiCreatorApproval(rng, o1, []);
  const firstName = first.blocks.flatMap((b) => (b.type === 'record' ? b.rows : [])).find(([k]) => k === 'Creator')?.[1] ?? '';
  questions.push(first);
  questions.push(rng.chance(0.5) ? fiCreatorApproval(rng, o2, [firstName]) : fiContentApproval(rng, o2, [firstName]));

  // Prioritisation: 2 of 5 scenarios.
  for (const s of rng.sample(PRIORITY_SCENARIOS, 2)) questions.push(prioritisation(rng, s));

  // Numerical Reasoning: 2 of 5 templates (the two budget questions share one set of figures).
  const ctx = budgetContext(rng);
  const nrTemplates = [
    () => nrRemaining(rng, ctx),
    () => nrPercentRemaining(rng, ctx),
    () => nrCostPerThousand(rng),
    () => nrEngagementRate(rng),
    () => nrFeeIncrease(rng),
  ];
  for (const t of rng.sample(nrTemplates, 2)) questions.push(t());

  // Logical Reasoning: 2 of 7 templates.
  for (const t of rng.sample(LOGIC_TEMPLATES, 2)) questions.push(t.make(rng));

  // Operational Judgement: 1 of 4 scenarios.
  questions.push(rng.pick(JUDGEMENT_TEMPLATES).make(rng));

  return rng.shuffle(questions);
}

export function newSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}
