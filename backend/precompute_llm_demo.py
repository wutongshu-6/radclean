"""Pre-compute LLM structured results for demo data."""
import json
import os
import sys
import time

# Setup path
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from services.llm_service import LLMService

DEMO_DIR = os.path.join(os.path.dirname(__file__), "..", "demo_data")

def main():
    with open(os.path.join(DEMO_DIR, "annotations.json"), "r", encoding="utf-8") as f:
        annotations = json.load(f)

    llm = LLMService()
    if not llm._available:
        print("ERROR: LLM API key not configured")
        return

    results = {}
    total = len(annotations)
    for i, (acc, ann) in enumerate(annotations.items()):
        raw_text = ann.get("raw_text", "")
        if not raw_text:
            parts = []
            if ann.get("findings"):
                parts.append("Findings: " + str(ann["findings"]))
            if ann.get("impressions"):
                parts.append("Impressions: " + str(ann["impressions"]))
            raw_text = "\n".join(parts) if parts else "No report text available."

        print(f"[{i+1}/{total}] Structuring {acc}...")
        result = llm.structure_report(raw_text, patient_id=acc)
        results[acc] = result
        print(f"  -> {json.dumps({k: v for k, v in result.items() if k not in ('raw_text',)}, ensure_ascii=False)[:200]}")
        time.sleep(0.5)  # Rate limiting

    output_path = os.path.join(DEMO_DIR, "llm_structured.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nDone. {len(results)} results saved to {output_path}")

if __name__ == "__main__":
    main()
