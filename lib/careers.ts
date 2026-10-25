import 'server-only';
import { db } from './supabase';
import { JOB_SLUGS, getJob, type Job } from './jobs';

/*
 * Content for the careers page (/careers, and the admin copy at /admin/careers). Text strings use
 * **double asterisks** for phrases highlighted in the brand colour, like the job pages.
 */

export const ABOUT = [
  'At House of Marketers, we bring together some of the **brightest minds in influencer marketing, creative strategy, technology**, and every discipline in between.',
  'What unites us is a shared ambition to **push boundaries, challenge the ordinary, and set new standards** for the industry. We believe great work comes from exceptional people, and we give them the opportunity to **make a real impact every day.**',
];

/** Our history: the big year and the line under it. */
export const HISTORY: { big: string; text: string }[] = [
  { big: '2020', text: 'House of Marketers was founded by Inigo Rivero, TikTok’s first employee in the UK, who saw the potential of creator marketing before it became a core channel for global brands.' },
  { big: '2023', text: 'More than 500 influencer campaigns delivered and over 10,000 influencers worked with, for some of the biggest brands on the market.' },
  { big: '2026', text: 'House of Marketers was acquired by Ethos Partners, a large conglomerate, and is growing fast as we enter our next stage of growth.' },
];

export const VALUES_HEADLINE = 'If something looks wrong, we fix it before anyone asks.';

/** How we work, written as company values. */
export const VALUES: { title: string; text: string }[] = [
  { title: 'Proactivity', text: 'We spot problems before anyone asks. If something looks off, we investigate it straight away instead of waiting for it to become an escalation.' },
  { title: 'Intelligent curiosity', text: 'We check before we ask. We look at the data, speak to the right people and test our assumptions, then bring a recommendation, not just a question.' },
  { title: 'Ownership', text: 'When something is ours, we stay close to it until it is solved. Problems are never passed from person to person or team to team.' },
  { title: 'First principles', text: 'When the same problem keeps happening, we do not add another checklist. We understand why it happens and fix the cause.' },
  { title: 'Speed', text: 'Our industry, our technology and our company change fast. We test new ideas, try new tools, change direction and decide without waiting for perfect information.' },
  { title: 'AI with judgement', text: 'We use AI heavily to think, analyse, automate and move faster, never to produce generic documents nobody needs. Clear thinking comes first.' },
];

/** A few of our people (photos in public/team). */
export const PEOPLE: { name: string; role?: string; photo: string }[] = [
  { name: 'Valeriia Mukhai', role: 'Client Director', photo: '/team/valeriia.png' },
  { name: 'Ritchie Boubouli', role: 'Director of New Partnerships', photo: '/team/ritchie.png' },
  { name: 'Emily King', role: 'Account Director', photo: '/team/emily.png' },
  { name: 'Carrick Klopper', role: 'Partnership Manager', photo: '/team/carrick.png' },
  { name: 'Lucia Lopez Moreno', role: 'Account Director', photo: '/team/lucia.png' },
  { name: 'Emma-Leigh Pedder', role: 'Account Manager', photo: '/team/emma.png' },
  { name: 'Blake', photo: '/team/blake.png' },
  { name: 'Maggie Parrott', role: 'Account Manager', photo: '/team/maggie.png' },
  { name: 'Levi Hoang', role: 'Account Manager', photo: '/team/levi.png' },
  { name: 'Sarineh Garapetian', role: 'Account Manager', photo: '/team/sarineh.png' },
];

export type BenefitTone = 'navy' | 'fuchsia' | 'blush' | 'lilac' | 'peach' | 'butter' | 'raspberry';
export type BenefitIcon = 'globe' | 'trophy' | 'stairs' | 'chat' | 'spark' | 'target' | 'brands';
/**
 * Benefits as a collage: cards and photos of different sizes and colours, placed on a 12-column grid.
 * `area` is the CSS grid-area (row start / column start / row end / column end); one row is 10px.
 */
export const BENEFITS: ({ area: string } & ({ title: string; text: string; tone: BenefitTone; icon?: BenefitIcon } | { photo: string; alt: string }))[] = [
  { area: '7 / 2 / 37 / 5', photo: '/careers/team.jpg', alt: 'Members of the House of Marketers team' },
  { area: '38 / 1 / 55 / 5', title: 'Work remotely', text: 'Work from wherever you do your best work, as part of a team spread across markets.', tone: 'butter' },
  { area: '56 / 2 / 83 / 5', title: 'Clear growth paths', text: 'Structured onboarding, development milestones and a clear path to your next role.', tone: 'peach', icon: 'stairs' },
  { area: '1 / 5 / 29 / 8', title: 'Performance bonus', text: 'Bonuses tied to clear KPIs and team outcomes, so great work is recognised.', tone: 'navy', icon: 'trophy' },
  { area: '30 / 5 / 58 / 8', title: 'Coaching and feedback', text: 'Regular coaching, QA sessions and debriefs that help you keep getting better.', tone: 'blush', icon: 'chat' },
  { area: '59 / 5 / 87 / 8', title: 'Global brands', text: 'Campaigns for global brands across markets, platforms and industries.', tone: 'fuchsia', icon: 'brands' },
  { area: '10 / 8 / 34 / 11', title: 'AI-first tools', text: 'We use AI and modern tooling heavily, so your time goes on thinking, not repetitive work.', tone: 'lilac', icon: 'spark' },
  { area: '35 / 8 / 52 / 13', title: 'Real ownership', text: 'You own your work, make real decisions and see the impact you have every day.', tone: 'raspberry' },
  { area: '53 / 8 / 83 / 11', photo: '/careers/office.jpg', alt: 'The House of Marketers office' },
];

/** Which team each published role sits in, for the open roles list. */
const TEAMS: Record<string, string> = {
  'head-of-operations': 'Operations',
  'head-of-delivery-performance': 'Campaign Delivery',
  'campaign-manager': 'Campaign Delivery',
};

/** Org-chart cards that open a job page, matched by the card's role. */
export const ROLE_PAGES: Record<string, string> = {
  'Head of Operations': 'head-of-operations',
  'Head of Delivery Operations': 'head-of-delivery-performance',
  'Campaign Manager': 'campaign-manager',
};

export interface CareerRole { slug: string; title: string; team?: string; location?: string; open: boolean }

/**
 * Every published job and whether it is open. A job is open unless an admin has closed it
 * (a row in job_openings). If the table cannot be read, every job shows as open and `saved` is false.
 */
export async function careerRoles(): Promise<{ roles: CareerRole[]; saved: boolean }> {
  let closed = new Set<string>();
  let saved = true;
  try {
    const { data, error } = await db().from('job_openings').select('slug, is_open');
    if (error) throw error;
    closed = new Set((data ?? []).filter((r) => r.is_open === false).map((r) => r.slug as string));
  } catch (e) {
    console.error('job_openings unavailable', e);
    saved = false;
  }
  const roles = JOB_SLUGS.map((slug) => {
    const job = getJob(slug) as Job;
    const location = job.details.find(([k]) => k === 'Location')?.[1];
    return { slug, title: `${job.title} ${job.titleAccent}`, team: TEAMS[slug], location, open: !closed.has(slug) };
  });
  return { roles, saved };
}

export async function setRoleOpen(slug: string, open: boolean, email: string): Promise<void> {
  const { error } = await db()
    .from('job_openings')
    .upsert({ slug, is_open: open, updated_at: new Date().toISOString(), updated_by: email }, { onConflict: 'slug' });
  if (error) throw error;
}
