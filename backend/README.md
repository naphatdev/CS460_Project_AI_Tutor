# Backend — AI Tutor

FastAPI backend สำหรับ AI Tutor

## ติดตั้ง

```bash
cd backend

# สร้าง virtual env
python -m venv venv

# Activate
# Windows (Git Bash):
source venv/Scripts/activate
# Windows (PowerShell):
# .\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

# ติดตั้ง deps
pip install -r requirements.txt

# คัดลอก .env.example เป็น .env แล้วเติมค่า
cp .env.example .env
```

## รัน

```bash
uvicorn main:app --reload
```

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- Redoc: `http://localhost:8000/redoc`

## โครงสร้าง

```
backend/
├── main.py                       # FastAPI app + endpoints
├── requirements.txt
├── .env.example
└── app/
    ├── models/
    │   └── schemas.py            # Pydantic models ตาม API_CONTRACT.md
    ├── services/
    │   ├── openrouter_client.py  # wrap OpenAI SDK ชี้ OpenRouter
    │   └── prompts.py            # Prompt 3 ชั้น (Base/Subject/Level)
    └── db/
        └── database.py           # SQLAlchemy setup
```

## หมายเหตุ

- ทุก endpoint ตอนนี้ return mock data ตามที่ระบุใน [../API_CONTRACT.md](../API_CONTRACT.md)
- งานถัดไป: implement จริงใน `app/services/` แล้วเรียกใน `main.py`
