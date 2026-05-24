from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..services.pipeline_service import PipelineService

router = APIRouter(prefix="/api/terminology", tags=["terminology"])
_service = PipelineService()


class AddTermRequest(BaseModel):
    type: str  # disease, anatomy, modifier
    type_cn: str
    standard_en: str
    standard_cn: str
    variants: list[str]


@router.get("")
def get_terminology(
    type: str = Query(default=None, description="Filter: disease, anatomy, modifier"),
    q: str = Query(default=None, description="Search query"),
):
    terms = _service.load_terminology()

    if type and type in ("disease", "anatomy", "modifier"):
        terms = [t for t in terms if t["type"] == type]

    if q:
        q_lower = q.lower()
        terms = [
            t
            for t in terms
            if q_lower in t["standard_en"].lower()
            or q in t["standard_cn"]
            or any(q_lower in v.lower() for v in t["variants"])
        ]

    return {"terms": terms, "total": len(terms)}


class AddVariantsRequest(BaseModel):
    variants: list[str]


@router.post("/add")
def add_terminology(body: AddTermRequest):
    term = {
        "type": body.type,
        "type_cn": body.type_cn,
        "standard_en": body.standard_en,
        "standard_cn": body.standard_cn,
        "variants": body.variants,
    }
    _service.add_custom_term(term)
    return {"status": "done", "term": term}


@router.post("/{standard_en}/variants")
def add_variants(standard_en: str, body: AddVariantsRequest):
    result = _service.add_variants_to_term(standard_en, body.variants)
    return {"status": "done", **result}
