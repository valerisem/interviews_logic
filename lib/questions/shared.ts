import { Rng } from '../random';
import type { Category, Option, Question } from '../types';

/** Helpers shared by every assessment's question generators. */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function money(n: number): string {
  return '£' + n.toLocaleString('en-GB');
}

export function num(n: number): string {
  return n.toLocaleString('en-GB');
}

export function dayMonth(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

export function randomDate(rng: Rng): Date {
  return addDays(new Date(Date.UTC(2026, 8, 1)), rng.int(0, 90));
}

export function ids(rng: Rng, n: number): string[] {
  const out = new Set<string>();
  while (out.size < n) out.add(Math.floor(rng.next() * 0xffffff).toString(36).padStart(5, '0'));
  return [...out];
}

export interface Draft {
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

/** A single-choice question with exactly one correct option. */
export function single(rng: Rng, d: Draft): Question {
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

/** A priority-ranking scenario: one clearly high-risk item (urgency 3) plus three others. */
export interface PriorityScenario {
  id: string;
  intro: string;
  items: [string, number][];
}

/** Drag-to-rank question. Display order is randomised; the answer key is the urgency order. */
export function ranking(rng: Rng, s: PriorityScenario, category: Category, timeLimitSeconds: number): Question {
  const itemIds = ids(rng, s.items.length);
  const items: (Option & { urgency: number })[] = s.items.map(([text, urgency], i) => ({ id: itemIds[i], text, urgency }));
  const ideal = [...items].sort((a, b) => b.urgency - a.urgency).map((i) => i.id);
  return {
    templateId: s.id,
    category,
    timeLimitSeconds,
    blocks: [{ type: 'text', text: s.intro }],
    prompt: 'Arrange the four items from highest priority to lowest priority.',
    kind: 'ranking',
    options: rng.shuffle(items).map(({ id, text }) => ({ id, text })),
    correct: ideal,
    ranking: { critical: ideal[0], urgency: Object.fromEntries(items.map((i) => [i.id, i.urgency])) },
  };
}
