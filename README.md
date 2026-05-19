# AI Tutor — CS460 Artificial Intelligence

> ระบบติวเตอร์ AI บนเว็บ ที่ประเมินระดับผู้เรียนก่อน แล้วปรับการสอนให้เหมาะกับแต่ละคน

โปรเจกต์รายวิชา **CS460 Artificial Intelligence** มหาวิทยาลัยกรุงเทพ
อาจารย์ผู้สอน: อ. Kittipat Savetratanakaree

---

## ปัญหาที่แก้

นักศึกษาในมหาวิทยาลัยมักเจอปัญหาเดิม ๆ เวลาเรียนวิชาเฉพาะทาง:

- **ถามอาจารย์ต้องรอ** — อาจารย์มีคิวยาว ตอบช้า บางทีไม่ได้คำตอบในวันนั้น
- **YouTube ไม่ตรงระดับ** — เนื้อหายากเกิน หรือพื้นเกินไป ไม่พอดีกับที่เราอยู่
- **ติวเตอร์แพง** — ค่าเรียนพิเศษเฉพาะทางสูง ไม่ใช่ทุกคนจ่ายไหว

**AI Tutor** แก้ปัญหาทั้งสามอย่างนี้ด้วยการให้ AI ทำหน้าที่ติวเตอร์ที่ปรับคำสอนตามระดับของผู้เรียนแต่ละคน

---

## Workflow

```
1. นักศึกษาเลือกวิชา + พิมพ์คำถามที่ไม่เข้าใจ
        ↓
2. AI ออก quiz 2–3 ข้อ → ประเมินระดับ (beginner / intermediate / advanced)
        ↓
3. AI อธิบายเนื้อหา + สร้างแบบฝึกหัด ตามระดับที่ประเมินได้
        ↓
4. นักศึกษาทำแบบฝึกหัด
        ↓
5. AI ตรวจ + ให้คะแนน + feedback
        ↓
6. ผ่าน → จบ session  /  ไม่ผ่าน → วนกลับขั้นที่ 2
```

---

## ทีมพัฒนา

| ชื่อ | รหัสนักศึกษา | หน้าที่ |
|---|---|---|
| พชร ต่อโชติ | 1660707702 | Frontend |
| ณภัทร ตั้งพาณิชกร | 1660700160 | Backend |
| กฤษภา อินทร์เปื้อย | 1660701507 | — |
| กิตติพัฒน์ สุริยันต์ | 1660701515 | — |

---

## Tech Stack (สรุปย่อ — รายละเอียดเต็มอยู่ใน [TECH_STACK.md](./TECH_STACK.md))

| ชั้น | เครื่องมือ |
|---|---|
| **Frontend** | React + Vite + Tailwind CSS + React Router + Axios |
| **Backend** | Python FastAPI + Pydantic + SQLAlchemy |
| **AI / LLM** | OpenRouter (Gateway) + LangChain |
| **Models** | Llama 3.3 70B `:free`, Qwen 2.5 72B `:free`, DeepSeek R1 `:free` |
| **Database** | PostgreSQL + ChromaDB (สำหรับ RAG) |

---

## โครงสร้างโปรเจกต์

```
CS460_Project_AI_Tutor/
├── frontend/              # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/         # HomePage, AssessPage, LearnPage, ExercisePage
│   │   ├── components/    # UI components ที่ reuse ได้
│   │   └── services/      # api.js (Axios) + mockData.js
│   └── package.json
│
├── backend/               # Python FastAPI
│   ├── app/
│   │   ├── models/        # Pydantic schemas
│   │   ├── services/      # OpenRouter client, RAG, logic
│   │   └── db/            # SQLAlchemy setup
│   ├── main.py            # FastAPI entry point
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                  # Proposal, workflow diagram
│
├── API_CONTRACT.md        # สัญญา API ระหว่าง frontend / backend
├── TECH_STACK.md          # รายละเอียด tech stack + เหตุผลที่เลือก
├── LICENSE
└── README.md
```

---

## วิธีรัน (Local Development)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

เปิดที่ `http://localhost:5173`

### Backend

```bash
cd backend

# สร้าง virtual env (ครั้งแรกครั้งเดียว)
python -m venv venv

# Activate
# Windows (Git Bash):
source venv/Scripts/activate
# Windows (PowerShell):
# .\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

# ติดตั้ง dependencies
pip install -r requirements.txt

# รัน server
uvicorn main:app --reload
```

เปิดที่ `http://localhost:8000` (docs ที่ `http://localhost:8000/docs`)

---

## Environment Variables

ทั้ง frontend และ backend ใช้ `.env` แยกของตัวเอง — **อย่า commit ไฟล์ `.env` เข้า git**

### Backend (`backend/.env`)

คัดลอกจาก `backend/.env.example` แล้วเติมค่า:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:password@localhost:5432/ai_tutor
```

สมัคร OpenRouter ที่ <https://openrouter.ai> เพื่อรับ API key (มี free credits + free models)

### Frontend (`frontend/.env`)

ถ้าจะ override URL ของ backend (default = `http://localhost:8000`):

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Branching & PR

- ห้าม push ตรงเข้า `main`
- ทุกการเปลี่ยนแปลงต้องผ่าน Pull Request และให้เพื่อนในทีม review อย่างน้อย 1 คน
- ตั้งชื่อ branch ตามรูปแบบ: `feature/<ชื่อ>`, `fix/<ชื่อ>`, `setup/<ชื่อ>`, `docs/<ชื่อ>`

---

## License

ดูที่ [LICENSE](./LICENSE)
