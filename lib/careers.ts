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

export type TagTone = 'fuchsia' | 'navy' | 'pink';
/** Our history: the big year, its tag and the line under it. */
export const HISTORY: { big: string; tag: string; tone: TagTone; text: string }[] = [
  { big: '2020', tag: 'Founding', tone: 'fuchsia', text: 'House of Marketers was founded by Inigo Rivero, TikTok’s first employee in the UK, who saw the potential of creator marketing before it became a core channel for global brands.' },
  { big: '2023', tag: 'Growth', tone: 'navy', text: 'More than 500 influencer campaigns delivered and over 10,000 influencers worked with, for some of the biggest brands on the market.' },
  { big: '2026', tag: 'Scaling', tone: 'pink', text: 'House of Marketers was acquired by Ethos Partners, a large conglomerate, and is growing fast as we enter our next stage of growth.' },
];

/** How we work, written as company values. */
export const VALUES: { title: string; text: string }[] = [
  { title: 'Proactivity', text: 'We spot problems before anyone asks. If something looks off, we investigate it straight away instead of waiting for it to become an escalation.' },
  { title: 'Intelligent curiosity', text: 'We check before we ask. We look at the data, speak to the right people and test our assumptions, then bring a recommendation, not just a question.' },
  { title: 'Ownership', text: 'When something is ours, we stay close to it until it is solved. Problems are never passed from person to person or team to team.' },
  { title: 'First principles', text: 'When the same problem keeps happening, we do not add another checklist. We understand why it happens and fix the cause.' },
  { title: 'Speed', text: 'Our industry, our technology and our company change fast. We test new ideas, try new tools, change direction and decide without waiting for perfect information.' },
  { title: 'AI with judgement', text: 'We use AI heavily to think, analyse, automate and move faster, never to produce generic documents nobody needs. Clear thinking comes first.' },
];

/** A few of our people (photos in public/team, LinkedIn links from the team directory). */
export const PEOPLE: { name: string; role: string; photo: string; linkedin?: string }[] = [
  { name: 'Inigo Rivero', role: 'Chief Executive Officer', photo: '/team/inigo.png', linkedin: 'https://www.linkedin.com/in/inigorivero' },
  { name: 'Valeria Semibratnya', role: 'Head of Operations', photo: '/team/valeria.png', linkedin: 'https://www.linkedin.com/in/valeria-semibratnya/' },
  { name: 'Valeriia Mukhai', role: 'Client Director', photo: '/team/valeriia.png', linkedin: 'https://www.linkedin.com/in/valeriia-mukhai-115007190/' },
  { name: 'Ritchie Boubouli', role: 'New Partnerships Director', photo: '/team/ritchie.png', linkedin: 'https://www.linkedin.com/in/ritchie-boubouli-42997713/' },
  { name: 'Chris Wilson', role: 'Paid Marketing Director', photo: '/team/chris.png', linkedin: 'https://www.linkedin.com/in/its-chris-wilson/' },
  { name: 'Emily King', role: 'Account Director', photo: '/team/emily.png', linkedin: 'https://uk.linkedin.com/in/emily-king-ab6a35228' },
  { name: 'Carrick Klopper', role: 'Partnership Manager', photo: '/team/carrick.png', linkedin: 'https://www.linkedin.com/in/carrick-klopper-5572742a/' },
  { name: 'Nazeera Gaffoor', role: 'Creative Strategist', photo: '/team/nazeera.png', linkedin: 'https://za.linkedin.com/in/nazeera-gaffoor-28503b279' },
  { name: 'Maggie Parrott', role: 'Account Manager', photo: '/team/maggie.png', linkedin: 'https://www.linkedin.com/in/maggieparrott' },
  { name: 'Levi Hoang', role: 'Account Manager', photo: '/team/levi.png', linkedin: 'https://www.linkedin.com/in/levi-hoang-6819431a9/' },
];

/** Where our team members work from (countries in the team directory). */
export const TEAM_COUNTRIES = [
  'United Kingdom', 'South Africa', 'Brazil', 'Philippines', 'Slovenia', 'Argentina', 'Italy', 'Spain',
  'France', 'Romania', 'Peru', 'Kenya', 'Pakistan', 'North Macedonia', 'Cyprus', 'India',
  'Colombia', 'Egypt', 'Serbia', 'Portugal', 'South Korea', 'Nigeria', 'Ukraine', 'Mexico',
];

export type BenefitTone = 'navy' | 'fuchsia' | 'pink' | 'grey';
export type BenefitIcon = 'globe' | 'laptop' | 'stairs' | 'calendar' | 'gift' | 'heart';
/**
 * Benefits as a collage: cards and photos of different sizes and colours, placed on a 12-column grid.
 * `area` is the CSS grid-area (row start / column start / row end / column end); one row is 10px.
 */
export const BENEFITS: ({ area: string } & ({ title: string; text: string; tone: BenefitTone; icon?: BenefitIcon; tags?: string[] } | { photo: string; alt: string }))[] = [
  { area: '7 / 2 / 37 / 5', photo: '/careers/team.jpg', alt: 'Members of the House of Marketers team' },
  { area: '38 / 1 / 55 / 5', title: 'Healthcare Benefits', text: 'Eligible UK team members receive healthcare benefits to support their health and wellbeing.', tone: 'pink' },
  { area: '56 / 2 / 88 / 5', title: 'Tech & Equipment', text: 'Our UK-based team members receive company-provided MacBooks to help them do their best work.', tone: 'navy', icon: 'laptop' },
  { area: '1 / 5 / 35 / 8', title: 'Coaching & Career Development', text: 'Grow your skills, receive ongoing coaching, and explore opportunities to advance your career.', tone: 'fuchsia', icon: 'stairs' },
  { area: '36 / 5 / 69 / 8', title: 'Industry Events & Conferences', text: 'Get opportunities to attend industry-leading events, conferences, and networking experiences.', tone: 'grey', icon: 'calendar' },
  { area: '70 / 5 / 99 / 8', title: 'Referral Bonus', text: 'Recommend great talent to join our team and earn up to £1,000 for a successful referral.', tone: 'pink', icon: 'gift' },
  { area: '10 / 8 / 57 / 11', title: 'Remote First', text: 'Enjoy the flexibility of remote work while collaborating with talented people from around the world.', tone: 'navy', icon: 'globe', tags: TEAM_COUNTRIES },
  { area: '58 / 8 / 75 / 13', title: 'Time Off', text: 'Take time to recharge, travel, and enjoy life outside work with our time-off and leave benefits.', tone: 'fuchsia' },
  { area: '76 / 8 / 106 / 11', photo: '/careers/team2.jpg', alt: 'Members of the House of Marketers team' },
];

/** Org-chart cards that open a job page, matched by the card's role. */
export const ROLE_PAGES: Record<string, string> = {
  'Head of Operations': 'head-of-operations',
  'Head of Delivery Operations': 'head-of-delivery-performance',
  'Campaign Manager': 'campaign-manager',
  'Account Director': 'account-director',
  'Account Manager': 'account-manager',
};

export interface CareerRole { slug: string; title: string; location?: string; open: boolean }

/**
 * Every published job and whether it is open. Open / closed lives on the job's row in the roles table
 * (roles.job_slug → roles.careers_open). If the table cannot be read, every job shows as open and `saved` is false.
 */
export async function careerRoles(): Promise<{ roles: CareerRole[]; saved: boolean }> {
  let closed = new Set<string>();
  let saved = true;
  try {
    const { data, error } = await db().from('roles').select('job_slug, careers_open').not('job_slug', 'is', null);
    if (error) throw error;
    closed = new Set((data ?? []).filter((r) => r.careers_open === false).map((r) => r.job_slug as string));
  } catch (e) {
    console.error('roles unavailable', e);
    saved = false;
  }
  const roles = JOB_SLUGS.map((slug) => {
    const job = getJob(slug) as Job;
    // Every role is remote unless its job description says otherwise.
    const location = job.details.find(([k]) => k === 'Location')?.[1] ?? 'Remote';
    return { slug, title: `${job.title} ${job.titleAccent}`, location, open: !closed.has(slug) };
  });
  return { roles, saved };
}

/** Open or close a role on the careers page (its row in the roles table). */
export async function setRoleOpen(slug: string, open: boolean): Promise<void> {
  const { data, error } = await db().from('roles').update({ careers_open: open }).eq('job_slug', slug).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error(`No row in roles has job_slug ${slug}`);
}
