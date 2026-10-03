/*
 * Sanity check for the question bank: generates many assessments and verifies
 * structure, category mix, single correct answers and variety between candidates.
 * Run with `npm test`.
 */
import { generateAssessment } from '../lib/questionBank';
import { scoreAssessment } from '../lib/scoring';
import { CATEGORIES, type Category } from '../lib/types';

const EXPECTED: Record<Category, number> = {
  attention_to_detail: 3,
  following_instructions: 2,
  prioritisation: 2,
  numerical_reasoning: 2,
  logical_reasoning: 2,
  operational_judgement: 1,
};

const RUNS = 5000;
const combos = new Set<string>();
const prompts = new Set<string>();
let failures = 0;

for (let seed = 1; seed <= RUNS; seed++) {
  try {
    const qs = generateAssessment(seed * 2654435761);
    if (qs.length !== 12) throw new Error(`expected 12 questions, got ${qs.length}`);
    for (const c of CATEGORIES) {
      const n = qs.filter((q) => q.category === c).length;
      if (n !== EXPECTED[c]) throw new Error(`${c}: expected ${EXPECTED[c]}, got ${n}`);
    }
    for (const q of qs) {
      const ids = new Set(q.options.map((o) => o.id));
      if (ids.size !== q.options.length) throw new Error(`${q.templateId}: duplicate option ids`);
      if (new Set(q.options.map((o) => o.text)).size !== q.options.length) throw new Error(`${q.templateId}: duplicate option text`);
      if (!q.correct.every((id) => ids.has(id))) throw new Error(`${q.templateId}: correct id not in options`);
      const need = q.kind === 'multi' ? q.selectCount : 1;
      if (q.correct.length !== need) throw new Error(`${q.templateId}: wrong number of correct answers`);
      prompts.add(JSON.stringify(q.blocks));
    }
    // Perfect answers must score 100; no answers must score 0.
    const perfect = qs.map((q, i) => ({ questionIndex: i, selected: q.correct, answeredAt: '' }));
    if (scoreAssessment(qs, perfect).overallScore !== 100) throw new Error('perfect answers did not score 100');
    if (scoreAssessment(qs, []).overallScore !== 0) throw new Error('no answers did not score 0');
    combos.add(qs.map((q) => q.templateId).sort().join('|'));
  } catch (e) {
    failures++;
    if (failures <= 5) console.error(`seed ${seed}:`, (e as Error).message);
  }
}

console.log(`${RUNS} assessments generated, ${failures} failures`);
console.log(`${combos.size} distinct template combinations, ${prompts.size} distinct question contents`);
if (failures) process.exit(1);
