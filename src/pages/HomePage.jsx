import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchSubjects,
  startAssessment,
  uploadFiles,
  saveLastAssessmentInput,
} from '../services/api'

// ====== ค่าจำกัด upload ======
const MAX_FILES = 3
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXT = ['pdf', 'txt', 'md']

// ====== localStorage key สำหรับวิชาที่ user เพิ่มเอง ======
// รูปแบบ: array ของ { id, name, description, topics: [], isCustom: true }
const SUBJECTS_STORAGE_KEY = 'ai-tutor:custom-subjects'

function loadCustomSubjects() {
  try {
    const raw = localStorage.getItem(SUBJECTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCustomSubjects(list) {
  try {
    localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // localStorage อาจเต็ม หรือ private mode — เงียบไว้ ไม่ขัดจังหวะ user
  }
}

function makeCustomSubjectId(name) {
  // slug ภาษาไทย+อังกฤษ + suffix กันชนกัน
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w฀-๿-]/g, '')
    .slice(0, 40)
  return `custom-${slug || 'subject'}-${Date.now().toString(36).slice(-5)}`
}

function getExtension(name) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// หน้าแรก — เลือกวิชา (default + user-added) + topic + แนบไฟล์ + พิมพ์คำถาม
// แล้วเรียก /api/assess เพื่อเริ่ม session ประเมินระดับ
export default function HomePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // === Subjects ===
  const [subjects, setSubjects] = useState([])
  const [customSubjects, setCustomSubjects] = useState(() =>
    loadCustomSubjects(),
  )
  const [subjectId, setSubjectId] = useState('')
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  // === Form เพิ่มวิชา ===
  const [addingSubject, setAddingSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectDescription, setNewSubjectDescription] = useState('')

  // === Topic ===
  // โหมด: 'none' = ข้าม, 'predefined' = เลือกจาก chip, 'custom' = พิมพ์เอง
  const [topicMode, setTopicMode] = useState('none')
  const [topicId, setTopicId] = useState(null)
  const [customTopic, setCustomTopic] = useState('')

  // === Files ===
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState(null)

  // === Question + submit ===
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // โหลดรายชื่อวิชาตอน mount
  useEffect(() => {
    fetchSubjects()
      .then((data) => {
        setSubjects(data.subjects)
        if (data.subjects.length > 0) setSubjectId(data.subjects[0].id)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSubjects(false))
  }, [])

  // รวม default + custom เพื่อใช้งานง่าย — default อยู่ก่อน, custom ตามหลัง
  const allSubjects = [...subjects, ...customSubjects]
  const currentSubject = allSubjects.find((s) => s.id === subjectId)
  const availableTopics = currentSubject?.topics ?? []
  const isCustomSubject = currentSubject?.isCustom === true

  // เมื่อเปลี่ยนวิชา → reset topic (เพราะ topic list แตกต่างกันต่อวิชา)
  useEffect(() => {
    setTopicMode('none')
    setTopicId(null)
    setCustomTopic('')
  }, [subjectId])

  // === Custom subject handlers ===
  function handleAddSubject() {
    const name = newSubjectName.trim()
    if (!name) return
    const description = newSubjectDescription.trim()
    const newSubject = {
      id: makeCustomSubjectId(name),
      name,
      description: description || 'วิชาที่ผู้ใช้เพิ่มเอง',
      topics: [],
      isCustom: true,
    }
    const next = [...customSubjects, newSubject]
    setCustomSubjects(next)
    saveCustomSubjects(next)
    setSubjectId(newSubject.id) // auto-select
    closeAddSubjectForm()
  }

  function closeAddSubjectForm() {
    setAddingSubject(false)
    setNewSubjectName('')
    setNewSubjectDescription('')
  }

  function handleRemoveCustomSubject(id) {
    const subject = customSubjects.find((s) => s.id === id)
    if (!subject) return
    // confirm ก่อนลบ — กันลบพลาด (subject ที่กรอกชื่อ+description ไว้)
    const ok = window.confirm(`ลบวิชา "${subject.name}"?`)
    if (!ok) return
    const next = customSubjects.filter((s) => s.id !== id)
    setCustomSubjects(next)
    saveCustomSubjects(next)
    // ถ้าวิชาที่ลบเป็น current → fallback ไปวิชา default ตัวแรก
    if (subjectId === id) {
      setSubjectId(subjects[0]?.id ?? '')
    }
  }

  // === Topic handlers ===
  function selectTopicChip(id) {
    if (topicMode === 'predefined' && topicId === id) {
      setTopicMode('none')
      setTopicId(null)
      return
    }
    setTopicMode('predefined')
    setTopicId(id)
    setCustomTopic('')
  }

  function toggleCustomTopic() {
    if (topicMode === 'custom') {
      setTopicMode('none')
      setCustomTopic('')
    } else {
      setTopicMode('custom')
      setTopicId(null)
    }
  }

  // === File handlers ===
  function validateNewFiles(list) {
    const errs = []
    const ok = []
    for (const f of list) {
      const ext = getExtension(f.name)
      if (!ALLOWED_EXT.includes(ext)) {
        errs.push(`${f.name}: ประเภทไม่รองรับ (PDF/TXT/MD เท่านั้น)`)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        errs.push(`${f.name}: ใหญ่เกิน 10 MB`)
        continue
      }
      ok.push(f)
    }
    return { ok, errs }
  }

  async function handleAddFiles(fileList) {
    setFileError(null)
    const arr = Array.from(fileList)
    if (arr.length === 0) return

    const remaining = MAX_FILES - files.length
    if (remaining <= 0) {
      setFileError(`อัปโหลดได้สูงสุด ${MAX_FILES} ไฟล์เท่านั้น`)
      return
    }

    const limited = arr.slice(0, remaining)
    const overflow = arr.length - limited.length
    const { ok, errs } = validateNewFiles(limited)

    const combinedErrs = [...errs]
    if (overflow > 0)
      combinedErrs.push(`ตัดออก ${overflow} ไฟล์ส่วนเกิน (สูงสุด ${MAX_FILES})`)
    if (combinedErrs.length > 0) setFileError(combinedErrs.join('\n'))
    if (ok.length === 0) return

    const placeholders = ok.map((f) => ({
      file_id: `tmp_${Math.random().toString(36).slice(2)}`,
      filename: f.name,
      size: f.size,
      status: 'uploading',
    }))
    setFiles((prev) => [...prev, ...placeholders])

    try {
      const result = await uploadFiles(ok)
      setFiles((prev) => {
        const next = [...prev]
        result.uploaded.forEach((u, i) => {
          const idx = next.findIndex(
            (x) => x.file_id === placeholders[i].file_id,
          )
          if (idx !== -1) next[idx] = u
        })
        return next
      })
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) =>
          placeholders.find((p) => p.file_id === f.file_id)
            ? { ...f, status: 'failed' }
            : f,
        ),
      )
      setFileError(`อัปโหลดไม่สำเร็จ: ${err.message}`)
    }
  }

  function removeFile(fileId) {
    setFiles((prev) => prev.filter((f) => f.file_id !== fileId))
  }

  function onDragOver(e) {
    e.preventDefault()
    if (!isDragging) setIsDragging(true)
  }
  function onDragLeave(e) {
    e.preventDefault()
    setIsDragging(false)
  }
  function onDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    handleAddFiles(e.dataTransfer.files)
  }
  function openFilePicker() {
    if (files.length >= MAX_FILES) return
    fileInputRef.current?.click()
  }

  // === Submit ===
  const hasUploading = files.some((f) => f.status === 'uploading')
  const customTopicValid =
    topicMode !== 'custom' || customTopic.trim().length > 0
  const canSubmit =
    !!subjectId &&
    question.trim().length > 0 &&
    !loading &&
    !hasUploading &&
    customTopicValid

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const readyFileIds = files
        .filter((f) => f.status === 'ready')
        .map((f) => f.file_id)
      // ประกอบ payload ก่อน — เก็บไว้ใน sessionStorage ด้วยเผื่อต้อง regenerate quiz ตอน retry
      const assessmentInput = {
        subject_id: isCustomSubject ? 'custom' : subjectId,
        custom_subject: isCustomSubject
          ? {
              name: currentSubject.name,
              description: currentSubject.description,
            }
          : null,
        question,
        topic_id: topicMode === 'predefined' ? topicId : null,
        custom_topic:
          topicMode === 'custom' ? customTopic.trim() : null,
        file_ids: readyFileIds,
      }
      saveLastAssessmentInput(assessmentInput)
      const data = await startAssessment(assessmentInput)
      navigate('/assess', {
        state: { session: data, subjectId, question },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
      {/* Hero */}
      <div className="mb-10">
        <p className="text-[11px] font-semibold tracking-eyebrow text-brand-600 uppercase mb-3">
          AI Tutor · ติวเตอร์ส่วนตัว
        </p>
        <h1 className="text-3xl md:text-[40px] font-bold text-gray-900 leading-[1.2] tracking-tight mb-4">
          เริ่มจากคำถามของคุณ —{' '}
          <span className="text-brand-600">AI ปรับการสอนให้พอดี</span>
        </h1>
        <p className="text-[15px] text-gray-600 max-w-2xl leading-relaxed">
          เลือกวิชา (หรือเพิ่มวิชาของคุณเอง) ระบุหัวข้อย่อยถ้ามี
          แนบไฟล์เอกสารประกอบ แล้วพิมพ์คำถาม — AI จะประเมินระดับและสอนให้พอดี
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-9">
        {/* ====== 1. Subject ====== */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-semibold text-gray-800">
              <span className="text-brand-600 mr-2">1.</span>
              เลือกวิชา
            </label>
            {!loadingSubjects && (
              <span className="text-xs text-gray-400">
                {allSubjects.length} วิชา
                {customSubjects.length > 0 && (
                  <span className="text-accent-600">
                    {' '}
                    · {customSubjects.length} ของฉัน
                  </span>
                )}
              </span>
            )}
          </div>

          {!loadingSubjects && allSubjects.length === 0 && (
            <div className="mb-3 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-700">
              ยังไม่มีวิชาในระบบ — กด{' '}
              <span className="font-semibold">+ เพิ่มวิชาของคุณ</span>{' '}
              ด้านล่างเพื่อสร้างวิชาใหม่
            </div>
          )}

          {loadingSubjects ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[88px] bg-gray-100 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="เลือกวิชา"
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {allSubjects.map((s) => {
                const selected = subjectId === s.id
                return (
                  <div key={s.id} className="relative group">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSubjectId(s.id)}
                      className={`w-full h-full text-left rounded-2xl border p-4 transition-all duration-150 ${
                        selected
                          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500 shadow-soft'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-soft'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        {s.isCustom ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-accent-50 text-accent-700 text-[9px] font-bold tracking-wider uppercase border border-accent-100">
                            ของฉัน
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-semibold tracking-wider text-gray-400 uppercase">
                            {s.id}
                          </span>
                        )}
                        {/* radio dot สำหรับ default — custom ใช้ × ที่มุมแทน */}
                        {!s.isCustom && (
                          <span
                            className={`w-4 h-4 rounded-full border-2 transition-colors ${
                              selected
                                ? 'border-brand-500 bg-brand-500'
                                : 'border-gray-300'
                            }`}
                            aria-hidden
                          >
                            {selected && (
                              <span className="block w-1.5 h-1.5 bg-white rounded-full m-auto mt-[3px]" />
                            )}
                          </span>
                        )}
                        {/* เผื่อพื้นที่ให้ × ที่จะวางทับด้วย absolute */}
                        {s.isCustom && <span className="w-6 h-6" aria-hidden />}
                      </div>
                      <div
                        className={`text-sm font-semibold mb-1 leading-snug ${
                          selected ? 'text-brand-700' : 'text-gray-900'
                        }`}
                      >
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {s.description}
                      </div>
                    </button>
                    {/* ปุ่ม × ลบ — แสดงเฉพาะวิชาที่ user เพิ่มเอง (sibling ของ button หลัก) */}
                    {s.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomSubject(s.id)}
                        className="absolute top-3 right-3 w-6 h-6 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center text-base leading-none"
                        aria-label={`ลบวิชา ${s.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}

              {/* "+ เพิ่มวิชา" card */}
              {!addingSubject && (
                <button
                  type="button"
                  onClick={() => setAddingSubject(true)}
                  className="rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/30 p-4 flex flex-col items-center justify-center text-center transition-all min-h-[88px] cursor-pointer group"
                >
                  <span
                    className="text-2xl text-gray-400 group-hover:text-brand-500 leading-none mb-1.5 transition-colors"
                    aria-hidden
                  >
                    +
                  </span>
                  <span className="text-xs font-semibold text-gray-600 group-hover:text-brand-700 transition-colors">
                    เพิ่มวิชาของคุณ
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Inline form เพิ่มวิชา */}
          {addingSubject && (
            <div className="mt-3 bg-white rounded-2xl border border-brand-200 ring-1 ring-brand-100 p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  เพิ่มวิชาของคุณ
                </h3>
                <button
                  type="button"
                  onClick={closeAddSubjectForm}
                  className="w-7 h-7 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center text-lg leading-none"
                  aria-label="ปิดฟอร์ม"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="new-subject-name"
                    className="block text-xs font-medium text-gray-700 mb-1.5"
                  >
                    ชื่อวิชา <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="new-subject-name"
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (newSubjectName.trim()) handleAddSubject()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        closeAddSubjectForm()
                      }
                    }}
                    placeholder="เช่น Quantum Computing, Linear Algebra"
                    maxLength={60}
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-subject-description"
                    className="block text-xs font-medium text-gray-700 mb-1.5"
                  >
                    คำอธิบายสั้น ๆ{' '}
                    <span className="text-gray-400 font-normal">
                      (ช่วยให้ AI เข้าใจ scope ของวิชา)
                    </span>
                  </label>
                  <textarea
                    id="new-subject-description"
                    value={newSubjectDescription}
                    onChange={(e) =>
                      setNewSubjectDescription(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        closeAddSubjectForm()
                      }
                    }}
                    placeholder="เช่น Qubits, superposition, entanglement, quantum algorithms"
                    rows={2}
                    maxLength={200}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none transition-all leading-relaxed"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right font-mono">
                    {newSubjectDescription.length} / 200
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeAddSubjectForm}
                    className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    disabled={!newSubjectName.trim()}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-soft"
                  >
                    บันทึกวิชา
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ====== 2. Topic ====== */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-semibold text-gray-800">
              <span className="text-brand-600 mr-2">2.</span>
              หัวข้อย่อย
            </label>
            <span className="text-xs text-gray-400">ทางเลือก · ข้ามได้</span>
          </div>

          {loadingSubjects ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-9 w-24 bg-gray-100 rounded-full animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="เลือกหัวข้อย่อย"
              >
                {availableTopics.map((t) => {
                  const selected =
                    topicMode === 'predefined' && topicId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => selectTopicChip(t.id)}
                      className={`px-4 py-2 rounded-full text-sm border transition-all ${
                        selected
                          ? 'border-brand-500 bg-brand-500 text-white shadow-soft'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {t.name}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={toggleCustomTopic}
                  aria-expanded={topicMode === 'custom'}
                  className={`px-4 py-2 rounded-full text-sm border transition-all ${
                    topicMode === 'custom'
                      ? 'border-brand-500 bg-brand-500 text-white shadow-soft'
                      : 'border-dashed border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {availableTopics.length === 0
                    ? '+ พิมพ์หัวข้อ'
                    : '+ อื่น ๆ'}
                </button>
              </div>

              {availableTopics.length === 0 && topicMode === 'none' && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  {isCustomSubject
                    ? 'วิชาของคุณยังไม่มี predefined topic — พิมพ์หัวข้อเองได้'
                    : 'วิชานี้ยังไม่มีหัวข้อย่อย — ข้ามไปกรอกคำถามได้เลย'}
                </p>
              )}

              {topicMode === 'custom' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="พิมพ์หัวข้อเอง เช่น Reinforcement Learning"
                    maxLength={80}
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {customTopic.length} / 80
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* ====== 3. Files ====== */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-semibold text-gray-800">
              <span className="text-brand-600 mr-2">3.</span>
              ไฟล์ประกอบ
            </label>
            <span className="text-xs text-gray-400">
              ทางเลือก · {files.length}/{MAX_FILES}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            onChange={(e) => {
              handleAddFiles(e.target.files)
              e.target.value = ''
            }}
            className="sr-only"
            id="file-input"
          />

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={openFilePicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openFilePicker()
              }
            }}
            role="button"
            tabIndex={files.length >= MAX_FILES ? -1 : 0}
            aria-label="อัปโหลดไฟล์ประกอบ"
            aria-disabled={files.length >= MAX_FILES}
            className={`border-2 border-dashed rounded-2xl px-6 py-7 text-center transition-all ${
              isDragging
                ? 'border-brand-500 bg-brand-50'
                : files.length >= MAX_FILES
                  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  : 'border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer'
            }`}
          >
            <div
              className="text-2xl mb-2 text-gray-400 leading-none"
              aria-hidden
            >
              ↑
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {files.length >= MAX_FILES
                ? `ครบ ${MAX_FILES} ไฟล์แล้ว`
                : isDragging
                  ? 'วางไฟล์ได้เลย'
                  : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}
            </p>
            <p className="text-xs text-gray-500">
              PDF · TXT · MD · สูงสุด 10 MB ต่อไฟล์
            </p>
          </div>

          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f) => (
                <li
                  key={f.file_id}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-3 py-2.5"
                >
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-[10px] font-mono font-bold text-gray-600 shrink-0"
                    aria-hidden
                  >
                    {getExtension(f.filename).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {f.filename}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{formatSize(f.size)}</span>
                      <span aria-hidden>·</span>
                      {f.status === 'uploading' && (
                        <span className="inline-flex items-center gap-1.5 text-gray-500">
                          <span className="w-3 h-3 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
                          อัปโหลด...
                        </span>
                      )}
                      {f.status === 'ready' && (
                        <span className="text-accent-600 font-medium">
                          พร้อมใช้
                        </span>
                      )}
                      {f.status === 'failed' && (
                        <span className="text-red-600 font-medium">
                          อัปโหลดล้มเหลว
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(f.file_id)}
                    className="shrink-0 w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center text-lg leading-none"
                    aria-label={`ลบ ${f.filename}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {fileError && (
            <div
              role="alert"
              className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 whitespace-pre-line"
            >
              {fileError}
            </div>
          )}
        </section>

        {/* ====== 4. Question ====== */}
        <section>
          <label
            htmlFor="question"
            className="block text-sm font-semibold text-gray-800 mb-3"
          >
            <span className="text-brand-600 mr-2">4.</span>
            คำถาม หรือหัวข้อที่อยากเรียน
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="เช่น อธิบาย A* search algorithm หน่อย — ใช้กับเกมหมากรุกได้ไหม?"
            rows={4}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none transition-all leading-relaxed"
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              ยิ่งระบุชัด AI จะประเมินได้แม่นยำขึ้น
            </p>
            <span className="text-xs text-gray-400 font-mono">
              {question.length} / 500
            </span>
          </div>
        </section>

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
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl transition-all shadow-soft hover:shadow-md text-[15px]"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              กำลังเตรียม quiz...
            </span>
          ) : hasUploading ? (
            <>รอไฟล์อัปโหลดเสร็จก่อน...</>
          ) : (
            <>ประเมินระดับของฉัน →</>
          )}
        </button>
      </form>
    </div>
  )
}
