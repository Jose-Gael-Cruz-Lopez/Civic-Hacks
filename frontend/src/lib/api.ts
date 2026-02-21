const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

// Users
export const getUsers = () =>
  fetchJSON<{ users: { id: string; name: string; room_id: string | null }[] }>('/api/users');

// Graph
export const getGraph = (userId: string) =>
  fetchJSON<{ nodes: any[]; edges: any[]; stats: any }>(`/api/graph/${userId}`);

export const getRecommendations = (userId: string) =>
  fetchJSON<{ recommendations: any[] }>(`/api/graph/${userId}/recommendations`);

export const getUpcomingAssignments = (userId: string) =>
  fetchJSON<{ assignments: any[] }>(`/api/calendar/upcoming/${userId}`);

// Learn
export const startSession = (userId: string, topic: string, mode: string) =>
  fetchJSON<{ session_id: string; initial_message: string; graph_state: any }>('/api/learn/start-session', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, topic, mode }),
  });

export const sendChat = (sessionId: string, userId: string, message: string, mode: string) =>
  fetchJSON<{ reply: string; graph_update: any; mastery_changes: any[] }>('/api/learn/chat', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, user_id: userId, message, mode }),
  });

export const sendAction = (sessionId: string, userId: string, actionType: string, mode: string) =>
  fetchJSON<{ reply: string; graph_update: any }>('/api/learn/action', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, user_id: userId, action_type: actionType, mode }),
  });

export const endSession = (sessionId: string) =>
  fetchJSON<{ summary: any }>('/api/learn/end-session', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });

// Quiz
export const generateQuiz = (userId: string, conceptNodeId: string, numQuestions: number, difficulty: string) =>
  fetchJSON<{ quiz_id: string; questions: any[] }>('/api/quiz/generate', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, concept_node_id: conceptNodeId, num_questions: numQuestions, difficulty }),
  });

export const submitQuiz = (quizId: string, answers: any[]) =>
  fetchJSON<{ score: number; total: number; mastery_before: number; mastery_after: number; results: any[] }>('/api/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ quiz_id: quizId, answers }),
  });

// Calendar
export const extractSyllabus = (formData: FormData): Promise<any> => {
  return fetch(`${API_URL}/api/calendar/extract`, {
    method: 'POST',
    body: formData,
  }).then(r => r.json());
};

export const saveAssignments = (userId: string, assignments: any[]) =>
  fetchJSON<{ saved_count: number }>('/api/calendar/save', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, assignments }),
  });

export const getCalendarAuthUrl = () =>
  fetchJSON<{ url: string }>('/api/calendar/auth-url');

export const exportToGoogleCalendar = (userId: string, assignmentIds: string[]) =>
  fetchJSON<{ exported_count: number }>('/api/calendar/export', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, assignment_ids: assignmentIds }),
  });

// Social
export const createRoom = (userId: string, roomName: string) =>
  fetchJSON<{ room_id: string; invite_code: string }>('/api/social/rooms/create', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, room_name: roomName }),
  });

export const joinRoom = (userId: string, inviteCode: string) =>
  fetchJSON<{ room: any }>('/api/social/rooms/join', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, invite_code: inviteCode }),
  });

export const getUserRooms = (userId: string) =>
  fetchJSON<{ rooms: any[] }>(`/api/social/rooms/${userId}`);

export const getRoomOverview = (roomId: string) =>
  fetchJSON<{ room: any; members: any[]; ai_summary: string }>(`/api/social/rooms/${roomId}/overview`);

export const getRoomActivity = (roomId: string) =>
  fetchJSON<{ activities: any[] }>(`/api/social/rooms/${roomId}/activity`);

export const findStudyMatches = (roomId: string, userId: string) =>
  fetchJSON<{ matches: any[] }>(`/api/social/rooms/${roomId}/match`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
