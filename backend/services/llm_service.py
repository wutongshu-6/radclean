import json
import os
from openai import OpenAI

STRUCTURE_PROMPT = """You are a radiology report structuring assistant. Given a free-text thoracic CT report, extract the following 13 fields into structured JSON.

Fields:
- patient_id: string
- age: integer (years)
- sex: "Male" / "Female" / "Unknown"
- organs: list of {{name, finding, measurement, distribution, side}}
- pathologies: list of disease findings (strings)
- negated_findings: list of findings explicitly ruled out
- recommendations: list of follow-up or clinical suggestions
- severity_rank: "low" / "medium" / "high"
- follow_up: boolean
- anatomy_mentioned: list of anatomical sites
- modifiers: list of descriptor terms (e.g. mild, diffuse, peripheral)
- impression_summary: one-sentence summary of key findings
- confidence_note: brief note on data quality / missing info

Report text:
{raw_text}

Return ONLY valid JSON, no explanation."""


class LLMService:
    def __init__(self):
        api_key = os.getenv("LLM_API_KEY", "") or os.getenv("DEEPSEEK_API_KEY", "")
        self._available = bool(api_key)
        if self._available:
            self.client = OpenAI(
                api_key=api_key,
                base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com"),
            )

    def structure_report(self, raw_text: str, patient_id: str = "") -> dict:
        if not self._available:
            return {
                "patient_id": patient_id,
                "error": "LLM API key not configured",
            }

        prompt = STRUCTURE_PROMPT.format(raw_text=raw_text)

        try:
            response = self.client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "deepseek-chat"),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2048,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("\n```", 1)[0]
            return json.loads(content)
        except Exception:
            return {
                "patient_id": patient_id,
                "error": "LLM structuring failed",
                "raw_text": raw_text[:200] + "...",
            }

    def structure_report_stream(self, raw_text: str, patient_id: str = ""):
        """Stream the LLM structuring process.

        Yields SSE-formatted strings with event types:
        - 'status': progress updates (which report, processing stage)
        - 'chunk': raw token chunks from the model
        - 'result': final structured JSON for the report
        - 'error': error for this report
        - 'done': all reports processed
        """
        if not self._available:
            yield _sse("error", json.dumps({
                "patient_id": patient_id,
                "error": "LLM API key not configured",
            }))
            return

        prompt = STRUCTURE_PROMPT.format(raw_text=raw_text)

        yield _sse("status", json.dumps({
            "patient_id": patient_id,
            "stage": "thinking",
            "message": f"正在分析 {patient_id} 的报告...",
        }))

        try:
            full_content = ""
            stream = self.client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "deepseek-chat"),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2048,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_content += delta.content
                    yield _sse("chunk", json.dumps({
                        "patient_id": patient_id,
                        "text": delta.content,
                    }))

            # Parse final result
            content = full_content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("\n```", 1)[0]
            result = json.loads(content)
            result["patient_id"] = patient_id
            yield _sse("result", json.dumps(result))
        except json.JSONDecodeError:
            yield _sse("error", json.dumps({
                "patient_id": patient_id,
                "error": "Failed to parse LLM output as JSON",
                "raw_output": full_content[:500],
            }))
        except Exception as e:
            yield _sse("error", json.dumps({
                "patient_id": patient_id,
                "error": f"LLM streaming failed: {str(e)}",
            }))

    def generate_governance_summary(self, quality_report: dict, metadata_summary: dict = None) -> str:
        """Generate an AI-written governance summary narrative."""
        if not self._available:
            return _fallback_summary(quality_report, metadata_summary)

        import json as _json
        payload = {
            "quality_report": quality_report,
            "metadata_summary": metadata_summary or {},
        }
        prompt = GOVERNANCE_SUMMARY_PROMPT.format(quality_json=_json.dumps(payload, ensure_ascii=False, indent=2))

        try:
            response = self.client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "deepseek-chat"),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=800,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            return _fallback_summary(quality_report, metadata_summary)

    def verify_semantic_quality(self, raw_text: str, annotations: dict) -> dict:
        """Spot-check rule-engine annotations against raw report for semantic accuracy."""
        if not self._available:
            return {"overall_quality": "unavailable", "brief_note": "LLM API key not configured"}

        import json as _json
        ann_copy = {
            'diseases_detected': list(annotations.get('diseases', {}).keys()),
            'anatomy_mentioned': annotations.get('anatomy_mentioned', []),
            'modifiers_mentioned': annotations.get('modifiers_mentioned', []),
            'negated_findings': [n.get('disease', str(n)) for n in annotations.get('negated_findings', [])],
            'age': annotations.get('age'),
            'sex': annotations.get('sex'),
        }

        prompt = SEMANTIC_VERIFY_PROMPT.format(
            raw_text=raw_text[:3000],
            annotations_json=_json.dumps(ann_copy, ensure_ascii=False, indent=2)
        )

        try:
            response = self.client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "deepseek-chat"),
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1024,
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("\n```", 1)[0]
            return _json.loads(content)
        except Exception:
            return {"overall_quality": "error", "brief_note": "Semantic verification failed"}

    def verify_batch_semantic(self, annotations: dict, sample_size: int = 3) -> dict:
        """Run semantic verification on a sample of annotated reports."""
        import json as _json
        results = {}
        accs = list(annotations.keys())[:sample_size]
        for acc in accs:
            ann = annotations[acc]
            raw_text = ann.get('raw_text', '')
            if raw_text:
                results[acc] = self.verify_semantic_quality(raw_text, ann)
        return results


GOVERNANCE_SUMMARY_PROMPT = """You are a medical data governance expert. Given the following quality assessment results from a radiology CT data governance pipeline, write a concise, professional summary in Chinese (中文).

The pipeline has 3 stages:
- Stage 1 (数据净化): DICOM metadata cleaning — age/sex/manufacturer/HU parameter standardization
- Stage 2 (报告结构化): Free-text report → structured annotations — 21 diseases, 50+ anatomy sites, negation detection, + optional LLM 13-field deep extraction
- Stage 3 (治理验证): 4-dimension quality assessment — completeness, accuracy, consistency, usability + terminology standardization against RadLex

Quality Report:
{quality_json}

Instructions:
1. Write in professional but accessible Chinese, suitable for radiologists and data managers
2. Summarize: how many cases, overall pass/fail, key strengths, key issues found
3. Highlight the most actionable finding (if any)
4. Suggest what the next governance iteration should focus on
5. Keep it under 250 words
6. Use a professional but warm tone

Return ONLY the summary text, no JSON wrapper."""


SEMANTIC_VERIFY_PROMPT = """You are a radiology report quality auditor. Given:
1. A raw radiology CT report text
2. Structured annotations extracted by a rule engine (keyword-based)

Your task: evaluate the quality of the rule-engine annotations against the raw text.

Check for:
- **False positives**: entities the rule engine extracted that are NOT actually present or clinically meaningful in the text
- **False negatives**: findings present in the text that the rule engine missed
- **Negation errors**: findings marked as present but actually negated, or vice versa
- **Anatomy mismatches**: anatomical sites associated with wrong findings

Report text:
{raw_text}

Rule-engine annotations (JSON):
{annotations_json}

Return a JSON object with:
{{
  "overall_quality": "good" | "fair" | "poor",
  "confidence": 0.0-1.0,
  "false_positives": [list of entities that seem incorrect],
  "false_negatives": [list of missed findings],
  "negation_errors": [list of negation mistakes],
  "anatomy_mismatches": [list of anatomy errors],
  "brief_note": "1-2 sentence assessment in Chinese"
}}

Return ONLY valid JSON, no explanation."""


def _fallback_summary(quality_report, metadata_summary=None):
    """Rule-based fallback when LLM is unavailable."""
    q = quality_report or {}
    overall = q.get('overall_score', 0)
    overall_pass = q.get('overall_pass', False)
    dims = ['completeness', 'accuracy', 'consistency', 'usability']
    dim_labels = {'completeness': '完整性', 'accuracy': '准确性', 'consistency': '一致性', 'usability': '可用性'}

    lines = ['数据治理质量摘要', '=' * 20, '']
    lines.append(f"综合评分: {overall:.3f} / 1.000  [{('PASS' if overall_pass else 'FAIL')}]")
    lines.append('')

    for d in dims:
        block = q.get(d, {})
        label = dim_labels.get(d, d)
        score = block.get('score', 0)
        threshold = block.get('threshold', 0)
        status = 'PASS' if block.get('pass') else 'FAIL'
        lines.append(f"  {label}: {score:.3f} (阈值 {threshold:.2f}) [{status}]")

    lines.append('')
    lines.append('本摘要由规则引擎自动生成。配置 LLM API Key 可获取 AI 撰写的详细治理总结。')
    return '\n'.join(lines)


def _sse(event, data):
    return f"event: {event}\ndata: {data}\n\n"
