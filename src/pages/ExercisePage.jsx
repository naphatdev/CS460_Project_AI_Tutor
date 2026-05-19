import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import {
  requestExercise,
  submitExercise,
  startAssessment,
  loadLastAssessmentInput,
} from '../services/api'

// หน้าทำแบบฝึกหัด + รับ feedback
// flow:
//   1) รับ session+level จาก LearnPage → call /api/exercise ดึงโจทย์
//   2) user พิมพ์/เลือกคำตอบตาม exercise.type → submit → /api/exercise/submit
//   3) ตาม next_action: "pass" = จบ session, "retry" = สร้าง quiz ใหม่จาก input เดิม (ดู handleRetry)
export default function ExercisePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, level } = location.state ?? {}

  const [exercise, setExercise] = useState(null)
  const [answer, setAnswer] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    setError(null)
    requestExercise({ session_id: session.session_id, level })
      .then(setExercise)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, level])

  if (!session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!exercise || !answer.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await submitExercise({
        session_id: session.session_id,
        exercise_id: exercise.exercise_id,
        answer,
      })
      setResult(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ตอน user ฝึกหัดไม่ผ่าน → สร้าง quiz ใหม่จาก assessment input เดิม
  // (workflow ขั้นที่ 6 — วน loop กลับขั้นที่ 2 แต่ใช้ quiz ใหม่ ไม่ใช่ใบเดิม)
  async function handleRetry() {
    const input = loadLastAssessmentInput()
    if (!input) {
      // ไม่มี input เก่า (เปิด tab ใหม่?) → กลับ home ให้ user กรอกใหม่
      navigate('/')
      return
    }
    setRetrying(true)
    setError(null)
    try {
      const newSession = await startAssessment(input)
      navigate('/assess', { state: { session: newSession } })
    } catch (err) {
      setError(err.message)
      setRetrying(false)
    }
  }

  // ===== Result mode =====
  if (result) {
    const passed = result.next_action === 'pass'
    const scorePct =
      result.max_score === 0 ? 0 : (result.score / result.max_score) * 100

    return (
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        <p className="text-[11px] font-semibold tracking-eyebrow text-gray-400 uppercase mb-4 text-center">
          ผลการตรวจ
        </p>

        <div className="bg-white rounded-3xl shadow-soft border border-gray-200 p-7 md:p-10">
          {/* Status icon + headline */}
          <div className="text-center mb-7">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border-2 ${
                result.correct
                  ? 'bg-accent-50 text-accent-600 border-accent-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
              aria-hidden
            >
              <span className="text-3xl font-bold leading-none">
                {result.correct ? '✓' : '!'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-1.5">
              {result.correct ? 'ตอบถูก!' : 'เกือบแล้ว'}
            </h2>
            <p className="text-sm text-gray-500">
              {passed
                ? 'คุณผ่าน session นี้แล้ว'
                : 'AI แนะนำให้ประเมินระดับใหม่ด้วย quiz ใหม่'}
            </p>
          </div>

          {/* Score */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[11px] font-semibold tracking-eyebrow text-gray-400 uppercase">
                คะแนน
              </span>
              <span className="text-sm font-semibold text-gray-900 font-mono">
                {result.score} / {result.max_score}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  result.correct ? 'bg-accent-500' : 'bg-amber-500'
                }`}
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-7 border border-gray-100">
            <p className="text-[11px] font-semibold tracking-eyebrow text-gray-500 uppercase mb-2">
              Feedback จาก AI
            </p>
            <p className="text-gray-700 leading-relaxed">{result.feedback}</p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4"
            >
              {error}
            </div>
          )}

          {/* Actions ตาม next_action */}
          {passed ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-soft hover:shadow-md text-[15px]"
              >
                เริ่มหัวข้อใหม่
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-soft hover:shadow-md text-[15px]"
              >
                {retrying ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    กำลังสร้าง quiz ใหม่...
                  </span>
                ) : (
                  <>ลองประเมินอีกครั้ง →</>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={retrying}
                className="sm:flex-none px-6 py-3.5 rounded-2xl text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors text-[15px] font-medium"
              >
                เริ่มใหม่
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== Exercise mode =====
  // เช็คความพร้อมส่งคำตอบตามประเภท exercise (multiple_choice ไม่ต้อง trim)
  const isMultipleChoice = exercise?.type === 'multiple_choice'
  const isCode = exercise?.type === 'code'
  const canSubmit =
    !!exercise &&
    !submitting &&
    (isMultipleChoice ? !!answer : answer.trim().length > 0)

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-eyebrow text-brand-600 uppercase mb-3">
          แบบฝึกหัด
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">
          ลองทำดูสิ
        </h1>
        <p className="text-[15px] text-gray-600 leading-relaxed">
          ตอบโจทย์ด้านล่าง AI จะตรวจคำตอบและให้ feedback
          ถ้าผ่านจะจบ session ถ้ายังไม่ผ่านจะวนกลับไปประเมินใหม่
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3" aria-label="กำลังโหลดโจทย์" aria-busy="true">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 h-44 animate-pulse" />
        </div>
      )}

      {error && !loading && !exercise && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700"
        >
          <p className="font-semibold mb-1">โหลดโจทย์ไม่สำเร็จ</p>
          <p>{error}</p>
        </div>
      )}

      {exercise && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question card */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-gray-400 uppercase">
                {exercise.type.replace('_', ' ')}
              </span>
              {exercise.hint && (
                <button
                  type="button"
                  onClick={() => setShowHint((v) => !v)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1"
                >
                  {showHint ? 'ซ่อนคำใบ้' : 'ดูคำใบ้'}
                  <span aria-hidden>{showHint ? '▴' : '▾'}</span>
                </button>
              )}
            </div>
            <p className="text-gray-900 font-medium leading-relaxed text-[15px] mb-3 whitespace-pre-line">
              {exercise.question}
            </p>
            {showHint && exercise.hint && (
              <div className="bg-accent-50 border border-accent-100 rounded-xl px-4 py-3 text-sm text-accent-700 mt-3">
                <span className="font-semibold mr-1">คำใบ้:</span>
                {exercise.hint}
              </div>
            )}
          </div>

          {/* Answer card — render ตาม exercise.type */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6">
            <div className="block text-[11px] font-semibold tracking-eyebrow text-gray-500 uppercase mb-3">
              คำตอบของคุณ
            </div>

            {isMultipleChoice ? (
              // multiple_choice: ใช้ custom radio cards (เหมือนหน้า Assess)
              exercise.choices && exercise.choices.length > 0 ? (
                <div
                  className="space-y-2"
                  role="radiogroup"
                  aria-label="เลือกคำตอบ"
                >
                  {exercise.choices.map((choice) => {
                    const selected = answer === choice
                    return (
                      <label
                        key={choice}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selected
                            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-all ${
                            selected
                              ? 'border-brand-500 bg-brand-500'
                              : 'border-gray-300 bg-white'
                          }`}
                          aria-hidden
                        >
                          {selected && (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </span>
                        <input
                          type="radio"
                          name="exercise-answer"
                          value={choice}
                          checked={selected}
                          onChange={() => setAnswer(choice)}
                          className="sr-only"
                        />
                        <span
                          className={`text-gray-800 leading-relaxed ${
                            selected ? 'font-medium text-gray-900' : ''
                          }`}
                        >
                          {choice}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                // กรณี backend ส่ง type=multiple_choice มาแต่ไม่มี choices — fallback ปลอดภัย
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  ไม่มีตัวเลือกให้แสดง — กรุณาแจ้งทีมพัฒนา
                </p>
              )
            ) : (
              // short_answer / code: textarea (code ใช้ monospace + บรรทัดยาวขึ้น)
              <>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    isCode
                      ? '// พิมพ์ code ที่นี่...'
                      : 'พิมพ์คำตอบที่นี่ — อธิบายเหตุผลด้วยจะดีกว่า'
                  }
                  rows={isCode ? 10 : 6}
                  spellCheck={!isCode}
                  className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none transition-all leading-relaxed ${
                    isCode ? 'font-mono text-sm' : ''
                  }`}
                />
                <div className="text-xs text-gray-400 mt-2 text-right font-mono">
                  {answer.length} {isCode ? 'ตัวอักษร' : 'ตัวอักษร'}
                </div>
              </>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-soft hover:shadow-md text-[15px]"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI กำลังตรวจ...
              </span>
            ) : (
              <>ส่งคำตอบ →</>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
