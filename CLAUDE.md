# CLAUDE.md — AI Tutor Project Context

> เอกสารนี้ Claude Code อ่านอัตโนมัติทุกครั้งที่เปิดโปรเจกต์
> ทุกคนในทีมที่ใช้ Claude Code จะเห็น context เดียวกัน
> **อัปเดตเมื่อสถานะโปรเจกต์เปลี่ยน** (เช่น merge PR, เปลี่ยนคนรับผิดชอบ)

---

## 1. โปรเจกต์โดยรวม

**AI Tutor** — ระบบติวเตอร์ AI บนเว็บ ที่ประเมินระดับผู้เรียนก่อนสอน แล้วปรับการสอนตามระดับ

- **รายวิชา:** CS460 Artificial Intelligence
- **อาจารย์ผู้สอน:** Kittipat Savetratanakaree
- **มหาวิทยาลัย:** มหาวิทยาลัยกรุงเทพ
- **รายละเอียด:** [README.md](./README.md)

### Workflow 6 ขั้น (locked in โดย proposal — ห้ามเปลี่ยน scope)

1. นักศึกษาเลือกวิชา + พิมพ์คำถาม
2. AI ออก quiz 2–3 ข้อ ประเมินระดับ
3. AI อธิบายเนื้อหา + สร้างแบบฝึกหัด ตามระดับ
4. นักศึกษาทำแบบฝึกหัด
5. AI ตรวจ + ให้ feedback
6. ผ่าน → จบ; ไม่ผ่าน → วน loop กลับขั้น 2 (สร้าง quiz ใหม่)

### Prompt Engineering 3 ชั้น (locked in)

```
Layer 1: Base (persona)        — คงที่
Layer 2: Subject (CS101, ...)  — เปลี่ยนตามวิชา
Layer 3: Level (b/i/a)         — เปลี่ยนตามผู้เรียน
```

หัวข้อย่อย (topics) + ไฟล์ประกอบของ user → inject เป็น **runtime context** ใน Layer 2
ไม่ใช่ "ชั้น" ใหม่ → ไม่กระทบโครงสร้าง proposal

---

## 2. ทีม + บทบาท

| ชื่อ | รหัสนักศึกษา | บทบาท | งานหลัก |
|---|---|---|---|
| **พชร ต่อโชติ** | 1660707702 | Frontend lead | React/Vite/Tailwind — UI ทั้งหมด |
| **ณภัทร ตั้งพาณิชกร** | 1660700160 | Backend | FastAPI + Pydantic + endpoint stubs |
| กฤษภา อินทร์เปื้อย | 1660701507 | Backend | TBD |
| กิตติพัฒน์ สุริยันต์ | 1660701515 | Backend | TBD |

---

## 3. สถานะปัจจุบัน

### Frontend — ✅ Feature-complete สำหรับ MVP (พชร)

หน้าครบ 4 หน้า + flow 6 ขั้น:
- HomePage: เลือกวิชา (default + custom เพิ่มเองได้) + topic chips + file upload + คำถาม
- AssessPage: quiz + ผลประเมิน
- LearnPage: เรียก `/api/explain` + render explanation/key_points/examples
- ExercisePage: รองรับ `type` ทั้ง 3 (short_answer / multiple_choice / code) + retry สร้าง quiz ใหม่

Safety nets ที่มี:
- ErrorBoundary at root
- 404 catch-all
- Splash spinner ระหว่างโหลด
- Friendly error messages (timeout / network / 5xx)
- localStorage สำหรับ custom subjects (per-browser)
- sessionStorage สำหรับ retry flow

ใช้ mock ได้ทันที: `frontend/.env` ตั้ง `VITE_USE_MOCK=true`

### Backend — 🟡 In progress (ณภัทร)

- Stub endpoints 6 ตัวใน [backend/main.py](./backend/main.py) (return canned data)
- Pydantic schemas พื้นฐานใน [backend/app/models/schemas.py](./backend/app/models/schemas.py)
- ยังไม่ implement LLM/RAG จริง — `# TODO:` ทุก endpoint
- **stub ยังไม่ตามที่ contract เปลี่ยน 2 รอบล่าสุด** (ดู section "ถ้าคุณคือ ณภัทร" ด้านล่าง)

---

## 4. Conventions (ทุกคนต้องทำตาม)

| | |
|---|---|
| **Comments + docs** | ภาษาไทย |
| **Identifiers (var/function/route/schema field)** | ภาษาอังกฤษ |
| **Branches** | `feature/<name>` / `fix/<name>` / `setup/<name>` / `docs/<name>` |
| **PR review** | ทุก PR ต้อง review อย่างน้อย 1 คน |
| **API contract** | ห้ามแก้คนเดียว ([API_CONTRACT.md](./API_CONTRACT.md)) — ต้อง review จากฝั่งตรงข้าม (FE แก้ → BE review, BE แก้ → FE review) |
| **Commits** | message สั้น clear, อธิบาย "ทำไม" มากกว่า "อะไร" |

---

## 5. ถ้าคุณคือ ณภัทร (Backend)

ยินดีต้อนรับ! งานที่ค้างอยู่ ณ ตอนนี้:

### Priority 1 — Sync backend stub ตาม contract ใหม่ (frontend รออยู่)

มีการเปลี่ยน contract 4 จุดที่ FE เพิ่ม แต่ BE stub ยังตามไม่ทัน
ทั้งหมด **ยังไม่ต้องเรียก LLM จริง** — แค่ใส่ canned response ให้ schema match ก่อน

| # | จุดที่ต้องแก้ | ไฟล์ |
|---|---|---|
| 1 | `GET /api/subjects` — เพิ่ม `topics[]` (array ของ `{ id, name }`) ใน subject แต่ละตัว | [backend/main.py](./backend/main.py) + [schemas.py](./backend/app/models/schemas.py) |
| 2 | **NEW** `POST /api/upload` — multipart upload, รองรับ PDF/TXT/MD ≤ 10MB, ≤ 3 ไฟล์/request, คืน `{ uploaded: [{ file_id, filename, size, status }] }` | เพิ่ม endpoint + schema ใหม่ |
| 3 | `POST /api/assess` — รับ optional 4 fields: `topic_id`, `custom_topic`, `custom_subject: { name, description }`, `file_ids: string[]` | อัปเดต `AssessRequest` |
| 4 | `POST /api/exercise` — คืน `choices: string[]` เมื่อ `type === "multiple_choice"` | อัปเดต `ExerciseResponse` |

**Spec เต็มอยู่ที่:** [API_CONTRACT.md](./API_CONTRACT.md) — อ่านส่วน endpoint #1, #2, #3, #6

**Workflow แนะนำ:**
1. `git checkout -b feature/sync-stubs-to-contract`
2. แก้ [schemas.py](./backend/app/models/schemas.py) ก่อน (เพิ่ม field ตาม contract)
3. แก้ [main.py](./backend/main.py) ให้ stub return ข้อมูลที่มี field ครบ
4. ทดสอบที่ Swagger UI: `uvicorn main:app --reload` แล้วเปิด <http://localhost:8000/docs>
5. เปิด PR ให้พชร review (เพราะ FE จะเป็นคนใช้)
6. Merge → พชร flip `VITE_USE_MOCK=false` test E2E ทันที

### Priority 2 — Implement LLM/RAG จริง (งานใหญ่)

ทุก `# TODO:` comment ใน [main.py](./backend/main.py):
- เรียก **OpenRouter API** ผ่าน [openrouter_client.py](./backend/app/services/openrouter_client.py)
- ใช้ prompt 3 ชั้น ที่ [prompts.py](./backend/app/services/prompts.py)
- **RAG:** เก็บ file embeddings ใน ChromaDB scoped to `session_id`, retrieve chunks ตอนสร้าง prompt
- Models ที่ใช้: Llama 3.3 70B (ทั่วไป), Qwen 2.5 72B (ไทย), DeepSeek R1 (reasoning)

**Workflow แนะนำ:** implement endpoint ทีละตัวตามลำดับ workflow:
1. `/api/assess` (ออก quiz)
2. `/api/assess/submit` (ประเมินระดับ)
3. `/api/explain` (อธิบาย)
4. `/api/exercise` + `/api/exercise/submit` (โจทย์ + ตรวจ)

---

## 6. ถ้าคุณคือ พชร (Frontend)

Frontend MVP เสร็จแล้ว ระหว่างรอ backend คุณทำได้:

- **รอ ณภัทร merge PR** sync stubs → flip `VITE_USE_MOCK=false` test E2E
- **Polish เพิ่มเติม:** a11y audit (Lighthouse), dark mode, animation transition ระหว่าง step, sync custom subjects ข้าม tab (storage event)
- **เขียน end-to-end test** (Playwright/Cypress) สำหรับ flow 6 ขั้น
- **ทดสอบ flow จริงกับ backend จริง** หลัง ณภัทร implement LLM

---

## 7. ถ้าคุณคือ กฤษภา / กิตติพัฒน์

ยังไม่ได้กำหนด scope ชัด — คุยกับณภัทรเรื่องแบ่งงาน backend งานที่น่าจะแบ่ง:

- **Alembic migrations** สำหรับ PostgreSQL (สร้าง schema จริงแทน in-memory)
- **Test suite** (pytest) สำหรับทุก endpoint
- **RAG indexing pipeline** — chunk + embed PDF, store ChromaDB
- **OpenRouter integration** ช่วยณภัทร
- **Persistence ของ session/score** (เก็บประวัติการเรียนใน Postgres)

---

## 8. ไฟล์สำคัญ (pointer)

| ไฟล์ | คือ |
|---|---|
| [README.md](./README.md) | Overview + setup instruction |
| [API_CONTRACT.md](./API_CONTRACT.md) | **Source of truth** ของ API ระหว่าง FE/BE |
| [TECH_STACK.md](./TECH_STACK.md) | เหตุผลที่เลือกแต่ละ tool |
| [frontend/.env.example](./frontend/.env.example) | template env vars ของ FE |
| [frontend/src/services/api.js](./frontend/src/services/api.js) | FE axios client + USE_MOCK toggle |
| [frontend/src/services/mockData.js](./frontend/src/services/mockData.js) | Mock data ของทุก endpoint (ตรงกับ contract) |
| [backend/main.py](./backend/main.py) | FastAPI entry point + endpoint stubs |
| [backend/app/models/schemas.py](./backend/app/models/schemas.py) | Pydantic schemas ของทุก endpoint |
| [backend/app/services/prompts.py](./backend/app/services/prompts.py) | Prompt 3 ชั้น (Base + Subject + Level) |
| [backend/app/services/openrouter_client.py](./backend/app/services/openrouter_client.py) | OpenRouter LLM client |

---

## 9. Quick commands

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/Scripts/activate    # Git Bash on Windows
pip install -r requirements.txt
uvicorn main:app --reload       # http://localhost:8000  · Swagger /docs
```

**Mock mode (FE without BE):**
```bash
# ใน frontend/.env
VITE_USE_MOCK=true
```
