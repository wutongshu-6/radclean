import json
import os

from fastapi import APIRouter

router = APIRouter(prefix="/api/outputs", tags=["outputs"])
_demo_dir = os.path.join(os.path.dirname(__file__), "..", "..", "demo_data")


def _load_json(filename):
    path = os.path.join(_demo_dir, filename)
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


@router.get("/model/{output_type}")
def model_output(output_type: str):
    """模型消费输出: structured_findings, terminology_mappings, metadata_semantic_mappings, kernel_mapping"""
    valid = {"structured_findings", "terminology_mappings", "metadata_semantic_mappings", "kernel_mapping"}
    if output_type not in valid:
        return {"error": f"Unknown type. Valid: {', '.join(valid)}"}
    return _load_json(f"{output_type}.json") or {}


@router.get("/human/{report_type}")
def human_output(report_type: str):
    """人工审查输出: per_patient_assessments, probe_report, alignment_report, phi_report, field_completeness_report, annotation_report"""
    valid = {"per_patient_assessments", "probe_report", "alignment_report", "phi_report", "field_completeness_report", "annotation_report"}
    if report_type not in valid:
        return {"error": f"Unknown type. Valid: {', '.join(valid)}"}
    return _load_json(f"{report_type}.json") or {}


@router.get("/patient/{patient_id}/assessment")
def patient_assessment(patient_id: str):
    data = _load_json("per_patient_assessments.json") or {}
    return data.get(patient_id, {"error": f"Patient {patient_id} not found"})


@router.get("/patient/{patient_id}/findings")
def patient_findings(patient_id: str):
    data = _load_json("structured_findings.json") or {}
    return data.get(patient_id, {"error": f"Patient {patient_id} not found"})


@router.get("/patient/{patient_id}/mappings")
def patient_mappings(patient_id: str):
    term = (_load_json("terminology_mappings.json") or {}).get(patient_id, {})
    sem = (_load_json("metadata_semantic_mappings.json") or {}).get(patient_id, {})
    return {"terminology": term, "semantic": sem}
