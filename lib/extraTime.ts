/** Extra-time choices a recruiter can give for a reasonable adjustment (multiplier on every question). */
export const EXTRA_TIME_CHOICES: [number, string][] = [
  [1, 'None'],
  [1.25, '+25%'],
  [1.5, '+50%'],
  [2, '+100%'],
];

export function extraTimeLabel(multiplier: number): string {
  return EXTRA_TIME_CHOICES.find(([v]) => v === Number(multiplier))?.[1] ?? `×${multiplier}`;
}
