# API Contract — AI Tutor

> สัญญา API ระหว่าง **frontend** (React) และ **backend** (FastAPI)
> ทั้งสองฝั่งต้องยึดเอกสารนี้เป็นหลัก ห้ามใครฝ่ายหนึ่งแก้เอง

**Base URL (dev):** `http://localhost:8000`
**Prefix:** ทุก endpoint ขึ้นต้นด้วย `/api`
**Content-Type:** `application/json` ทั้ง request และ response

---

## สารบัญ Endpoint

| # | Method | Path | หน้าที่ |
|---|---|---|---|
| 1 | GET  | `/api/subjects`         | ดึงรายชื่อวิชา + topics |
| 2 | POST | `/api/upload`           | อัปโหลดไฟล์ประกอบ (PDF/TXT/MD) → ได้ file_ids |
| 3 | POST | `/api/assess`           | ขอ quiz ประเมินระดับ (รับ topic + file_ids ได้) |
| 4 | POST | `/api/assess/submit`    | ส่งคำตอบ quiz → ได้ระดับ |
| 5 | POST | `/api/explain`          | ขอคำอธิบายตามระดับ |
| 6 | POST | `/api/exercise`         | ขอแบบฝึกหัด |
| 7 | POST | `/api/exercise/submit`  | ส่งคำตอบแบบฝึกหัด → ได้ผล + feedback |

---

## รูปแบบ Error มาตรฐาน

ทุก error (4xx / 5xx) คืนรูปแบบเดียวกัน:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "subject_id is required",
    "details": {
      "field": "subject_id"
    }
  }
}
```

**Error codes ที่ใช้:**

| Code | HTTP | ความหมาย |
|---|---|---|
| `VALIDATION_ERROR`  | 400 | ข้อมูล request ไม่ถูกต้อง |
| `NOT_FOUND`         | 404 | ไม่พบ resource (เช่น session_id) |
| `LLM_ERROR`         | 502 | LLM/OpenRouter ตอบ error |
| `RATE_LIMIT`        | 429 | โดน rate limit |
| `INTERNAL_ERROR`    | 500 | error ที่ไม่คาดคิด |

---

## 1. GET `/api/subjects`

ดึงรายชื่อวิชาทั้งหมดที่ระบบรองรับ ใช้กับ dropdown ในหน้า HomePage

### Request

ไม่มี body / ไม่มี query params

### Response 200

```json
{
  "subjects": [
    {
      "id": "cs101",
      "name": "Introduction to Computer Science",
      "description": "พื้นฐาน programming, data structure เบื้องต้น",
      "topics": [
        { "id": "variables", "name": "Variables & Types" },
        { "id": "functions", "name": "Functions" }
      ]
    },
    {
      "id": "cs460",
      "name": "Artificial Intelligence",
      "description": "Search, Logic, ML, Neural Networks",
      "topics": [
        { "id": "search", "name": "Search Algorithms" },
        { "id": "logic",  "name": "Logic & Reasoning" },
        { "id": "ml",     "name": "Machine Learning" }
      ]
    }
  ]
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `id` | string | id ของวิชา ใช้ส่งใน `/api/assess` |
| `name` | string | ชื่อวิชาเต็ม |
| `description` | string | คำอธิบายสั้น ๆ ของวิชา |
| `topics` | array | หัวข้อย่อยในวิชา (อาจเป็น `[]`) — frontend ใช้แสดง chip |
| `topics[].id` | string | id ของหัวข้อ ใช้ส่งใน `/api/assess` ผ่าน `topic_id` |
| `topics[].name` | string | ชื่อหัวข้อแสดงใน UI |

### Status Codes

- `200 OK` — สำเร็จ
- `500 INTERNAL_ERROR` — error ภายใน

---

## 2. POST `/api/upload`

อัปโหลดไฟล์ประกอบสำหรับให้ AI ใช้เป็น context เพิ่ม (RAG)
ใช้ก่อนเรียก `/api/assess` — ได้ `file_id` กลับมาส่งต่อใน request

### Request

- **Content-Type:** `multipart/form-data`
- **Body field:** `files` (1–3 ไฟล์ในคำขอเดียว)
- **ประเภทที่รองรับ:** PDF, TXT, MD
- **ขนาดสูงสุด:** 10 MB ต่อไฟล์

### Response 200

```json
{
  "uploaded": [
    {
      "file_id": "f_abc12345",
      "filename": "lec07-astar.pdf",
      "size": 234567,
      "status": "ready"
    }
  ]
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `file_id` | string | id สำหรับส่งต่อใน `/api/assess` ผ่าน `file_ids[]` |
| `filename` | string | ชื่อไฟล์ต้นฉบับ |
| `size` | int | ขนาดไฟล์ (byte) |
| `status` | enum | `"ready"` (พร้อมใช้) / `"processing"` (กำลัง embed) / `"failed"` |

### Status Codes

- `200 OK` — อัปโหลดสำเร็จ
- `400 VALIDATION_ERROR` — ประเภทไฟล์ไม่รองรับ / เกิน 3 ไฟล์
- `413 PAYLOAD_TOO_LARGE` — ไฟล์ใหญ่เกิน 10 MB
- `500 INTERNAL_ERROR`

### ข้อตกลง lifecycle

- ไฟล์ที่อัปโหลดผูกกับ **session-scope** — หลังจาก `next_action: "pass"` จาก `/api/exercise/submit` แล้ว backend สามารถลบไฟล์ + embedding ทิ้งได้
- ถ้า user ไม่เรียก `/api/assess` ต่อภายใน 30 นาที backend ลบทิ้งได้

---

## 3. POST `/api/assess`

สร้าง quiz 2–3 ข้อ เพื่อประเมินระดับผู้เรียน

### Request Body

```json
{
  "subject_id": "cs460",
  "question": "อธิบาย A* search algorithm หน่อย",
  "topic_id": "search",
  "file_ids": ["f_abc12345", "f_def67890"]
}
```

หรือใช้ `custom_topic` แทน `topic_id` (mutually exclusive):

```json
{
  "subject_id": "cs460",
  "question": "...",
  "custom_topic": "Reinforcement Learning"
}
```

หรือใช้วิชาที่ user เพิ่มเอง (`subject_id: "custom"` + `custom_subject`):

```json
{
  "subject_id": "custom",
  "custom_subject": {
    "name": "Quantum Computing",
    "description": "Qubits, superposition, entanglement, quantum algorithms"
  },
  "question": "Bell state คืออะไร?"
}
```

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `subject_id` | string | ✅ | id ของวิชา จาก `/api/subjects` **หรือ** ค่าพิเศษ `"custom"` |
| `question`   | string | ✅ | คำถาม/หัวข้อที่นักศึกษาอยากเรียน |
| `custom_subject` | object | ⚠️ | ต้องส่ง **เมื่อ `subject_id === "custom"`** เท่านั้น |
| `custom_subject.name` | string | ✅* | ชื่อวิชาที่ user ตั้งเอง (≤60 ตัวอักษร) |
| `custom_subject.description` | string | ❌ | คำอธิบายช่วยให้ AI เข้าใจ scope (≤200 ตัวอักษร) |
| `topic_id`   | string | ❌ | id หัวข้อย่อยจาก `subjects[].topics[].id` |
| `custom_topic` | string | ❌ | หัวข้อที่ user พิมพ์เอง — **ห้ามส่งคู่กับ `topic_id`** |
| `file_ids`   | string[] | ❌ | file_ids ที่ได้จาก `/api/upload` (ใช้เป็น RAG context) |

> **หมายเหตุ prompt:**
> - ถ้า `subject_id` เป็นวิชา default → ใช้ subject prompt ที่ทีมเขียนไว้ (rich template) ใน Layer 2
> - ถ้า `subject_id === "custom"` → ใช้ generic template + inject `custom_subject.name`/`description` เข้า Layer 2
> - เมื่อมี `topic_id`/`custom_topic` → inject เป็น scope hint ใน Layer 2
> - เมื่อมี `file_ids` → retrieve chunks จาก ChromaDB ที่ map กับ session ก่อนสร้าง quiz

### Response 200

```json
{
  "session_id": "sess_abc123",
  "quiz": [
    {
      "id": "q1",
      "question": "Search algorithm ใดที่ใช้ heuristic?",
      "choices": ["BFS", "DFS", "A*", "Random"],
      "type": "multiple_choice"
    },
    {
      "id": "q2",
      "question": "Heuristic ที่ admissible หมายถึงอะไร?",
      "choices": [
        "ประเมินค่าจริงเกินไป",
        "ไม่ประเมินค่าเกินจริง",
        "ใช้ memory น้อย",
        "เร็วที่สุด"
      ],
      "type": "multiple_choice"
    }
  ]
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `session_id` | string | id ของ session เรียน (ใช้ใน step ถัด ๆ ไป) |
| `quiz` | array | รายการคำถาม 2–3 ข้อ |

### Status Codes

- `200 OK` — สำเร็จ
- `400 VALIDATION_ERROR` — subject_id / question ไม่ถูกต้อง
- `502 LLM_ERROR` — LLM ตอบ error

---

## 4. POST `/api/assess/submit`

ส่งคำตอบของ quiz เพื่อให้ระบบประเมินระดับ

### Request Body

```json
{
  "session_id": "sess_abc123",
  "answers": [
    { "question_id": "q1", "answer": "A*" },
    { "question_id": "q2", "answer": "ไม่ประเมินค่าเกินจริง" }
  ]
}
```

### Response 200

```json
{
  "session_id": "sess_abc123",
  "level": "intermediate",
  "score": 2,
  "total": 2,
  "reasoning": "ตอบถูกทั้งสองข้อ แสดงว่าเข้าใจพื้นฐาน A* แล้ว"
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `level` | enum | `"beginner"` / `"intermediate"` / `"advanced"` |
| `score` | int | คะแนนที่ได้ |
| `total` | int | คะแนนเต็ม |
| `reasoning` | string | เหตุผลที่ AI ประเมินระดับนี้ |

### Status Codes

- `200 OK`
- `400 VALIDATION_ERROR` — answers ไม่ครบ / format ผิด
- `404 NOT_FOUND` — ไม่พบ session_id

---

## 5. POST `/api/explain`

ขอคำอธิบายเนื้อหา ตามระดับที่ประเมินไว้

### Request Body

```json
{
  "session_id": "sess_abc123",
  "level": "intermediate"
}
```

### Response 200

```json
{
  "session_id": "sess_abc123",
  "explanation": "A* คือ search algorithm ที่ใช้ f(n) = g(n) + h(n) ...",
  "examples": [
    {
      "title": "หา route ที่สั้นที่สุด",
      "content": "สมมติแผนที่มี 5 จุด..."
    }
  ],
  "key_points": [
    "g(n) = cost จากจุดเริ่มต้นถึง n",
    "h(n) = heuristic estimate จาก n ถึง goal",
    "ต้องใช้ admissible heuristic จึง optimal"
  ]
}
```

### Status Codes

- `200 OK`
- `400 VALIDATION_ERROR`
- `404 NOT_FOUND`
- `502 LLM_ERROR`

---

## 6. POST `/api/exercise`

ขอแบบฝึกหัด 1 ข้อ ตามระดับ

### Request Body

```json
{
  "session_id": "sess_abc123",
  "level": "intermediate"
}
```

### Response 200

```json
{
  "session_id": "sess_abc123",
  "exercise_id": "ex_001",
  "question": "ถ้า heuristic h(n) ประเมินค่าเกินจริง A* จะยังหา optimal path ได้ไหม? เพราะอะไร?",
  "type": "short_answer",
  "hint": "ลองคิดถึงนิยาม admissible heuristic"
}
```

หรือเมื่อ `type === "multiple_choice"` ต้องส่ง `choices` มาด้วย:

```json
{
  "session_id": "sess_abc123",
  "exercise_id": "ex_002",
  "question": "Heuristic ที่ admissible หมายถึงอะไร?",
  "type": "multiple_choice",
  "choices": [
    "ประเมินค่าจริงเกินไป",
    "ไม่ประเมินค่าเกินจริง",
    "ใช้ memory น้อย",
    "เร็วที่สุด"
  ],
  "hint": null
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `type` | enum | `"short_answer"` / `"multiple_choice"` / `"code"` |
| `choices` | string[] | **บังคับเมื่อ `type === "multiple_choice"`** — รายการตัวเลือก (2–5 ตัว) |
| `hint` | string \| null | คำใบ้ (ถ้ามี) |

> **FE behavior:**
> - `short_answer` → textarea (≤ ~500 ตัวอักษร)
> - `multiple_choice` → radio cards ให้เลือก 1 ตัว ส่งค่าที่เลือก (string) เป็น `answer` ใน /api/exercise/submit
> - `code` → textarea monospace (≥ 10 บรรทัด)

### Status Codes

- `200 OK`
- `400 VALIDATION_ERROR`
- `404 NOT_FOUND`
- `502 LLM_ERROR`

---

## 7. POST `/api/exercise/submit`

ส่งคำตอบแบบฝึกหัด → ระบบตรวจและให้ feedback + บอกว่าควรไปต่อหรือวนกลับ

### Request Body

```json
{
  "session_id": "sess_abc123",
  "exercise_id": "ex_001",
  "answer": "ไม่ได้ เพราะ A* ต้องใช้ admissible heuristic..."
}
```

### Response 200

```json
{
  "session_id": "sess_abc123",
  "exercise_id": "ex_001",
  "correct": true,
  "score": 8,
  "max_score": 10,
  "feedback": "อธิบายเหตุผลได้ดี ครบถ้วน แต่ขาดตัวอย่างประกอบ",
  "next_action": "pass"
}
```

| Field | Type | คำอธิบาย |
|---|---|---|
| `correct` | boolean | คำตอบถูก/ผิด |
| `score` | int | คะแนนที่ได้ |
| `max_score` | int | คะแนนเต็ม |
| `feedback` | string | คำแนะนำ/คำติชม |
| `next_action` | enum | `"pass"` (จบ session) / `"retry"` (วนกลับ assess) |

### Status Codes

- `200 OK`
- `400 VALIDATION_ERROR`
- `404 NOT_FOUND`
- `502 LLM_ERROR`

---

## ข้อตกลงสำคัญ

> ⚠️ **ห้ามแก้ไข contract นี้คนเดียว**
>
> การเปลี่ยนแปลง endpoint ใด ๆ (เพิ่ม / ลด field, เปลี่ยน type, เปลี่ยนชื่อ) ต้องเปิด Pull Request และให้สมาชิกในทีม review อย่างน้อย **1 คน** จากฝั่งตรงข้าม (frontend แก้ → คน backend review, backend แก้ → คน frontend review)
>
> ถ้าไม่ทำตามนี้ จะเจอ bug ที่ debug ลำบาก เพราะสองฝั่งไม่ตรงกัน
