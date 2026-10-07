import headOfDelivery from '@/content/jobs/head-of-delivery-performance.json';

/** Job descriptions published at /jobs/<slug>. To add one, add a JSON file in content/jobs and list it here. */
export interface Job {
  slug: string;
  title: string;
  titleAccent: string;
  details: string[][];
  about: string[];
  own: string[][];
  howWeWork: string[][];
  lookingFor: string[];
  successIntro: string;
  success: string[];
}

const JOBS: Job[] = [headOfDelivery];

export function getJob(slug: string): Job | undefined {
  return JOBS.find((j) => j.slug === slug);
}

export const JOB_SLUGS = JOBS.map((j) => j.slug);
