// Mock data สำหรับใช้ระหว่างที่ backend ยังไม่เสร็จ
// รูปแบบทุกตัวต้องตรงกับ API_CONTRACT.md เป๊ะ ๆ

export const subjects = {
  subjects: [
    {
      id: 'cs101',
      name: 'Introduction to Computer Science',
      description: 'พื้นฐาน programming, data structure เบื้องต้น',
      topics: [
        { id: 'variables', name: 'Variables & Types' },
        { id: 'control-flow', name: 'Control Flow' },
        { id: 'functions', name: 'Functions' },
        { id: 'data-structures', name: 'Data Structures' },
        { id: 'recursion', name: 'Recursion' },
      ],
    },
    {
      id: 'cs460',
      name: 'Artificial Intelligence',
      description: 'Search, Logic, ML, Neural Networks',
      topics: [
        { id: 'search', name: 'Search Algorithms' },
        { id: 'logic', name: 'Logic & Reasoning' },
        { id: 'planning', name: 'Planning' },
        { id: 'ml', name: 'Machine Learning' },
        { id: 'neural-networks', name: 'Neural Networks' },
      ],
    },
    {
      id: 'cs350',
      name: 'Database Systems',
      description: 'SQL, ER diagram, normalization, transaction',
      topics: [
        { id: 'sql', name: 'SQL Basics' },
        { id: 'er-diagram', name: 'ER Diagram' },
        { id: 'normalization', name: 'Normalization' },
        { id: 'transactions', name: 'Transactions & Locking' },
      ],
    },
  ],
}

// Mock upload — จำลอง latency แล้วคืน file_id แบบ random
// (FE ใช้ตรงนี้แทน multipart POST จริงเวลา VITE_USE_MOCK=true)
export function mockUpload(files) {
  return new Promise((resolve) => {
    const latency = 600 + Math.random() * 600
    setTimeout(() => {
      const uploaded = files.map((f) => ({
        file_id: `f_${Math.random().toString(36).slice(2, 10)}`,
        filename: f.name,
        size: f.size,
        status: 'ready',
      }))
      resolve({ uploaded })
    }, latency)
  })
}

export const assessmentSession = {
  session_id: 'sess_mock_001',
  quiz: [
    {
      id: 'q1',
      question: 'Search algorithm ใดที่ใช้ heuristic?',
      choices: ['BFS', 'DFS', 'A*', 'Random'],
      type: 'multiple_choice',
    },
    {
      id: 'q2',
      question: 'Heuristic ที่ admissible หมายถึงอะไร?',
      choices: [
        'ประเมินค่าจริงเกินไป',
        'ไม่ประเมินค่าเกินจริง',
        'ใช้ memory น้อย',
        'เร็วที่สุด',
      ],
      type: 'multiple_choice',
    },
  ],
}

export const assessmentResult = {
  session_id: 'sess_mock_001',
  level: 'intermediate',
  score: 2,
  total: 2,
  reasoning: 'ตอบถูกทั้งสองข้อ แสดงว่าเข้าใจพื้นฐาน A* แล้ว',
}

export const explanation = {
  session_id: 'sess_mock_001',
  explanation:
    'A* คือ search algorithm ที่ใช้ f(n) = g(n) + h(n) โดย g(n) คือต้นทุนจริงที่เดินทางจากจุดเริ่มต้นมาถึง n และ h(n) คือ heuristic ที่ประเมินต้นทุนคงเหลือจาก n ไปยัง goal',
  examples: [
    {
      title: 'หา route ที่สั้นที่สุด',
      content:
        'สมมติแผนที่มี 5 จุด เริ่มที่ A ต้องไป E... A* จะเลือกเส้นทางที่มี f(n) ต่ำสุดในแต่ละขั้น',
    },
  ],
  key_points: [
    'g(n) = cost จากจุดเริ่มต้นถึง n',
    'h(n) = heuristic estimate จาก n ถึง goal',
    'ต้องใช้ admissible heuristic จึง optimal',
  ],
}

export const exercise = {
  session_id: 'sess_mock_001',
  exercise_id: 'ex_mock_001',
  question:
    'ถ้า heuristic h(n) ประเมินค่าเกินจริง A* จะยังหา optimal path ได้ไหม? เพราะอะไร?',
  type: 'short_answer',
  hint: 'ลองคิดถึงนิยาม admissible heuristic',
}

export const exerciseResult = {
  session_id: 'sess_mock_001',
  exercise_id: 'ex_mock_001',
  correct: true,
  score: 8,
  max_score: 10,
  feedback: 'อธิบายเหตุผลได้ดี ครบถ้วน แต่ขาดตัวอย่างประกอบ',
  next_action: 'pass',
}
