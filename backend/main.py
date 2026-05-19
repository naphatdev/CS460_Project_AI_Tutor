"""
FastAPI entry point — AI Tutor backend
ทุก endpoint อ้างอิงตาม API_CONTRACT.md
"""
import json
import os
import re
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request

from app.models.schemas import (
    SubjectsResponse,
    UploadResponse,
    AssessRequest,
    AssessResponse,
    AssessSubmitRequest,
    AssessSubmitResponse,
    ExplainRequest,
    ExplainResponse,
    ExerciseRequest,
    ExerciseResponse,
    ExerciseSubmitRequest,
    ExerciseSubmitResponse,
    ErrorResponse,
)
from app.services import openrouter_client as llm
from app.services import session_store
from app.services.session_store import Session, QuizItemRecord, ExerciseRecord
from app.services.prompts import (
    build_quiz_messages,
    build_assess_submit_messages,
    build_explain_messages,
    build_exercise_messages,
    build_exercise_submit_messages,
)

load_dotenv(override=True)

app = FastAPI(
    title="AI Tutor API",
    description="Backend สำหรับ AI Tutor (CS460 Project)",
    version="0.1.0",
)

# CORS — อนุญาตให้ frontend (Vite dev server) เรียก API ได้
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ===== Helpers =====

def _extract_json(text: str):
    """แกะ JSON จาก LLM response ที่อาจมี markdown code block"""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    for pattern in (r"\[[\s\S]*\]", r"\{[\s\S]*\}"):
        m = re.search(pattern, text)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
    raise ValueError(f"parse JSON ล้มเหลว: {text[:300]}")


def _llm_call(messages: list[dict]) -> str:
    """เรียก LLM และ wrap error เป็น 502"""
    try:
        return llm.chat(messages, temperature=0.5)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc


def _require_session(session_id: str) -> session_store.Session:
    s = session_store.get(session_id)
    if s is None:
        raise HTTPException(status_code=404, detail=f"ไม่พบ session '{session_id}'")
    return s


# ===== Error handler — แปลงทุก HTTPException เป็น format ของ API_CONTRACT.md =====
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code_map = {
        400: "VALIDATION_ERROR",
        404: "NOT_FOUND",
        413: "PAYLOAD_TOO_LARGE",
        429: "RATE_LIMIT",
        500: "INTERNAL_ERROR",
        502: "LLM_ERROR",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code_map.get(exc.status_code, "INTERNAL_ERROR"),
                "message": str(exc.detail),
                "details": None,
            }
        },
    )


# ===== Health check =====
@app.get("/")
async def root():
    return {"status": "ok", "service": "AI Tutor API", "version": "0.1.0"}


# ===== 1. GET /api/subjects =====
@app.get("/api/subjects", response_model=SubjectsResponse)
async def get_subjects():
    """ดึงรายชื่อวิชาที่รองรับ"""
    return {
        "subjects": [
            {
                "id": "cs101",
                "name": "Introduction to Computer Science",
                "description": "พื้นฐาน programming, data structure เบื้องต้น",
                "topics": [
                    {"id": "variables", "name": "Variables & Types"},
                    {"id": "functions", "name": "Functions"},
                    {"id": "loops", "name": "Loops & Conditionals"},
                    {"id": "data_structures", "name": "Data Structures"},
                ],
            },
            {
                "id": "cs460",
                "name": "Artificial Intelligence",
                "description": "Search, Logic, ML, Neural Networks",
                "topics": [
                    {"id": "search", "name": "Search Algorithms"},
                    {"id": "logic", "name": "Logic & Reasoning"},
                    {"id": "ml", "name": "Machine Learning"},
                    {"id": "neural_net", "name": "Neural Networks"},
                ],
            },
            {
                "id": "cs350",
                "name": "Database Systems",
                "description": "SQL, ER diagram, normalization, transaction",
                "topics": [
                    {"id": "sql", "name": "SQL Queries"},
                    {"id": "er", "name": "ER Diagram"},
                    {"id": "normalization", "name": "Normalization"},
                    {"id": "transaction", "name": "Transactions"},
                ],
            },
        ]
    }


# ===== 2. POST /api/upload =====
@app.post("/api/upload", response_model=UploadResponse)
async def upload_files(files: list[UploadFile] = File(...)):
    """อัปโหลดไฟล์ประกอบ (PDF/TXT/MD) ≤ 10 MB, ≤ 3 ไฟล์"""
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="อัปโหลดได้สูงสุด 3 ไฟล์ต่อ request")

    uploaded = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in _ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"ไม่รองรับไฟล์ประเภท '{ext}' — รองรับ: .pdf, .txt, .md",
            )
        content = await file.read()
        size = len(content)
        if size > _MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"ไฟล์ '{file.filename}' ใหญ่เกิน 10 MB",
            )
        # TODO: บันทึกไฟล์จริง + สร้าง embedding ด้วย ChromaDB
        file_id = f"f_{uuid.uuid4().hex[:8]}"
        uploaded.append(
            {"file_id": file_id, "filename": file.filename, "size": size, "status": "ready"}
        )

    return {"uploaded": uploaded}


# ===== 3. POST /api/assess =====
@app.post("/api/assess", response_model=AssessResponse)
async def create_assessment(body: AssessRequest):
    """สร้าง quiz ประเมินระดับด้วย LLM"""
    custom_name = body.custom_subject.name if body.custom_subject else None
    custom_desc = body.custom_subject.description if body.custom_subject else None

    messages = build_quiz_messages(
        subject_id=body.subject_id,
        question=body.question,
        topic_id=body.topic_id,
        custom_topic=body.custom_topic,
        custom_subject_name=custom_name,
        custom_subject_description=custom_desc,
    )
    raw = _llm_call(messages)
    try:
        quiz_data = _extract_json(raw)
        if not isinstance(quiz_data, list):
            raise ValueError("LLM ไม่ได้คืน array")
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    quiz_records: list[QuizItemRecord] = []
    quiz_response = []

    for item in quiz_data:
        record = QuizItemRecord(
            id=item["id"],
            question=item["question"],
            choices=item["choices"],
            correct=item["correct"],
        )
        quiz_records.append(record)
        quiz_response.append(
            {
                "id": item["id"],
                "question": item["question"],
                "choices": item["choices"],
                "type": item.get("type", "multiple_choice"),
            }
        )

    session_store.save(
        session_id,
        Session(
            subject_id=body.subject_id,
            question=body.question,
            custom_subject_name=custom_name,
            custom_subject_description=custom_desc,
            topic_id=body.topic_id,
            custom_topic=body.custom_topic,
            quiz=quiz_records,
        ),
    )

    return {"session_id": session_id, "quiz": quiz_response}


# ===== 4. POST /api/assess/submit =====
@app.post("/api/assess/submit", response_model=AssessSubmitResponse)
async def submit_assessment(body: AssessSubmitRequest):
    """ส่งคำตอบ quiz → LLM ประเมินระดับ"""
    sess = _require_session(body.session_id)

    answer_map = {a.question_id: a.answer for a in body.answers}
    quiz_results = [
        {
            "id": q.id,
            "question": q.question,
            "correct": q.correct,
            "user_answer": answer_map.get(q.id, ""),
            "is_correct": answer_map.get(q.id, "") == q.correct,
        }
        for q in sess.quiz
    ]

    messages = build_assess_submit_messages(
        subject_id=sess.subject_id,
        quiz_results=quiz_results,
        custom_subject_name=sess.custom_subject_name,
        custom_subject_description=sess.custom_subject_description,
    )
    raw = _llm_call(messages)
    try:
        data = _extract_json(raw)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    level = data.get("level", "beginner")
    session_store.update(body.session_id, level=level)

    return {
        "session_id": body.session_id,
        "level": level,
        "score": data.get("score", sum(1 for r in quiz_results if r["is_correct"])),
        "total": data.get("total", len(quiz_results)),
        "reasoning": data.get("reasoning", ""),
    }


# ===== 5. POST /api/explain =====
@app.post("/api/explain", response_model=ExplainResponse)
async def request_explanation(body: ExplainRequest):
    """ขอคำอธิบายตามระดับด้วย prompt 3 ชั้น"""
    sess = _require_session(body.session_id)
    session_store.update(body.session_id, level=body.level)

    messages = build_explain_messages(
        subject_id=sess.subject_id,
        level=body.level,
        question=sess.question,
        topic_id=sess.topic_id,
        custom_topic=sess.custom_topic,
        custom_subject_name=sess.custom_subject_name,
        custom_subject_description=sess.custom_subject_description,
    )
    raw = _llm_call(messages)
    try:
        data = _extract_json(raw)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "session_id": body.session_id,
        "explanation": data.get("explanation", ""),
        "key_points": data.get("key_points", []),
        "examples": data.get("examples", []),
    }


# ===== 6. POST /api/exercise =====
@app.post("/api/exercise", response_model=ExerciseResponse)
async def request_exercise(body: ExerciseRequest):
    """ขอแบบฝึกหัด 1 ข้อจาก LLM"""
    sess = _require_session(body.session_id)

    messages = build_exercise_messages(
        subject_id=sess.subject_id,
        level=body.level,
        question=sess.question,
        topic_id=sess.topic_id,
        custom_topic=sess.custom_topic,
        custom_subject_name=sess.custom_subject_name,
        custom_subject_description=sess.custom_subject_description,
    )
    raw = _llm_call(messages)
    try:
        data = _extract_json(raw)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    exercise_id = f"ex_{uuid.uuid4().hex[:8]}"
    exercise_type = data.get("type", "short_answer")

    session_store.update(
        body.session_id,
        exercise=ExerciseRecord(
            exercise_id=exercise_id,
            question=data.get("question", ""),
            type=exercise_type,
        ),
    )

    return {
        "session_id": body.session_id,
        "exercise_id": exercise_id,
        "question": data.get("question", ""),
        "type": exercise_type,
        "choices": data.get("choices") if exercise_type == "multiple_choice" else None,
        "hint": data.get("hint"),
    }


# ===== 7. POST /api/exercise/submit =====
@app.post("/api/exercise/submit", response_model=ExerciseSubmitResponse)
async def submit_exercise(body: ExerciseSubmitRequest):
    """ส่งคำตอบแบบฝึกหัด → LLM ตรวจ + feedback + next_action"""
    sess = _require_session(body.session_id)
    if sess.exercise is None or sess.exercise.exercise_id != body.exercise_id:
        raise HTTPException(status_code=404, detail=f"ไม่พบ exercise '{body.exercise_id}'")

    messages = build_exercise_submit_messages(
        subject_id=sess.subject_id,
        level=sess.level or "intermediate",
        exercise_question=sess.exercise.question,
        exercise_type=sess.exercise.type,
        answer=body.answer,
        custom_subject_name=sess.custom_subject_name,
        custom_subject_description=sess.custom_subject_description,
    )
    raw = _llm_call(messages)
    try:
        data = _extract_json(raw)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "session_id": body.session_id,
        "exercise_id": body.exercise_id,
        "correct": data.get("correct", False),
        "score": data.get("score", 0),
        "max_score": data.get("max_score", 10),
        "feedback": data.get("feedback", ""),
        "next_action": data.get("next_action", "retry"),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
