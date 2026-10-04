/*
 * Sanity check for the question bank and scoring. Run with `npm test`.
 */
import { ASSESSMENTS } from '../lib/questionBank';
import { rankingScore, scoreAssessment } from '../lib/scoring';
import type { Question } from '../lib/types';

const RUNS = 5000;
let failures = 0;

function fail(msg: string) {
  failures++;
  if (failures <= 5) console.error(msg);
}

/** Re-derive the Q3 answer from the table as shown, independently of the generator. */
function checkThreeCreators(q: Question, seed: number) {
  const table = q.blocks.find((b) => b.type === 'table');
  if (!table || table.type !== 'table') return fail(`seed ${seed}: Q3 has no table`);
  const n = (v: string) => Number(v.replace(/[^0-9.]/g, ''));
  const value = (label: string, i: number) => table.rows.find((r) => r[0] === label)![i + 1];
  const qualifies = table.columns.map((_, i) =>
    n(value('Followers', i)) >= 50000 &&
    n(value('Engagement', i)) >= 3 &&
    n(value('Fee', i)) <= 1500 &&
    value('Location', i) === 'UK' &&
    n(value('UK Audience', i)) >= 45,
  );
  const count = qualifies.filter(Boolean).length;
  const expected = count > 1 ? 'More than one creator' : count === 1 ? table.columns[qualifies.indexOf(true)] : null;
  const actual = q.options.find((o) => o.id === q.correct[0])!.text;
  if (expected !== actual) fail(`seed ${seed}: Q3 answer key says "${actual}" but the table gives "${expected}"`);
}

/** Re-derive the AM Q3 answer from the brief and plan as shown: exactly one requirement must fail. */
function checkClientBrief(q: Question, seed: number) {
  const cols = q.blocks.find((b) => b.type === 'columns');
  if (!cols || cols.type !== 'columns') return fail(`seed ${seed}: AM Q3 has no columns`);
  const get = (i: number, k: string) => cols.records[i].rows.find((r) => r[0] === k)![1];
  const n = (v: string) => Number(v.replace(/[^0-9]/g, ''));
  const date = (v: string) => Date.parse(`${v} 2026`);
  const [tiktok, total] = get(1, 'TikTok Creators').split(' of ').map(Number);
  const fails: string[] = [];
  if (n(get(1, 'Creators')) < n(get(0, 'Minimum Creators'))) fails.push('Increase the total number of creators');
  if (n(get(1, 'Germany Creators')) < n(get(0, 'Germany-Based Creators'))) fails.push('Increase the number of Germany-based creators');
  if (tiktok * 2 < total) fails.push('Increase the number of TikTok creators');
  if (date(get(1, 'Launch')) > date(get(0, 'Launch Deadline'))) fails.push('Move the launch date earlier');
  if (total !== n(get(1, 'Creators')) || n(get(1, 'UK Creators')) + n(get(1, 'Germany Creators')) !== total) fails.push('inconsistent totals');
  const actual = q.options.find((o) => o.id === q.correct[0])!.text;
  if (fails.length !== 1 || fails[0] !== actual) fail(`seed ${seed}: AM Q3 key "${actual}" but table fails ${JSON.stringify(fails)}`);
}

for (const def of Object.values(ASSESSMENTS)) {
const generateAssessment = def.generate;
const QUESTION_TIMES = def.times;
console.log(`\n== ${def.role} (${def.version})`);
const answerSpread: Record<string, Record<string, number>> = {};
const contents = new Set<string>();

for (let seed = 1; seed <= RUNS; seed++) {
  let qs: Question[];
  try {
    qs = generateAssessment(seed * 2654435761);
  } catch (e) {
    fail(`seed ${seed}: ${(e as Error).message}`);
    continue;
  }
  if (qs.length !== 6) fail(`seed ${seed}: expected 6 questions`);
  qs.forEach((q, i) => {
    if (q.category !== def.categories[i]) fail(`seed ${seed}: question ${i + 1} has category ${q.category}`);
    if (q.timeLimitSeconds !== QUESTION_TIMES[i]) fail(`seed ${seed}: wrong time on question ${i + 1}`);
    const optionIds = new Set(q.options.map((o) => o.id));
    if (optionIds.size !== q.options.length) fail(`${q.templateId}: duplicate ids`);
    if (!q.correct.every((id) => optionIds.has(id))) fail(`${q.templateId}: answer key not in options`);
    if (q.kind === 'single') {
      const text = q.options.find((o) => o.id === q.correct[0])!.text;
      const key = text.slice(0, 18);
      (answerSpread[`Q${i + 1}`] ??= {})[key] = (answerSpread[`Q${i + 1}`][key] ?? 0) + 1;
    }
    contents.add(JSON.stringify(q.blocks));
    if (q.templateId === 'Q3-three-creators') checkThreeCreators(q, seed);
    if (q.templateId.startsWith('AM-Q3-')) checkClientBrief(q, seed);
  });
  const perfect = qs.map((q, i) => ({ questionIndex: i, selected: q.correct, answeredAt: '', timeTakenMs: 0, timedOut: false }));
  if (scoreAssessment(qs, perfect).overallScore !== 100) fail(`seed ${seed}: perfect answers did not score 100`);
  if (scoreAssessment(qs, []).overallScore !== 0) fail(`seed ${seed}: no answers did not score 0`);
}

// Ranking: only the high-risk item in first place counts.
const sample = generateAssessment(42)[3];
const [crit] = sample.correct;
const others = sample.correct.slice(1);
const cases: [string, string[], (s: number) => boolean][] = [
  ['ideal order', sample.correct, (s) => s === 1],
  ['critical first, rest reversed', [crit, ...[...others].reverse()], (s) => s === 1],
  ['critical second', [others[0], crit, others[1], others[2]], (s) => s === 0],
  ['critical last', [...others, crit], (s) => s === 0],
];
for (const [label, order, ok] of cases) {
  const s = rankingScore(sample, order);
  console.log(`ranking: ${label.padEnd(30)} ${s}`);
  if (!ok(s)) fail(`ranking case "${label}" scored ${s}`);
}

console.log(`${RUNS} assessments generated, ${contents.size} distinct question contents`);
console.log('correct-answer spread:', JSON.stringify(answerSpread));
for (const k of Object.keys(answerSpread)) delete answerSpread[k];
contents.clear();
}
console.log(`\n${failures} failures`);
if (failures) process.exit(1);
