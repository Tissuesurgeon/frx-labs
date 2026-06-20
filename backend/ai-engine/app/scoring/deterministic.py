from app.schemas import RiskAnalysisRequest, RiskAnalysisResponse


def deterministic_score(req: RiskAnalysisRequest) -> RiskAnalysisResponse:
    tx = req.transaction
    amount = tx.get("amount", 0)
    if isinstance(amount, float):
        amount = int(amount)
    action = tx.get("action", "unknown")
    policy = req.policy
    market = req.market_context or {}

    score = 15
    reasons = ["baseline security check"]

    threshold = policy.get("risk_threshold", 70)
    max_tx = policy.get("execution_rules", {}).get("max_tx_amount", 100_000000)

    if amount > max_tx:
        score += 35
        reasons.append("transaction exceeds configured limit")

    if action == "transfer":
        score += 45
        reasons.append("external transfer action flagged")

    if action not in ("swap", "trade"):
        score += 20
        reasons.append(f"unusual action type: {action}")

    deny = policy.get("execution_rules", {}).get("deny_actions", [])
    if action in deny:
        score += 50
        reasons.append(f"action '{action}' denied by policy")

    deviation = market.get("price_deviation_pct", 0)
    if isinstance(deviation, (int, float)) and deviation > 5:
        score += 25
        reasons.append(f"price deviation {deviation:.1f}% exceeds safe threshold")

    volatility = market.get("volatility", "normal")
    if volatility == "elevated":
        score += 20
        reasons.append("elevated market volatility")

    liquidity = market.get("liquidity", "stable")
    if liquidity == "declining":
        score += 15
        reasons.append("declining liquidity conditions")

    change_1d = market.get("change_1d_pct", 0)
    if isinstance(change_1d, (int, float)) and change_1d <= -8:
        score += 10
        reasons.append(f"sharp 1d price move ({change_1d:.1f}%)")

    concentration = market.get("concentration_risk", "normal")
    if concentration == "elevated":
        score += 15
        reasons.append("elevated concentration risk")

    history = req.agent_history if isinstance(req.agent_history, list) else []
    if len(history) > 10:
        recent_blocked = sum(
            1 for h in history[:5] if isinstance(h, dict) and h.get("result") == "blocked"
        )
        if recent_blocked >= 2:
            score += 25
            reasons.append("recent blocked activity pattern")

    score = min(100, max(0, score))
    if score >= threshold:
        level = "high"
    elif score >= 40:
        level = "medium"
    else:
        level = "low"

    return RiskAnalysisResponse(risk_score=score, risk_level=level, reasons=reasons)
