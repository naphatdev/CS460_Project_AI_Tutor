"""
Pydantic schemas — ตรงกับ API_CONTRACT.md ทุก field
ใช้ทั้ง request validation และ response serialization
"""
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ===== Common =====
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


# ===== Subjects =====
class Topic(BaseModel):
    id: str
    name: str


class Subject(BaseModel):
    id: str
    name: str
    description: str
    topics: list[Topic] = []


class SubjectsResponse(BaseModel):
    subjects: list[Subject]


# ===== Upload =====
class UploadedFile(BaseModel):
    file_id: str
    filename: str
    size: int
    status: Literal["ready", "processing", "failed"]


class UploadResponse(BaseModel):
    uploaded: list[UploadedFile]


# ===== Assess =====
class CustomSubject(BaseModel):
    name: str = Field(..., max_length=60)
    description: Optional[str] = Field(None, max_length=200)


class AssessRequest(BaseModel):
    subject_id: str = Field(..., description="id ของวิชา หรือ 'custom'")
    question: str = Field(..., min_length=1, description="คำถามที่นักศึกษาอยากเรียน")
    topic_id: Optional[str] = None
    custom_topic: Optional[str] = None
    custom_subject: Optional[CustomSubject] = None
    file_ids: Optional[list[str]] = None


QuizType = Literal["multiple_choice"]


class QuizItem(BaseModel):
    id: str
    question: str
    choices: list[str]
    type: QuizType


class AssessResponse(BaseModel):
    session_id: str
    quiz: list[QuizItem]


# ===== Assess Submit =====
class QuizAnswer(BaseModel):
    question_id: str
    answer: str


class AssessSubmitRequest(BaseModel):
    session_id: str
    answers: list[QuizAnswer]


Level = Literal["beginner", "intermediate", "advanced"]


class AssessSubmitResponse(BaseModel):
    session_id: str
    level: Level
    score: int
    total: int
    reasoning: str


# ===== Explain =====
class ExplainRequest(BaseModel):
    session_id: str
    level: Level


class ExplanationExample(BaseModel):
    title: str
    content: str


class ExplainResponse(BaseModel):
    session_id: str
    explanation: str
    examples: list[ExplanationExample]
    key_points: list[str]


# ===== Exercise =====
class ExerciseRequest(BaseModel):
    session_id: str
    level: Level


ExerciseType = Literal["short_answer", "multiple_choice", "code"]


class ExerciseResponse(BaseModel):
    session_id: str
    exercise_id: str
    question: str
    type: ExerciseType
    choices: Optional[list[str]] = None
    hint: Optional[str] = None


# ===== Exercise Submit =====
class ExerciseSubmitRequest(BaseModel):
    session_id: str
    exercise_id: str
    answer: str


NextAction = Literal["pass", "retry"]


class ExerciseSubmitResponse(BaseModel):
    session_id: str
    exercise_id: str
    correct: bool
    score: int
    max_score: int
    feedback: str
    next_action: NextAction
