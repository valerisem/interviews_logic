export const CATEGORIES = [
  'attention_to_detail',
  'following_instructions',
  'prioritisation',
  'numerical_reasoning',
  'logical_reasoning',
  'operational_judgement',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  attention_to_detail: 'Attention to Detail',
  following_instructions: 'Following Instructions',
  prioritisation: 'Prioritisation',
  numerical_reasoning: 'Numerical Reasoning',
  logical_reasoning: 'Logical Reasoning',
  operational_judgement: 'Operational Judgement',
};

/** Content shown above the question prompt. */
export type Block =
  | { type: 'text'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'record'; title?: string; rows: [string, string][] }
  | { type: 'columns'; records: { title: string; rows: [string, string][] }[] };

export interface Option {
  id: string;
  text: string;
}

/** A generated question, including its correct answer. Stored server-side only. */
export interface Question {
  templateId: string;
  category: Category;
  blocks: Block[];
  prompt: string;
  /** 'single' = choose one option; 'multi' = choose exactly `selectCount` options. */
  kind: 'single' | 'multi';
  selectCount?: number;
  /** Options in the order the candidate sees them (already shuffled). */
  options: Option[];
  /** Ids of the correct option(s). */
  correct: string[];
}

/** What the candidate's browser receives: no category, template or answer. */
export type PublicQuestion = Omit<Question, 'templateId' | 'category' | 'correct'>;

export interface SubmittedAnswer {
  questionIndex: number;
  selected: string[];
  answeredAt: string;
}

export interface CategoryScore {
  correct: number;
  total: number;
  score: number;
}

export type CategoryScores = Record<Category, CategoryScore>;

export interface AssessmentRow {
  id: string;
  token: string;
  candidate_name: string;
  candidate_email: string;
  role: string;
  recruiter_email: string | null;
  assessment_version: string;
  time_limit_seconds: number;
  status: 'invited' | 'in_progress' | 'completed';
  seed: number | null;
  questions: Question[] | null;
  answers: SubmittedAnswer[];
  correct_answers: string[][] | null;
  current_index: number;
  overall_score: number | null;
  correct_count: number | null;
  category_scores: CategoryScores | null;
  started_at: string | null;
  completed_at: string | null;
  completion_time_seconds: number | null;
  timed_out: boolean;
  tab_leave_count: number;
  created_at: string;
}
