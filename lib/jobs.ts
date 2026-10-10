import headOfDelivery from '@/content/jobs/head-of-delivery-performance.json';
import headOfOperations from '@/content/jobs/head-of-operations.json';
import headOfOperationsOrg from '@/content/jobs/org/head-of-operations.json';
import headOfOperationsRoles from '@/content/jobs/org/head-of-operations-roles.json';
import accountabilityMap from '@/content/jobs/org/accountability-map.json';
import type { OrgRoleInfo, OrgSnapshot } from '@/components/OrgChart';
import type { AccountabilityMap } from '@/components/AccountabilityMap';

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
  /** An interactive org chart shown under the title (a frozen copy of a whiteboard board). */
  orgChart?: { title: string; highlight?: string };
  sections: JobSection[];
}

/** Frozen org-chart snapshots, by job slug (content/jobs/org/<slug>.json). */
export const ORG_CHARTS: Record<string, OrgSnapshot> = {
  'head-of-operations': headOfOperationsOrg as OrgSnapshot,
};

interface RoleNotes {
  byName: Record<string, string>;
  byRole: Record<string, string>;
  roles: Record<string, Omit<OrgRoleInfo, 'title'>>;
}

/** How each card on the chart works with the job's person: matched by card name first, then by role. */
function roleInfo(org: OrgSnapshot, notes: RoleNotes): Record<string, OrgRoleInfo> {
  const out: Record<string, OrgRoleInfo> = {};
  for (const n of org.nodes) {
    const key = notes.byName[n.name] ?? notes.byRole[n.role];
    const r = key ? notes.roles[key] : undefined;
    if (r) out[n.id] = { title: key, ...r };
  }
  return out;
}

/** Click-to-open collaboration notes for the org-chart cards, by job slug. */
export const ORG_ROLE_INFO: Record<string, Record<string, OrgRoleInfo>> = {
  'head-of-operations': roleInfo(headOfOperationsOrg as OrgSnapshot, headOfOperationsRoles as RoleNotes),
};

/** Company Accountability Map opened from the org chart's “Ownership Model” button, by job slug. */
export const ORG_SCHEMES: Record<string, AccountabilityMap> = {
  'head-of-operations': accountabilityMap as unknown as AccountabilityMap,
};

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
