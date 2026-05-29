import json
import os

from fastapi import APIRouter

from ..services.pipeline_service import PipelineService

router = APIRouter(prefix="/api/demo", tags=["demo"])
_service = PipelineService()
_demo_dir = os.path.join(os.path.dirname(__file__), "..", "..", "demo_data")


def _load_json(filename):
    path = os.path.join(_demo_dir, filename)
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


@router.get("/overview")
def demo_overview():
    data = _service.load_demo_data()
    quality = data["quality_report"]
    annotations = data["annotations"]
    metadata = data["cleaned_metadata"]
    classifications = data["classifications"]

    return {
        "total_cases": len(classifications),
        "total_records": len(metadata),
        "overall_score": quality.get("overall_score", 0),
        "overall_pass": quality.get("overall_pass", False),
        "dimensions": {
            d: {
                "score": quality[d]["score"],
                "threshold": quality[d]["threshold"],
                "pass": quality[d]["pass"],
            }
            for d in ["completeness", "accuracy", "consistency", "usability"]
        },
    }


@router.get("/{dataset}")
def demo_dataset(dataset: str, mode: str = "analysis"):
    valid = {
        "cleaned_metadata", "annotations", "classifications", "quality_report",
        "image_validation", "llm_structured", "governance_summary", "semantic_verification",
        "per_patient_assessments", "structured_findings", "terminology_mappings",
        "metadata_semantic_mappings", "kernel_mapping",
        "probe_report", "alignment_report", "phi_report",
        "field_completeness_report", "annotation_report",
    }
    if dataset not in valid:
        return {"error": f"Unknown dataset. Valid: {', '.join(valid)}"}
    # AI text endpoints
    if dataset == "governance_summary":
        summary = _service.load_governance_summary()
        return {"text": summary} if summary else {"text": "治理摘要暂不可用"}
    if dataset == "semantic_verification":
        result = _service.load_semantic_verification()
        return result if result else {}
    # New JSON file datasets (loaded directly from demo_data/)
    new_datasets = {
        "per_patient_assessments", "structured_findings", "terminology_mappings",
        "metadata_semantic_mappings", "kernel_mapping",
        "probe_report", "alignment_report", "phi_report",
        "field_completeness_report", "annotation_report",
    }
    if dataset in new_datasets:
        result = _load_json(f"{dataset}.json")
        return result if result is not None else {}
    # Original demo datasets
    data = _service.load_demo_data()
    result = data[dataset]
    if dataset == "cleaned_metadata" and mode == "dicom":
        result = _service.reclean_metadata_dicom(result)
    return result
