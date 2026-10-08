import headOfDelivery from '@/content/jobs/head-of-delivery-performance.json';
import headOfOperations from '@/content/jobs/head-of-operations.json';

/*
 * Job descriptions published at /jobs/<slug>. To add one, add a JSON file in content/jobs
 * and list it in JOBS. Text strings use a blank line ("\n\n") between paragraphs and
 * **double asterisks** for phrases highlighted in the brand colour.
 */

export type JobBlock =
  | string
  | { list: string[] } // bullet list
  | { questions: string[] } // short standalone lines, shown as a list
  | { flow: string[] } // steps joined by arrows
  | { shift: [string, string] }; // "from" line, "to:", highlighted "to" line

export interface JobItem {
  title: string;
  blocks: JobBlock[];
}

export interface JobSection {
  id: string;
  title: string;
  /** text (default) · cards: two-column cards · values: icon cards */
  layout?: 'text' | 'cards' | 'values';
  /** 'details' shows the role details beside this section. */
  aside?: 'details';
  /** Two consecutive half sections sit side by side. */
  half?: boolean;
  blocks?: JobBlock[];
  items?: JobItem[];
}

export interface Job {
  slug: string;
  /** Small label above the title; defaults to “We’re Hiring”. */
  eyebrow?: string;
  title: string;
  titleAccent: string;
  details: string[][];
  sections: JobSection[];
}

const JOBS = [headOfDelivery, headOfOperations] as Job[];

export function getJob(slug: string): Job | undefined {
  return JOBS.find((j) => j.slug === slug);
}

export const JOB_SLUGS = JOBS.map((j) => j.slug);

/** Plain text of the first paragraph, for link previews. */
export function jobSummary(job: Job): string {
  const first = job.sections[0]?.blocks?.find((b): b is string => typeof b === 'string') ?? '';
  return first.split('\n\n')[0].replace(/\*\*/g, '');
}
