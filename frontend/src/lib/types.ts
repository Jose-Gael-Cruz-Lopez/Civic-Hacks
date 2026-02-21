export interface GraphNode {
  id: string;
  concept_name: string;
  mastery_score: number;
  mastery_tier: 'mastered' | 'learning' | 'struggling' | 'unexplored';
  times_studied: number;
  last_studied_at: string | null;
  subject: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStats {
  total_nodes: number;
  mastered: number;
  learning: number;
  struggling: number;
  unexplored: number;
  streak: number;
}

export interface GraphUpdate {
  new_nodes: { concept_name: string; subject: string; initial_mastery: number }[];
  updated_nodes: { concept_name: string; mastery_delta: number; reason: string }[];
  new_edges: { source: string; target: string; strength: number }[];
  recommended_next: string[];
}

export interface MasteryChange {
  concept: string;
  before: number;
  after: number;
}

export type TeachingMode = 'socratic' | 'expository' | 'teachback';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  reply: string;
  graph_update: GraphUpdate;
  mastery_changes: MasteryChange[];
}

export interface SessionSummary {
  concepts_covered: string[];
  mastery_changes: MasteryChange[];
  new_connections: { source: string; target: string }[];
  time_spent_minutes: number;
  recommended_next: string[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: { label: string; text: string; correct: boolean }[];
  explanation: string;
  concept_tested: string;
  difficulty: string;
}

export interface QuizResult {
  question_id: number;
  selected: string;
  correct: boolean;
  correct_answer: string;
  explanation: string;
}

export interface QuizContext {
  weak_areas: string[];
  common_mistakes: string[];
  questions_seen_summary: string;
  recommended_difficulty: string;
  notes: string;
}

export interface Assignment {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
  assignment_type: string;
  notes: string | null;
  google_event_id: string | null;
}

export interface StudyBlockSuggestion {
  topic: string;
  suggested_date: string;
  duration_minutes: number;
  reason: string;
  related_assignment_id: string;
}

export interface Room {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  members?: RoomMember[];
}

export interface RoomMember {
  user_id: string;
  name: string;
  graph: KnowledgeGraph & { stats?: GraphStats };
}

export interface StudyMatch {
  partner: { id: string; name: string };
  you_can_teach: { concept: string; your_mastery: number; their_mastery: number }[];
  they_can_teach: { concept: string; their_mastery: number; your_mastery: number }[];
  shared_struggles: { concept: string; your_mastery: number; their_mastery: number }[];
  compatibility_score: number;
  summary: string;
}

export interface RoomActivity {
  id: string;
  user_name: string;
  activity_type: string;
  concept_name: string | null;
  detail: string;
  created_at: string;
}

export interface Recommendation {
  concept_name: string;
  reason: string;
}
