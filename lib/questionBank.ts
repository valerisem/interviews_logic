import type { AssessmentType, Category, Question } from './types';
import { AM_TIMES, AM_VERSION, generateAccountManager } from './questions/accountManager';
import { CM_TIMES, CM_VERSION, generateCampaignManager } from './questions/campaignManager';

/** Each role has its own 6-question assessment. The candidate's role choice decides which one they take. */
export interface AssessmentDefinition {
  type: AssessmentType;
  role: string;
  version: string;
  times: number[];
  /** Category of each question, in question order (one question per category). */
  categories: Category[];
  generate: (seed: number) => Question[];
}

export const ASSESSMENTS: Record<AssessmentType, AssessmentDefinition> = {
  campaign_manager: {
    type: 'campaign_manager',
    role: 'Campaign Manager',
    version: CM_VERSION,
    times: CM_TIMES,
    categories: ['attention_to_detail', 'financial_accuracy', 'following_requirements', 'prioritisation', 'logical_reasoning', 'operational_judgement'],
    generate: generateCampaignManager,
  },
  account_manager: {
    type: 'account_manager',
    role: 'Account Manager',
    version: AM_VERSION,
    times: AM_TIMES,
    categories: ['attention_to_detail', 'commercial_accuracy', 'client_requirements', 'prioritisation', 'commercial_reasoning', 'client_judgement'],
    generate: generateAccountManager,
  },
};

export const ASSESSMENT_TYPES = Object.keys(ASSESSMENTS) as AssessmentType[];

export function isAssessmentType(v: unknown): v is AssessmentType {
  return typeof v === 'string' && v in ASSESSMENTS;
}

export function newSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}
