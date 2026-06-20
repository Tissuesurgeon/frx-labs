from openai import AsyncOpenAI
from app.config import settings


class OpenAiCompatibleProvider:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key or "sk-placeholder",
            base_url=settings.openai_base_url,
        )

    async def generate(self, prompt: str) -> str:
        resp = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=512,
        )
        return resp.choices[0].message.content or ""
