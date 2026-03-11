// =============================================================
// Shared domain types for Learn-nGrow
// =============================================================

// ---- Roles ----

export const APP_ROLES = ['student', 'teacher', 'parent', 'admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

// ---- AI & Personalization ----

export type RecommendationSource = 'gemini' | 'rules';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface GeneratedRecommendation {
  recommendation_type: string;
  payload: Record<string, unknown>;
  source: RecommendationSource;
}

export interface GeneratedPathStep {
  topic_id: string;
  step_type: 'review' | 'learn' | 'practice' | 'challenge';
  step_order: number;
  reason: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  parent_profile_id: string | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Profile instead */
export interface UserProfile {
  id: string;
  email: string;
  role: 'student' | 'admin';
}

export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  published: boolean;
  is_template: boolean;
  cloned_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  topic_id: string;
  title: string;
  kind: string;
  max_score: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AssessmentItem {
  id: string;
  assessment_id: string;
  question_text: string;
  kind: string;
  sort_order: number;
  options: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAnswerKey {
  id: string;
  item_id: string;
  correct_answer: string;
  explanation: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Attempt {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number | null;
  submitted_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  item_id: string;
  student_answer: string | null;
  is_correct: boolean | null;
  points: number;
  created_at: string;
}

export interface LearningPath {
  id: string;
  student_id: string;
  title: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearningPathStep {
  id: string;
  learning_path_id: string;
  topic_id: string | null;
  step_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  student_id: string;
  source: RecommendationSource;
  recommendation_type: string;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface ProgressEvent {
  id: string;
  student_id: string;
  topic_id: string | null;
  assessment_id: string | null;
  event_type: string;
  event_value: number | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

// ---- New MVP tables ----

export interface Class {
  id: string;
  teacher_id: string;
  course_id: string;
  name: string;
  join_code: string;
  created_at: string;
  updated_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface StudentGuardian {
  id: string;
  student_id: string;
  guardian_id: string;
  linked_by: string | null;
  linked_at: string;
}

export interface StudentTopicMastery {
  id: string;
  student_id: string;
  topic_id: string;
  mastery_pct: number;
  attempts_count: number;
  last_assessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackSubmission {
  id: string;
  user_id: string;
  category: string;
  body: string;
  status: 'open' | 'reviewed' | 'resolved';
  created_at: string;
}

// ---- Dashboard view models ----
export interface DiagnosticStage {
  stage: 'core' | 'foundation' | 'challenge';
}

export interface StudentDashboardData {
  profile: Profile;
  nextRecommendation: Recommendation | null;
  masteryMap: StudentTopicMastery[];
  recentAttempts: (Attempt & { assessment_title: string; topic_title: string })[];
  learningPathSteps: LearningPathStep[];
  riskLevel: RiskLevel;
}

export interface ClassWithEnrollmentCount extends Class {
  enrollment_count: number;
}

export interface StudentMasterySummary {
  student_id: string;
  full_name: string | null;
  average_mastery: number;
  risk_level: RiskLevel;
  latest_attempt_at: string | null;
}

export interface TeacherDashboardData {
  profile: Profile;
  classes: ClassWithEnrollmentCount[];
  // Per selected class
  selectedClass: Class | null;
  roster: StudentMasterySummary[];
  recentAttempts: (Attempt & { student_name: string; assessment_title: string })[];
}

export interface ParentChildData {
  profile: Profile;
  mastery: StudentTopicMastery[];
  recentAttempts: (Attempt & { assessment_title: string })[];
  riskLevel: RiskLevel;
}

export interface ParentDashboardData {
  profile: Profile;
  children: ParentChildData[];
}

export interface AdminDashboardData {
  profile: Profile;
  userCount: Record<AppRole, number>;
  feedbackList: FeedbackSubmission[];
  templateCourses: Course[];
  guardianLinks: (StudentGuardian & { student_name: string; guardian_name: string })[];
}

// ---- Diagnostic grading types ----

export interface DiagnosticAnswer {
  item_id: string;
  student_answer: string;
}

export interface GradingResult {
  attempt_id: string;
  total_items: number;
  correct_count: number;
  score: number;
  next_stage: 'foundation' | 'challenge' | 'complete';
}
