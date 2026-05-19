import { Link } from 'react-router-dom'

// หน้า 404 — แสดงเมื่อ user เปิด URL ที่ไม่มี route รองรับ
export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <p className="text-[11px] font-semibold tracking-eyebrow text-gray-400 uppercase mb-4 font-mono">
        404 · NOT FOUND
      </p>
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
        ไม่พบหน้านี้
      </h1>
      <p className="text-gray-600 mb-8 leading-relaxed">
        URL ที่คุณเปิดอาจถูกย้าย หรือไม่มีอยู่ในระบบ
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-soft transition-colors"
      >
        ← กลับหน้าแรก
      </Link>
    </div>
  )
}
