import json
import re

from app.providers.ollama_provider import OllamaProvider
from app.providers.openai_provider import OpenAiCompatibleProvider
from app.config import settings
from app.schemas import ParseIntentRequest, ParseIntentResponse


def get_llm_provider():
    if settings.llm_provider == "openai":
        return OpenAiCompatibleProvider()
    return OllamaProvider()


async def parse_intent(req: ParseIntentRequest) -> ParseIntentResponse:
    prompt = f"""Parse this natural language trading intent into structured JSON.
Message: {req.message}
Agent context: {json.dumps(req.agent_context or {})}

Respond with JSON only:
{{
  "action": "swap|transfer|trade",
  "asset": "SUI",
  "asset_in": "USDC",
  "asset_out": "SUI",
  "amount": 100,
  "protocol": "DeepBook",
  "summary": "human readable summary",
  "warnings": ["slippage or liquidity warnings if any"],
  "ptb_draft": {{"type": "deepbook_swap", "pool_key": "SUI_USDC"}}
}}

Use minimal risk language. If user wants low risk, add slippage warnings."""

    provider = get_llm_provider()
    raw = await provider.generate(prompt)
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        data = json.loads(match.group())
        return ParseIntentResponse(
            action=data.get("action", "swap"),
            asset=data.get("asset"),
            asset_in=data.get("asset_in"),
            asset_out=data.get("asset_out"),
            amount=data.get("amount"),
            protocol=data.get("protocol", "DeepBook"),
            summary=data.get("summary", req.message),
            warnings=data.get("warnings", []),
            ptb_draft=data.get("ptb_draft", {}),
        )

    return ParseIntentResponse(
        action="swap",
        asset_in="USDC",
        asset_out="SUI",
        amount=100,
        protocol="DeepBook",
        summary=req.message,
        warnings=["Could not fully parse intent; using defaults"],
        ptb_draft={"type": "deepbook_swap", "pool_key": "SUI_USDC"},
    )
