from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class RiskAnalysisRequest(BaseModel):
    transaction: dict[str, Any]
    agent_history: list[Any] | dict[str, Any] = Field(default_factory=list)
    policy: dict[str, Any] = Field(default_factory=dict)
    market_context: Optional[dict[str, Any]] = None


class RiskAnalysisResponse(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: Literal["low", "medium", "high"]
    reasons: list[str]


class ParseIntentRequest(BaseModel):
    message: str
    agent_context: Optional[dict[str, Any]] = None


class ParseIntentResponse(BaseModel):
    action: str
    asset: Optional[str] = None
    asset_in: Optional[str] = None
    asset_out: Optional[str] = None
    amount: Optional[float] = None
    protocol: str = "DeepBook"
    summary: str
    warnings: list[str] = Field(default_factory=list)
    ptb_draft: dict[str, Any] = Field(default_factory=dict)
