from typing import Protocol


class LlmProvider(Protocol):
    async def generate(self, prompt: str) -> str: ...
