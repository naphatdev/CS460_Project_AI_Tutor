import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { submitAssessment } from '../services/api'

// สไตล์ของ level badge แต่ละระดับ — ใช้บนหน้า result
const LEVEL_STYLES = {
  beginner: {
    label: 'Beginner',
    desc: 'เริ่มต้นเรียนรู้',
    badge: 'bg-accent-50 text-accent-700 border-accent-200',
    dot: 'bg-accent-500',
  },
  intermediate: {
    label: 'Intermediate',
    desc: 'เข้าใจระดับกลาง',
    badge: 'bg-brand-50 text-brand-700 border-brand-200',
    dot: 'bg-brand-500',
  },
  advanced: {
    label: 'Advanced',
    desc: 'รู้ลึกระดับสูง',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
}

// หน้าทำ quiz ประเมินระดับ
// flow: รับ session จาก HomePage → ผู้ใช้เลือกคำตอบทุกข้อ →
//       submit → แสดงผล level/score/reasoning → กดปุ่มไปหน้า LearnPage
export default function AssessPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = location.state?.session

  // map ของคำตอบ: { question_id: "ตัวเลือกที่เลือก" }
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // ถ้าเข้าหน้านี้ตรง ๆ โดยไม่มี session (เช่น refresh) → กลับไปหน้าแรก
  if (!session) return <Navigate to="/" replace />

  const quiz = session.quiz ?? []
  const answeredCount = Object.keys(answers).length
  const allAnswered = quiz.length > 0 && quiz.every((q) => answers[q.id])
  const progressPct = quiz.length === 0 ? 0 : (answeredCount / quiz.length) * 100

  function selectChoice(questionId, choice) {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allAnswered) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        session_id: session.session_id,
        answers: quiz.map((q) => ({
          question_id: q.id,
          answer: answers[q.id],
        })),
      }
      const data = await submitAssessment(payload)
      setResult(data)
      // เลื่อนขึ้นข้างบนสุดเพื่อโชว์ผล (เผื่อ user scroll ลงระหว่างทำ quiz)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ===== Result mode (Step 3) =====
  if (result) {
    const lvl = LEVEL_STYLES[result.level] ?? LEVEL_STYLES.beginner
    const scorePct =
      result.total === 0 ? 0 : (result.score / result.total) * 100

    return (
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        <p className="text-[11px] font-semibold tracking-eyebrow text-gray-400 uppercase mb-4 text-center">
          ผลการประเมิน
        </p>

        <div className="bg-white rounded-3xl shadow-soft border border-gray-200 p-7 md:p-10">
          {/* Level badge */}
          <div className="text-center mb-7">
            <div
              className={`inline-flex flex-col items-center px-6 py-5 rounded-2xl border-2 ${lvl.badge}`}
            >
              <span className="text-[10px] font-semibold tracking-eyebrow uppercase opacity-70 mb-1.5">
                ระดับของคุณคือ
              </span>
              <span className="text-3xl md:text-4xl font-bold leading-none">
                {lvl.label}
              </span>
              <span className="text-sm opacity-80 mt-1.5">{lvl.desc}</span>
            </div>
          </div>

          {/* Score */}
          <div className="mb-6">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-semibold tracking-eyebrow text-gray-400 uppercase">
                คะแนน
              </span>
              <span className="text-sm font-semibold text-gray-900 font-mono">
                {result.score} / {result.total}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${lvl.dot} transition-all duration-700 ease-out`}
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          {/* Reasoning */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-7 border border-gray-100">
            <p className="text-[11px] font-semibold tracking-eyebrow text-gray-500 uppercase mb-2">
              เหตุผลจาก AI
            </p>
            <p className="text-gray-700 leading-relaxed">{result.reasoning}</p>
          </div>

          <button
            onClick={() =>
              navigate('/learn', {
                state: { session, level: result.level },
              })
            }
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-soft hover:shadow-md text-[15px]"
          >
            เริ่มเรียนเนื้อหา →
          </button>
        </div>
      </div>
    )
  }

  // ===== Quiz mode (Step 2) =====
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-eyebrow text-brand-600 uppercase mb-3">
          ขั้นประเมิน
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-2">
          ประเมินระดับความรู้
        </h1>
        <p className="text-[15px] text-gray-600 leading-relaxed">
          ตอบคำถาม {quiz.length} ข้อสั้น ๆ
          AI จะใช้คำตอบเพื่อปรับวิธีการสอนให้พอดีกับคุณ
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6 sticky top-[57px] z-10 bg-canvas/85 backdrop-blur-sm py-2 -mx-6 px-6">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="text-gray-500">
            ตอบครบ {answeredCount} จาก {quiz.length} ข้อ
          </span>
          <span className="font-mono text-gray-400">
            {Math.round(progressPct)}%
          </span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {quiz.map((q, idx) => (
          <fieldset
            key={q.id}
            className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6"
          >
            <legend className="flex items-center gap-2 text-[11px] font-semibold tracking-eyebrow uppercase mb-3 px-0">
              <span className="font-mono text-gray-400">
                Q{idx + 1} / {quiz.length}
              </span>
              {answers[q.id] && (
                <span className="text-accent-600">· ตอบแล้ว</span>
              )}
            </legend>
            <p className="text-gray-900 font-medium mb-4 leading-relaxed text-[15px]">
              {q.question}
            </p>
            <div className="space-y-2">
              {q.choices.map((choice) => {
                const selected = answers[q.id] === choice
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
                      name={q.id}
                      value={choice}
                      checked={selected}
                      onChange={() => selectChoice(q.id, choice)}
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
          </fieldset>
        ))}

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
          disabled={!allAnswered || submitting}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-soft hover:shadow-md text-[15px]"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              กำลังประเมิน...
            </span>
          ) : allAnswered ? (
            <>ส่งคำตอบ →</>
          ) : (
            <>ตอบให้ครบ {quiz.length} ข้อก่อน</>
          )}
        </button>
      </form>
    </div>
  )
}
