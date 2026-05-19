"""
In-memory session store — เก็บ state ระหว่าง steps ของ workflow
TODO: เปลี่ยนเป็น PostgreSQL เมื่อ Alembic migrations พร้อม
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class QuizItemRecord:
    id: str
    question: str
    choices: list[str]
    correct: str  # เก็บฝั่ง server ไม่ส่งให้ FE


@dataclass
class ExerciseRecord:
    exercise_id: str
    question: str
    type: str


@dataclass
class Session:
    subject_id: str
    question: str
    custom_subject_name: Optional[str] = None
    custom_subject_description: Optional[str] = None
    topic_id: Optional[str] = None
    custom_topic: Optional[str] = None
    quiz: list[QuizItemRecord] = field(default_factory=list)
    level: Optional[str] = None
    exercise: Optional[ExerciseRecord] = None


_store: dict[str, Session] = {}


def save(session_id: str, session: Session) -> None:
    _store[session_id] = session


def get(session_id: str) -> Optional[Session]:
    return _store.get(session_id)


def update(session_id: str, **kwargs) -> None:
    s = _store.get(session_id)
    if s:
        for k, v in kwargs.items():
            setattr(s, k, v)
