from app.rag.chroma_client import get_collection


def retrieve_context(query: str, top_k: int = 3) -> list[str]:
    contexts = []
    for collection_name in ["security_rules", "protocols", "risk_patterns", "policies"]:
        try:
            col = get_collection(collection_name)
            if col.count() == 0:
                continue
            results = col.query(query_texts=[query], n_results=min(top_k, col.count()))
            if results and results.get("documents"):
                contexts.extend(results["documents"][0])
        except Exception:
            continue
    return contexts[: top_k * 2]
