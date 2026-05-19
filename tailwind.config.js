/** @type {import('tailwindcss').Config} */
// ระบบสี Calm Academic — พื้นนวล, accent น้ำเงิน/เขียวมินต์, โทนสุภาพ ไม่ฉูดฉาด
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // brand = สีน้ำเงินอ่อน (sky) ใช้กับ CTA หลัก, focus ring, link
        brand: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
        },
        // accent = เขียวมินต์ (emerald) ใช้แสดง success, key points, ผ่าน
        accent: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        // canvas = สีพื้นของทั้งแอป (ขาวอมเทาบาง ๆ)
        canvas: "#FAFBFC",
      },
      fontFamily: {
        // Inter สำหรับ Latin + IBM Plex Sans Thai สำหรับไทย
        sans: [
          "Inter",
          "IBM Plex Sans Thai",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        // เงาบาง ๆ สำหรับ card — สีเทาอมน้ำเงินอ่อน
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        focus: "0 0 0 4px rgba(14, 165, 233, 0.12)",
      },
      letterSpacing: {
        eyebrow: "0.14em",
      },
    },
  },
  plugins: [],
}
