import { Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AssessPage from './pages/AssessPage'
import LearnPage from './pages/LearnPage'
import ExercisePage from './pages/ExercisePage'
import NotFoundPage from './pages/NotFoundPage'

// แม็พ path → ลำดับ "หน้า" (1..4) ใช้คำนวณ progress bar บน header
// หมายเหตุ: workflow จริงมี 6 ขั้น แต่ขั้น 3 และ 6 เป็น sub-state ภายในหน้า
// (assess: quiz→result, exercise: question→feedback) จึงแสดงเป็น 4 ขั้นบน UI
const PATH_TO_STEP = {
  '/': 1,
  '/assess': 2,
  '/learn': 3,
  '/exercise': 4,
}
const TOTAL_STEPS = 4

// Layout หลักของแอป — header (logo + วิชา) + thin progress bar + content + footer
function App() {
  const location = useLocation()
  const step = PATH_TO_STEP[location.pathname] ?? 1
  const progressPct = (step / TOTAL_STEPS) * 100

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/85 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center text-[15px] font-bold shadow-soft"
              aria-hidden
            >
              ◆
            </span>
            <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
              AI Tutor
            </span>
          </Link>
          <div className="text-[11px] font-medium tracking-eyebrow uppercase text-gray-400 hidden sm:block">
            CS460 · Artificial Intelligence
          </div>
        </div>
        {/* แถบ progress บาง ๆ ใต้ header — บอกว่าผู้ใช้อยู่ในขั้นไหนของ workflow */}
        <div className="h-0.5 bg-gray-100" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/assess" element={<AssessPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/exercise" element={<ExercisePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-gray-500 flex items-center justify-between">
          <span>CS460 Project · มหาวิทยาลัยกรุงเทพ</span>
          <span className="text-gray-400 font-mono">v0.1</span>
        </div>
      </footer>
    </div>
  )
}

export default App
