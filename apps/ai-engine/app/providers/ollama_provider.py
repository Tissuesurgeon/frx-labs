import httpx
from app.config import settings


class OllamaProvider:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def generate(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Ollama error: {resp.status_code}")
            return resp.json().get("response", "")
