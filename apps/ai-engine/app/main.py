from fastapi import FastAPI
from app.rag.ingest import ingest_defaults
from app.risk_analyzer import analyze
from app.intent_guardian import parse_intent
from app.schemas import (
    ParseIntentRequest,
    ParseIntentResponse,
    RiskAnalysisRequest,
    RiskAnalysisResponse,
)

app = FastAPI(title="FRX Shield AI Engine", version="0.1.0")


@app.on_event("startup")
async def startup():
    ingest_defaults()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=RiskAnalysisResponse)
async def analyze_endpoint(req: RiskAnalysisRequest):
    return await analyze(req)


@app.post("/parse-intent", response_model=ParseIntentResponse)
async def parse_intent_endpoint(req: ParseIntentRequest):
    return await parse_intent(req)
