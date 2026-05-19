import { Component } from 'react'

// Catch JS errors ที่ throw จาก child component แล้วแสดง fallback แทน blank screen
// ใช้ class component เพราะ React ยังไม่มี hook สำหรับ error boundary
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    // log ลง console เพื่อ debug — backend logger จะใส่ตอน production
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-canvas">
          <div className="max-w-md text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 text-red-600 mb-5"
              aria-hidden
            >
              <span className="text-3xl font-bold leading-none">!</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
              เกิดข้อผิดพลาดที่ไม่คาดคิด
            </h1>
            <p className="text-gray-600 mb-3">
              แอปเจอ error และไม่สามารถทำงานต่อได้
            </p>
            <details className="text-left mb-6">
              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 inline-block">
                แสดงรายละเอียด
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-mono text-gray-600 overflow-auto max-h-48">
                {String(this.state.error?.message ?? this.state.error)}
              </pre>
            </details>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.reset}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium shadow-soft transition-colors"
              >
                ลองใหม่
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/'
                }}
                className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
              >
                กลับหน้าแรก
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
