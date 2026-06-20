import json
import re

from app.config import settings
from app.providers.ollama_provider import OllamaProvider
from app.providers.openai_provider import OpenAiCompatibleProvider
from app.rag.retriever import retrieve_context
from app.schemas import RiskAnalysisRequest, RiskAnalysisResponse
from app.scoring.deterministic import deterministic_score


def get_llm_provider():
    if settings.llm_provider == "openai":
        return OpenAiCompatibleProvider()
    return OllamaProvider()


async def analyze(req: RiskAnalysisRequest) -> RiskAnalysisResponse:
    base = deterministic_score(req)
    query = json.dumps(req.transaction)
    contexts = retrieve_context(query)

    prompt = f"""You are a blockchain security analyst. Evaluate this agent transaction for security risk.
Do NOT recommend trades. Only assess security risk.

Transaction: {json.dumps(req.transaction)}
Policy: {json.dumps(req.policy)}
Market context: {json.dumps(req.market_context or {})}
Security context:
{chr(10).join('- ' + c for c in contexts)}

Deterministic baseline score: {base.risk_score}/100
Reasons so far: {', '.join(base.reasons)}

Respond with JSON only: {{"risk_score": 0-100, "risk_level": "low|medium|high", "reasons": ["..."]}}
"""

    try:
        provider = get_llm_provider()
        raw = await provider.generate(prompt)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            score = int(data.get("risk_score", base.risk_score))
            level = data.get("risk_level", base.risk_level)
            reasons = data.get("reasons", base.reasons)
            if isinstance(reasons, list):
                merged = list(dict.fromkeys(base.reasons + [str(r) for r in reasons]))
            else:
                merged = base.reasons
            final_score = max(base.risk_score, min(100, score))
            final_level = (
                "high"
                if final_score >= req.policy.get("risk_threshold", 70)
                else ("medium" if final_score >= 40 else "low")
            )
            return RiskAnalysisResponse(
                risk_score=final_score,
                risk_level=final_level if level not in ("low", "medium", "high") else level,
                reasons=merged[:6],
            )
    except Exception as e:
        print(f"LLM analysis failed, using deterministic: {e}")

    return base
