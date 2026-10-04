export const CATEGORIES = [
  'attention_to_detail',
  'financial_accuracy',
  'following_requirements',
  'prioritisation',
  'logical_reasoning',
  'operational_judgement',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  attention_to_detail: 'Attention to Detail',
  financial_accuracy: 'Financial Accuracy',
  following_requirements: 'Following Requirements',
  prioritisation: 'Prioritisation',
  logical_reasoning: 'Logical Reasoning',
  operational_judgement: 'Operational Judgement',
};

/** Content shown above the question prompt. It stays visible while the candidate answers. */
export type Block =
  | { type: 'text'; text: string }
  | { type: 'list'; title?: string; items: string[] }
  | { type: 'record'; title?: string; rows: [string, string][] }
  | { type: 'columns'; records: { title: string; rows: [string, string][] }[] };

export interface Option {
  id: string;
  text: string;
}

/** A generated question, including its answer key. Stored server-side only. */
export interface Question {
  templateId: string;
  category: Category;
  /** Seconds allowed before any extra-time adjustment. */
  timeLimitSeconds: number;
  blocks: Block[];
  prompt: string;
  /** 'single' = choose one option; 'ranking' = put every option in priority order. */
  kind: 'single' | 'ranking';
  /** Options (or items to rank) in the order the candidate first sees them. */
  options: Option[];
  /** single: the one correct id. ranking: the ideal order. */
  correct: string[];
  /** ranking only: the item that must come first, and how urgent the others are (higher = more urgent). */
  ranking?: { critical: string; urgency: Record<string, number> };
}

/** What the candidate's browser receives: no category, template or answer key. */
export type PublicQuestion = Pick<Question, 'blocks' | 'prompt' | 'kind' | 'options'>;

export interface SubmittedAnswer {
  questionIndex: number;
  /** single: [] or [id]. ranking: [] or every id in the candidate's order. */
  selected: string[];
  answeredAt: string;
  timeTakenMs: number;
  /** The question's timer ran out; whatever was selected at that moment was recorded. */
  timedOut: boolean;
}

export type CategoryScores = Record<Category, number>;

export interface AssessmentRow {
  id: string;
  token: string;
  candidate_name: string;
  candidate_email: string;
  role: string;
  assessment_version: string;
  time_multiplier: number;
  status: 'invited' | 'in_progress' | 'completed';
  seed: number | null;
  questions: Question[] | null;
  answers: SubmittedAnswer[];
  correct_answers: string[][] | null;
  question_scores: number[] | null;
  current_index: number;
  question_started_at: string | null;
  overall_score: number | null;
  category_scores: CategoryScores | null;
  privacy_notice_version: string | null;
  privacy_notice_ack_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  completion_time_seconds: number | null;
  tab_leave_count: number;
  created_at: string;
}
