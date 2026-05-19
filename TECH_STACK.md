# Tech Stack — AI Tutor

> เอกสารนี้รวมเครื่องมือทุกตัวที่ใช้ใน project พร้อมเหตุผลที่เลือก
> เป้าหมาย: ทุกคนในทีมเข้าใจตรงกันว่าทำไมเลือกตัวนี้ ไม่ใช่ตัวอื่น

---

## 1. Frontend

| Tool | Version | เหตุผลที่เลือก |
|---|---|---|
| **React** | 18.x | ทีมคุ้นที่สุด, ecosystem ใหญ่, component-based เหมาะกับหน้า UI ที่มี state เปลี่ยนบ่อย |
| **Vite** | 5.x | dev server เร็วมาก (HMR < 100ms), config น้อย, เร็วกว่า Create React App ทุกด้าน |
| **Tailwind CSS** | 3.x | สร้าง UI เร็ว ไม่ต้องตั้งชื่อ class เอง, file CSS เล็กเพราะ JIT |
| **React Router** | 6.x | routing ฝั่ง client มาตรฐาน, ใช้กับ 4 หน้าหลัก (Home / Assess / Learn / Exercise) |
| **Axios** | 1.x | HTTP client ที่จัดการ interceptors, error, base URL ได้ดีกว่า fetch ตรง ๆ |

**ทำไมไม่เลือก Next.js?** — Project นี้เป็น SPA ล้วน ๆ ไม่ต้องการ SSR / SEO และ Vite scaffold เร็วกว่า

---

## 2. Backend

| Tool | Version | เหตุผลที่เลือก |
|---|---|---|
| **Python** | 3.11+ | ภาษาหลักของ AI / ML, library LLM ครบ |
| **FastAPI** | 0.110+ | เร็ว (อันดับต้น ๆ ของ Python framework), auto-gen OpenAPI docs ที่ `/docs` ลด overhead การคุย API |
| **Pydantic** | 2.x | type validation ที่บังคับ schema ตรงกับ API_CONTRACT.md อัตโนมัติ |
| **Uvicorn** | latest | ASGI server มาตรฐานของ FastAPI |
| **python-dotenv** | latest | โหลด `.env` ตอน dev |

**ทำไมไม่เลือก Flask / Django?**
- Flask: ไม่มี type validation builtin, ต้องเขียน schema เอง
- Django: หนักเกินไป, มี ORM / admin ที่เราไม่ใช้

---

## 3. AI / LLM

| Tool | เหตุผลที่เลือก |
|---|---|
| **OpenRouter** | LLM Gateway รวม API ของ AI หลายตัวไว้ที่เดียว |
| **LangChain** | จัดการ prompt template, chain, RAG ได้ง่าย ไม่ต้องเขียนเอง |

### Models ที่ใช้ (ทุกตัวมี `:free` tier บน OpenRouter)

| Model | จุดเด่น | ใช้ที่ |
|---|---|---|
| **Llama 3.3 70B `:free`** | ฉลาด, ทำตามคำสั่งดี | งานทั่วไป (อธิบาย, ออก quiz) |
| **Qwen 2.5 72B `:free`** | จัดการภาษาจีน / ไทยได้ดี | คำอธิบายภาษาไทย |
| **DeepSeek R1 `:free`** | reasoning ดี, คิดเป็นขั้นเป็นตอน | ตรวจคำตอบ, ให้เหตุผล |

### ทำไมต้องใช้ OpenRouter แทน OpenAI ตรง ๆ?

1. **ฟรี** — ทุก model ที่ list ด้านบนมี `:free` tier ไม่ต้องจ่ายค่า API ก็ลองได้
2. **หลาย AI ในที่เดียว** — เปลี่ยน model ได้ด้วยการแก้ string เดียว ไม่ต้องเปลี่ยน SDK
3. **Fallback** — ถ้า model A ล่ม สลับไป B ได้ทันที (กันงาน demo เสีย)
4. **OpenAI-compatible API** — code ที่เขียนกับ OpenAI SDK ใช้กับ OpenRouter ได้เลย เปลี่ยนแค่ `base_url`
5. **ดู usage ที่เดียว** — ติดตาม token / cost ทุก model ใน dashboard เดียว

---

## 4. Prompt Engineering (3 ชั้น)

ระบบ prompt ของเราออกแบบเป็น **3 ชั้น ซ้อนกัน** เพื่อให้ปรับเปลี่ยนได้ยืดหยุ่นโดยไม่ต้องเขียน prompt ใหม่ทั้งก้อนทุกครั้ง

```
┌─────────────────────────────────────────────────┐
│  Layer 3: Level Prompt  (beginner/inter/adv)    │  ← เปลี่ยนตามผู้เรียน
├─────────────────────────────────────────────────┤
│  Layer 2: Subject Prompt (CS101, CS460, ...)    │  ← เปลี่ยนตามวิชา
├─────────────────────────────────────────────────┤
│  Layer 1: Base Prompt    (system, persona)      │  ← คงที่
└─────────────────────────────────────────────────┘
```

### Layer 1 — Base Prompt
นิยาม persona ของ AI Tutor (น้ำเสียง, จริยธรรม, ภาษา) คงที่ทุก request

> "คุณคือ AI Tutor ที่ใจดี อธิบายเรื่องยากให้เข้าใจง่าย ใช้ภาษาไทยเป็นหลัก ห้ามเดาคำตอบ ถ้าไม่รู้ให้บอกตรง ๆ..."

### Layer 2 — Subject Prompt
context เฉพาะของวิชา เพิ่มเข้ามาตาม `subject_id` ที่ user เลือก

> "วิชานี้คือ CS460 Artificial Intelligence ครอบคลุม Search, Logic, ML, Neural Networks เน้นความเข้าใจมากกว่าจำสูตร..."

### Layer 3 — Level Prompt
ปรับความยาก / ตัวอย่าง / ศัพท์ ตามระดับที่ประเมินได้

| ระดับ | แนวการสอน |
|---|---|
| **beginner** | ใช้ภาษาบ้าน ๆ, อุปมาเยอะ, หลีกเลี่ยงศัพท์เทคนิค |
| **intermediate** | ผสมศัพท์เทคนิคกับคำอธิบาย, ยกตัวอย่าง code ได้ |
| **advanced** | ใช้ศัพท์เทคนิคตรง ๆ, ลึกถึงคณิตศาสตร์ / proof |

### ทำไมแยกเป็น 3 ชั้น?
- เปลี่ยนระดับ → ไม่ต้องเขียน prompt วิชาใหม่
- เพิ่มวิชา → ไม่ต้องเขียน prompt ระดับใหม่
- ปรับ persona → ทุก request เปลี่ยนตามทันที

---

## 5. Database

| Tool | เหตุผลที่เลือก |
|---|---|
| **PostgreSQL** | RDBMS ที่นิยม, รองรับ JSON, มี extension เยอะ |
| **SQLAlchemy** | ORM ของ Python ที่ทำงานกับ FastAPI ได้ดี, รองรับ migration ผ่าน Alembic |
| **ChromaDB** | Vector DB สำหรับ RAG, ติดตั้งง่าย (embed ในแอปได้), ไม่ต้องตั้ง server แยก |

### โครงสร้างข้อมูล (คร่าว ๆ)

- **PostgreSQL** เก็บข้อมูล structured: session, user, quiz, exercise, score
- **ChromaDB** เก็บ embedding ของเนื้อหาวิชา (textbook, slide) สำหรับ RAG เวลา AI อธิบาย

---

## 6. DevOps / Tooling

| Tool | ใช้ทำอะไร |
|---|---|
| **Git + GitHub** | version control, PR review |
| **GitHub Actions** | (วางแผน) CI lint + test |
| **dotenv** | จัดการ secret ใน local |
| **VS Code** | IDE หลัก (มี extension Tailwind + Python + ESLint) |

---

## สรุปทำไม Stack นี้

- **เร็ว** — Vite + FastAPI ทั้งคู่เน้น dev experience เร็ว
- **ฟรี** — OpenRouter free models + Tailwind + Postgres ทุกอย่างไม่เสียเงิน
- **ยืดหยุ่น** — Prompt 3 ชั้น + OpenRouter เปลี่ยน model ได้ตลอด
- **เรียนรู้ง่าย** — เครื่องมือทุกตัวมี doc ดี เหมาะกับ project ระยะสั้น 1 เทอม
