from typing import Optional, Union
from pydantic import BaseModel


# ── Learn ─────────────────────────────────────────────────────────────────────

class StartSessionBody(BaseModel):
    user_id: str = "user_john"
    topic: str = ""
    mode: str = "socratic"


class ChatBody(BaseModel):
    session_id: str
    user_id: str = "user_john"
    message: str
    mode: str = "socratic"


class EndSessionBody(BaseModel):
    session_id: str


class ActionBody(BaseModel):
    session_id: str
    user_id: str = "user_john"
    action_type: str = "hint"
    mode: str = "socratic"


# ── Quiz ──────────────────────────────────────────────────────────────────────

class GenerateQuizBody(BaseModel):
    user_id: str = "user_john"
    concept_node_id: str
    num_questions: int = 5
    difficulty: str = "medium"


class AnswerItem(BaseModel):
    question_id: Union[int, str]
    selected_label: str


class SubmitQuizBody(BaseModel):
    quiz_id: str
    answers: list[AnswerItem]


# ── Calendar ──────────────────────────────────────────────────────────────────

class AssignmentItem(BaseModel):
    title: str
    course_name: str = ""
    due_date: str
    assignment_type: str = "other"
    notes: Optional[str] = None


class SaveAssignmentsBody(BaseModel):
    user_id: str = "user_john"
    assignments: list[AssignmentItem]


class StudyBlockBody(BaseModel):
    user_id: str = "user_john"


# ── Social ────────────────────────────────────────────────────────────────────

class CreateRoomBody(BaseModel):
    user_id: str = "user_john"
    room_name: str = "Study Room"


class JoinRoomBody(BaseModel):
    user_id: str = "user_john"
    invite_code: str


class MatchBody(BaseModel):
    user_id: str = "user_john"


class ExportBody(BaseModel):
    user_id: str = "user_john"
    assignment_ids: list[str]
