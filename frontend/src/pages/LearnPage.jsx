import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { requestExplanation } from '../services/api'

// ป้ายชื่อระดับสำหรับ badge บนหัว page
const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

// หน้าอ่านคำอธิบายตามระดับ
// flow: รับ session+level จาก AssessPage → call /api/explain →
//       render explanation + key_points + examples → ปุ่มไปหน้า ExercisePage
export default function LearnPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, level } = location.state ?? {}

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    setError(null)
    requestExplanation({ session_id: session.session_id, level })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, level])

  // ถ้าเข้าหน้านี้ตรง ๆ โดยไม่มี session → กลับไปหน้าแรก
  if (!session) return <Navigate to="/" replace />

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-eyebrow text-brand-600 uppercase mb-3">
          บทเรียน
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            เนื้อหาที่ปรับให้คุณแล้ว
          </h1>
          {level && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold border border-brand-200">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              {LEVEL_LABEL[level] ?? level}
            </span>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4" aria-label="กำลังโหลดเนื้อหา" aria-busy="true">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <div className="h-3 bg-gray-100 rounded w-24 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
            <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      )}

      {error && !loading && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700"
        >
          <p className="font-semibold mb-1">โหลดเนื้อหาไม่สำเร็จ</p>
          <p>{error}</p>
        </div>
      )}

      {data && (
        <article className="space-y-5">
          {/* Main explanation */}
          <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 md:p-8">
            <h2 className="text-[11px] font-semibold tracking-eyebrow text-gray-400 uppercase mb-3">
              คำอธิบาย
            </h2>
            <p className="text-gray-800 leading-[1.8] text-[15px] whitespace-pre-line">
              {data.explanation}
            </p>
          </section>

          {/* Key points */}
          {data.key_points?.length > 0 && (
            <section className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 md:p-8">
              <h2 className="text-[11px] font-semibold tracking-eyebrow text-gray-400 uppercase mb-4">
                ประเด็นสำคัญ
              </h2>
              <ul className="space-y-3.5">
                {data.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-50 text-accent-700 text-xs font-bold shrink-0 mt-0.5 border border-accent-100">
                      {i + 1}
                    </span>
                    <span className="text-gray-700 leading-relaxed text-[15px]">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Examples */}
          {data.examples?.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold tracking-eyebrow text-gray-400 uppercase mb-3 px-1">
                ตัวอย่าง
              </h2>
              <div className="space-y-3">
                {data.examples.map((ex, i) => (
                  <details
                    key={i}
                    open={i === 0}
                    className="bg-white rounded-2xl shadow-soft border border-gray-200 group"
                  >
                    <summary className="cursor-pointer p-5 md:p-6 flex items-center justify-between gap-3 list-none">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-brand-600 font-semibold">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-semibold text-gray-900 text-[15px]">
                          {ex.title}
                        </h3>
                      </div>
                      <span
                        className="text-gray-400 group-open:rotate-180 transition-transform text-sm"
                        aria-hidden
                      >
                        ▾
                      </span>
                    </summary>
                    <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-1">
                      <p className="text-gray-700 leading-[1.8] text-[15px] whitespace-pre-line">
                        {ex.content}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() =>
                navigate('/exercise', { state: { session, level } })
              }
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all shadow-soft hover:shadow-md text-[15px]"
            >
              พร้อมแล้ว — ทำแบบฝึกหัด →
            </button>
            <button
              onClick={() => navigate('/')}
              className="sm:flex-none px-6 py-3.5 rounded-2xl text-gray-600 hover:bg-gray-100 transition-colors text-[15px] font-medium"
            >
              เลิก session
            </button>
          </div>
        </article>
      )}
    </div>
  )
}
