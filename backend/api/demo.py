from fastapi import APIRouter

from ..services.pipeline_service import PipelineService

router = APIRouter(prefix="/api/demo", tags=["demo"])
_service = PipelineService()


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
    valid = {"cleaned_metadata", "annotations", "classifications", "quality_report", "image_validation", "llm_structured", "governance_summary", "semantic_verification"}
    if dataset not in valid:
        return {"error": f"Unknown dataset. Valid: {', '.join(valid)}"}
    if dataset == "governance_summary":
        summary = _service.load_governance_summary()
        return {"text": summary} if summary else {"text": "治理摘要暂不可用"}
    if dataset == "semantic_verification":
        result = _service.load_semantic_verification()
        return result if result else {}
    data = _service.load_demo_data()
    result = data[dataset]
    # Re-clean metadata in DICOM mode
    if dataset == "cleaned_metadata" and mode == "dicom":
        result = _service.reclean_metadata_dicom(result)
    return result
