import axios from 'axios'
import * as mock from './mockData'

// ถ้า backend ยังไม่เสร็จ ตั้ง VITE_USE_MOCK=true ใน .env เพื่อใช้ mock data
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// แปลง error จาก axios/backend ให้เป็นข้อความไทยที่เข้าใจง่าย
// fallback ไปที่ message จาก backend ถ้ามี (ตาม API_CONTRACT.md)
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data
    const backendMessage = data?.error?.message

    let message
    if (backendMessage) {
      message = backendMessage
    } else if (err.code === 'ERR_NETWORK') {
      message =
        'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบอินเทอร์เน็ต หรือว่า backend รันอยู่หรือไม่'
    } else if (err.code === 'ECONNABORTED') {
      message = 'เซิร์ฟเวอร์ตอบช้าเกินไป (timeout) — ลองอีกครั้ง'
    } else {
      const status = err.response?.status
      if (status === 429)
        message = 'ส่งคำขอเร็วเกินไป — รอสักครู่แล้วลองใหม่'
      else if (status === 502)
        message = 'AI service ขัดข้องชั่วคราว — ลองอีกครั้งใน 1–2 นาที'
      else if (status === 413)
        message = 'ไฟล์ใหญ่เกินกำหนด — ลดขนาดแล้วลองใหม่'
      else if (status && status >= 500)
        message = 'เซิร์ฟเวอร์มีปัญหา — ลองอีกครั้ง'
      else message = err.message ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
    }
    return Promise.reject(new Error(message))
  }
)

// ===== sessionStorage helpers สำหรับ retry flow =====
// เก็บ payload ที่ส่งไป /api/assess ครั้งล่าสุด เพื่อใช้สร้าง quiz ใหม่
// ตอน user ฝึกหัดไม่ผ่านแล้วกด "ลองประเมินอีกครั้ง"

const LAST_INPUT_KEY = 'ai-tutor:last-assessment-input'

export function saveLastAssessmentInput(input) {
  try {
    sessionStorage.setItem(LAST_INPUT_KEY, JSON.stringify(input))
  } catch {
    // sessionStorage อาจไม่พร้อม (private mode) — เงียบไว้
  }
}

export function loadLastAssessmentInput() {
  try {
    const raw = sessionStorage.getItem(LAST_INPUT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ===== Endpoints ตาม API_CONTRACT.md =====

export async function fetchSubjects() {
  if (USE_MOCK) return mock.subjects
  const { data } = await client.get('/api/subjects')
  return data
}

// อัปโหลดไฟล์ประกอบ (PDF/TXT/MD) → คืน file_ids สำหรับส่งต่อใน /api/assess
export async function uploadFiles(files) {
  if (USE_MOCK) return mock.mockUpload(files)
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  const { data } = await client.post('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // upload อาจช้ากว่า request ปกติ
  })
  return data
}

// เริ่ม assessment — รองรับ topic, custom_subject, file_ids เป็น optional
// ถ้าใช้วิชาที่ user เพิ่มเอง: subject_id = "custom" + ส่ง custom_subject = { name, description } คู่กัน
export async function startAssessment({
  subject_id,
  question,
  topic_id,
  custom_topic,
  custom_subject,
  file_ids,
}) {
  if (USE_MOCK) return mock.assessmentSession
  const { data } = await client.post('/api/assess', {
    subject_id,
    question,
    ...(topic_id ? { topic_id } : {}),
    ...(custom_topic ? { custom_topic } : {}),
    ...(custom_subject ? { custom_subject } : {}),
    ...(file_ids && file_ids.length ? { file_ids } : {}),
  })
  return data
}

export async function submitAssessment({ session_id, answers }) {
  if (USE_MOCK) return mock.assessmentResult
  const { data } = await client.post('/api/assess/submit', {
    session_id,
    answers,
  })
  return data
}

export async function requestExplanation({ session_id, level }) {
  if (USE_MOCK) return mock.explanation
  const { data } = await client.post('/api/explain', { session_id, level })
  return data
}

export async function requestExercise({ session_id, level }) {
  if (USE_MOCK) return mock.exercise
  const { data } = await client.post('/api/exercise', { session_id, level })
  return data
}

export async function submitExercise({ session_id, exercise_id, answer }) {
  if (USE_MOCK) return mock.exerciseResult
  const { data } = await client.post('/api/exercise/submit', {
    session_id,
    exercise_id,
    answer,
  })
  return data
}
