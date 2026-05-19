"""
Prompt template 3 ชั้น — ดู TECH_STACK.md (หัวข้อ Prompt Engineering)
   Layer 1 (Base)     — persona / น้ำเสียง ของ AI Tutor
   Layer 2 (Subject)  — context เฉพาะวิชา
   Layer 3 (Level)    — ความยาก / ภาษา ตามระดับผู้เรียน
"""
from typing import Literal, Optional

Level = Literal["beginner", "intermediate", "advanced"]

# ===== Layer 1: Base =====
BASE_PROMPT = """\
คุณคือ AI Tutor ที่ใจดี อดทน อธิบายเรื่องยากให้เข้าใจง่าย
- ใช้ภาษาไทยเป็นหลัก
- ห้ามเดาคำตอบ ถ้าไม่รู้ให้บอกตรง ๆ
- ตอบให้กระชับและตรงประเด็น
"""

# ===== Layer 2: Subject =====
SUBJECT_PROMPTS: dict[str, str] = {
    "cs101": (
        "วิชานี้คือ Introduction to Computer Science ครอบคลุม "
        "programming พื้นฐาน, data structure เบื้องต้น, algorithm พื้นฐาน"
    ),
    "cs460": (
        "วิชานี้คือ Artificial Intelligence ครอบคลุม Search, Logic, "
        "Machine Learning, Neural Networks เน้นความเข้าใจมากกว่าจำสูตร"
    ),
    "cs350": (
        "วิชานี้คือ Database Systems ครอบคลุม SQL, ER diagram, "
        "normalization, transaction"
    ),
}

# ===== Layer 3: Level =====
LEVEL_PROMPTS: dict[str, str] = {
    "beginner": (
        "ผู้เรียนเพิ่งเริ่มต้น ใช้ภาษาบ้าน ๆ ยกอุปมาเปรียบเทียบ "
        "หลีกเลี่ยงศัพท์เทคนิคที่ยังไม่ได้นิยาม"
    ),
    "intermediate": (
        "ผู้เรียนพอมีพื้นฐาน ใช้ศัพท์เทคนิคได้ "
        "แต่ต้องอธิบายควบคู่ ยกตัวอย่าง code ประกอบได้"
    ),
    "advanced": (
        "ผู้เรียนเข้าใจพื้นฐานดีแล้ว ใช้ศัพท์เทคนิคตรง ๆ "
        "ลงรายละเอียดคณิตศาสตร์ / proof ได้"
    ),
}


def build_system_prompt(
    subject_id: str,
    level: Optional[str] = None,
    custom_subject_name: Optional[str] = None,
    custom_subject_description: Optional[str] = None,
) -> str:
    """ประกอบ prompt 3 ชั้นเข้าด้วยกัน รองรับ custom subject"""
    parts = [BASE_PROMPT.strip()]
    if subject_id == "custom" and custom_subject_name:
        subject_ctx = f"วิชานี้คือ {custom_subject_name}"
        if custom_subject_description:
            subject_ctx += f" — {custom_subject_description}"
        parts.append(subject_ctx)
    elif subject_id in SUBJECT_PROMPTS:
        parts.append(SUBJECT_PROMPTS[subject_id])
    if level and level in LEVEL_PROMPTS:
        parts.append(LEVEL_PROMPTS[level])
    return "\n\n".join(parts)


def _topic_hint(topic_id: Optional[str], custom_topic: Optional[str]) -> str:
    if custom_topic:
        return f"หัวข้อที่ต้องการเรียน: {custom_topic}"
    if topic_id:
        return f"หัวข้อย่อย: {topic_id}"
    return ""


def _json_only_suffix() -> str:
    return "\n\nตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกจาก JSON"


# ===== Message builders สำหรับแต่ละ endpoint =====

def build_quiz_messages(
    subject_id: str,
    question: str,
    topic_id: Optional[str] = None,
    custom_topic: Optional[str] = None,
    custom_subject_name: Optional[str] = None,
    custom_subject_description: Optional[str] = None,
) -> list[dict]:
    """Messages สำหรับสร้าง quiz ประเมินระดับ"""
    system = build_system_prompt(
        subject_id,
        custom_subject_name=custom_subject_name,
        custom_subject_description=custom_subject_description,
    ) + _json_only_suffix()

    topic = _topic_hint(topic_id, custom_topic)
    user = f'สร้าง quiz 2-3 ข้อแบบ multiple_choice เพื่อประเมินระดับความรู้เกี่ยวกับ: "{question}"'
    if topic:
        user += f"\n{topic}"
    user += """

แต่ละข้อมีตัวเลือก 4 ตัว ต้องมีคำตอบที่ถูกต้องอยู่ใน choices และระบุใน field "correct"
ตอบด้วย JSON array เท่านั้น รูปแบบ:
[
  {
    "id": "q1",
    "question": "คำถาม?",
    "choices": ["ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D"],
    "correct": "ตัวเลือก A",
    "type": "multiple_choice"
  }
]"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def build_assess_submit_messages(
    subject_id: str,
    quiz_results: list[dict],
    custom_subject_name: Optional[str] = None,
    custom_subject_description: Optional[str] = None,
) -> list[dict]:
    """Messages สำหรับประเมินระดับหลังส่งคำตอบ quiz"""
    system = build_system_prompt(
        subject_id,
        custom_subject_name=custom_subject_name,
        custom_subject_description=custom_subject_description,
    ) + _json_only_suffix()

    score = sum(1 for r in quiz_results if r["is_correct"])
    total = len(quiz_results)
    results_text = "\n".join(
        f"ข้อ {r['id']}: {r['question']}\n"
        f"  คำตอบที่ถูก: {r['correct']}\n"
        f"  คำตอบผู้เรียน: {r['user_answer']} ({'ถูก' if r['is_correct'] else 'ผิด'})"
        for r in quiz_results
    )
    user = f"""ผู้เรียนตอบ quiz ได้ {score}/{total} ข้อ รายละเอียด:

{results_text}

ประเมินระดับผู้เรียน (beginner/intermediate/advanced) พร้อมเหตุผล
ตอบด้วย JSON เท่านั้น รูปแบบ:
{{
  "level": "intermediate",
  "score": {score},
  "total": {total},
  "reasoning": "เหตุผลที่ประเมินระดับนี้"
}}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def build_explain_messages(
    subject_id: str,
    level: str,
    question: str,
    topic_id: Optional[str] = None,
    custom_topic: Optional[str] = None,
    custom_subject_name: Optional[str] = None,
    custom_subject_description: Optional[str] = None,
) -> list[dict]:
    """Messages สำหรับอธิบายเนื้อหาตามระดับ"""
    system = build_system_prompt(
        subject_id,
        level=level,
        custom_subject_name=custom_subject_name,
        custom_subject_description=custom_subject_description,
    ) + _json_only_suffix()

    topic = _topic_hint(topic_id, custom_topic)
    user = f'อธิบายเนื้อหาเกี่ยวกับ: "{question}"'
    if topic:
        user += f"\n{topic}"
    user += f"\nระดับผู้เรียน: {level}"
    user += """

ตอบด้วย JSON เท่านั้น รูปแบบ:
{
  "explanation": "คำอธิบายหลัก (2-4 ย่อหน้า)",
  "key_points": ["จุดสำคัญ 1", "จุดสำคัญ 2", "จุดสำคัญ 3"],
  "examples": [
    {"title": "ชื่อตัวอย่าง", "content": "รายละเอียดตัวอย่าง"}
  ]
}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def build_exercise_messages(
    subject_id: str,
    level: str,
    question: str,
    topic_id: Optional[str] = None,
    custom_topic: Optional[str] = None,
    custom_subject_name: Optional[str] = None,
    custom_subject_description: Optional[str] = None,
) -> list[dict]:
    """Messages สำหรับสร้างแบบฝึกหัด"""
    system = build_system_prompt(
        subject_id,
        level=level,
        custom_subject_name=custom_subject_name,
        custom_subject_description=custom_subject_description,
    ) + _json_only_suffix()

    topic = _topic_hint(topic_id, custom_topic)
    user = f'สร้างแบบฝึกหัด 1 ข้อเกี่ยวกับ: "{question}"'
    if topic:
        user += f"\n{topic}"
    user += f"\nระดับผู้เรียน: {level}"
    user += """

เลือกประเภทที่เหมาะกับเนื้อหา: short_answer, multiple_choice, หรือ code
ถ้าเลือก multiple_choice ต้องมี choices 4 ตัว ถ้าประเภทอื่น choices ให้เป็น null

ตอบด้วย JSON เท่านั้น รูปแบบ:
{
  "question": "คำถามแบบฝึกหัด",
  "type": "short_answer",
  "choices": null,
  "hint": "คำใบ้ (หรือ null ถ้าไม่มี)"
}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def build_exercise_submit_messages(
    subject_id: str,
    level: str,
    exercise_question: str,
    exercise_type: str,
    answer: str,
    custom_subject_name: Optional[str] = None,
    custom_subject_description: Optional[str] = None,
) -> list[dict]:
    """Messages สำหรับตรวจคำตอบแบบฝึกหัด"""
    system = build_system_prompt(
        subject_id,
        level=level,
        custom_subject_name=custom_subject_name,
        custom_subject_description=custom_subject_description,
    ) + _json_only_suffix()

    user = f"""ตรวจคำตอบแบบฝึกหัด:
คำถาม: {exercise_question}
ประเภท: {exercise_type}
คำตอบของผู้เรียน: {answer}

ให้คะแนนเต็ม 10 และ feedback ที่สร้างสรรค์
next_action = "pass" ถ้าเข้าใจดีพอ (score >= 7), "retry" ถ้ายังต้องทบทวน

ตอบด้วย JSON เท่านั้น รูปแบบ:
{{
  "correct": true,
  "score": 8,
  "max_score": 10,
  "feedback": "ข้อดีและข้อควรปรับปรุง",
  "next_action": "pass"
}}"""
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]
