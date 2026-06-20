from app.rag.chroma_client import get_collection

SECURITY_RULES = [
    "External transfers to unknown addresses are high risk.",
    "Transactions exceeding daily limits require review.",
    "Swaps on approved protocols within limits are low risk.",
    "Unusual behavior patterns increase risk score.",
]

PROTOCOL_INFO = [
    "DeepBook is an approved Sui DEX protocol.",
    "Only whitelisted protocols should be used by agents.",
]

RISK_PATTERNS = [
    "Large single transactions (>500 USDC) are suspicious.",
    "Repeated failed actions indicate potential compromise.",
    "Actions outside normal agent hours increase risk.",
]


def ingest_defaults():
    try:
        rules = get_collection("security_rules")
        if rules.count() == 0:
            rules.add(
                documents=SECURITY_RULES,
                ids=[f"rule_{i}" for i in range(len(SECURITY_RULES))],
            )

        protocols = get_collection("protocols")
        if protocols.count() == 0:
            protocols.add(
                documents=PROTOCOL_INFO,
                ids=[f"proto_{i}" for i in range(len(PROTOCOL_INFO))],
            )

        patterns = get_collection("risk_patterns")
        if patterns.count() == 0:
            patterns.add(
                documents=RISK_PATTERNS,
                ids=[f"pattern_{i}" for i in range(len(RISK_PATTERNS))],
            )
    except Exception as e:
        print(f"Chroma ingest skipped: {e}")
