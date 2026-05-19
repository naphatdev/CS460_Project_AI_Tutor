"""
OpenAI client — ใช้ OpenAI API โดยตรง
"""
import os
from openai import OpenAI

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4o-mini")

MODELS = {
    "mini": "gpt-4o-mini",
    "standard": "gpt-4o",
}


def get_client() -> OpenAI:
    """สร้าง OpenAI client"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY ยังไม่ตั้งค่า — ดูที่ backend/.env"
        )
    return OpenAI(api_key=api_key)


def chat(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.5,
) -> str:
    """
    เรียก chat completion
    ใช้: chat([{"role": "user", "content": "hello"}])
    """
    client = get_client()
    selected = MODELS.get(model, model) if model else DEFAULT_MODEL
    response = client.chat.completions.create(
        model=selected,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content or ""
