import os
import shutil
import tempfile
import zipfile as _zipfile

from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from ..services.pipeline_service import PipelineService

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])
_service = PipelineService()


def _extract_zips(tmpdir):
    """Extract any .zip files into tmpdir.

    Recursively searches for the pipeline-expected files and directories
    (ctvit-transformer, superres, data_reports.xlsx, text_prompts.xlsx)
    regardless of how many wrapper directories the ZIP uses.
    """
    EXPECTED = {'ctvit-transformer', 'superres', 'data_reports.xlsx', 'text_prompts.xlsx'}

    for root, dirs, filenames in os.walk(tmpdir):
        for fname in filenames:
            if not fname.lower().endswith('.zip'):
                continue
            zip_path = os.path.join(root, fname)
            extract_dir = os.path.join(tmpdir, '_extracted')
            os.makedirs(extract_dir, exist_ok=True)
            with _zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(extract_dir)
            os.remove(zip_path)

            # Recursively search for expected files/dirs at any depth
            for dirpath, dirnames, filenames2 in os.walk(extract_dir):
                # Move expected directories
                for d in list(dirnames):
                    if d in EXPECTED:
                        src = os.path.join(dirpath, d)
                        dst = os.path.join(tmpdir, d)
                        if not os.path.exists(dst):
                            shutil.move(src, dst)
                            dirnames.remove(d)
                # Move expected files
                for fn in list(filenames2):
                    if fn in EXPECTED:
                        src = os.path.join(dirpath, fn)
                        dst = os.path.join(tmpdir, fn)
                        if not os.path.exists(dst):
                            shutil.move(src, dst)

            # Also move any .xlsx files at any depth (catch renamed report files)
            for dirpath, dirnames, filenames2 in os.walk(extract_dir):
                for fn in filenames2:
                    if fn.lower().endswith('.xlsx') and not os.path.exists(os.path.join(tmpdir, fn)):
                        shutil.move(os.path.join(dirpath, fn), os.path.join(tmpdir, fn))

            shutil.rmtree(extract_dir, ignore_errors=True)


@router.post("/run")
async def pipeline_run(
    background_tasks: BackgroundTasks,
    agent: str = Form(default="all"),
    cleaning_mode: str = Form(default="analysis"),
    use_llm: bool = Form(default=False),
    files: list[UploadFile] = File(default=None),
):
    if files:
        tmpdir = tempfile.mkdtemp(prefix="radclean_")
        filenames = []
        for f in files:
            content = await f.read()
            path = os.path.join(tmpdir, f.filename or "upload")
            os.makedirs(os.path.dirname(path) or tmpdir, exist_ok=True)
            with open(path, "wb") as fh:
                fh.write(content)
            filenames.append(f.filename)
        print(f"[RadClean API] Received {len(files)} file(s): {filenames}, tmpdir={tmpdir}")
        # Auto-extract any ZIP archives
        _extract_zips(tmpdir)
        print(f"[RadClean API] After extraction, tmpdir contents: {os.listdir(tmpdir)}")
        background_tasks.add_task(lambda: shutil.rmtree(tmpdir, ignore_errors=True))
        data_dir = tmpdir
    else:
        # fallback to example_data
        data_dir = os.path.normpath(
            os.path.join(
                os.path.dirname(__file__),
                "..", "..", "..", "26思必驰opc", "example_data", "example_data",
            )
        )
        print(f"[RadClean API] No files received, using fallback: {data_dir}")

    try:
        result = _service.run_pipeline(data_dir, agent=agent, cleaning_mode=cleaning_mode, use_llm=use_llm)
        import json as _json
        class PipelineEncoder(_json.JSONEncoder):
            def default(self, obj):
                try:
                    return super().default(obj)
                except TypeError:
                    return str(obj)
        # Return full results with JSON-serializable fallback
        return {
            "status": "done",
            "agent": agent,
            "cleaned_metadata": result.get("cleaned_metadata", []),
            "annotations": result.get("annotations", {}),
            "classifications": result.get("classifications", {}),
            "quality_report": result.get("quality_report", {}),
            "image_validation": result.get("image_validation"),
            "llm_structured": result.get("llm_structured"),
            "governance_summary": result.get("governance_summary"),
            "semantic_verification": result.get("semantic_verification"),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/export")
def pipeline_export(background_tasks: BackgroundTasks):
    try:
        tmp = _service.export_results()
        tmp_path = tmp.name
        file_size = os.path.getsize(tmp_path)
        background_tasks.add_task(lambda: os.unlink(tmp_path) if os.path.exists(tmp_path) else None)

        def iterfile():
            chunk_size = 1024 * 1024  # 1 MB chunks
            with open(tmp_path, "rb") as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk

        return StreamingResponse(
            iterfile(),
            media_type="application/zip",
            headers={
                "Content-Disposition": "attachment; filename=radclean_governed_data.zip",
                "Content-Length": str(file_size),
            },
        )
    except ValueError as e:
        return {"status": "error", "message": str(e)}


def _stream_llm_for_annotations(annotations: dict):
    from ..services.llm_service import LLMService
    llm = LLMService()

    if not llm._available:
        yield "event: error\ndata: {\"error\":\"LLM API key not configured\"}\n\n"
        yield "event: done\ndata: {}\n\n"
        return

    accs = list(annotations.keys())
    yield f"event: status\ndata: {{\"stage\":\"start\",\"total\":{len(accs)},\"message\":\"开始 {len(accs)} 份报告的结构化分析...\"}}\n\n"

    for i, acc in enumerate(accs):
        ann = annotations[acc]
        raw_text = ann.get("raw_text", "")
        if not raw_text:
            parts = []
            if ann.get("findings"):
                parts.append("Findings: " + str(ann["findings"]))
            if ann.get("impressions"):
                parts.append("Impressions: " + str(ann["impressions"]))
            raw_text = "\n".join(parts) if parts else "No report text available."

        yield f"event: status\ndata: {{\"stage\":\"processing\",\"current\":{i+1},\"total\":{len(accs)},\"patient_id\":\"{acc}\",\"message\":\"({i+1}/{len(accs)}) 结构化 {acc}...\"}}\n\n"

        for sse_msg in llm.structure_report_stream(raw_text, patient_id=acc):
            yield sse_msg

        yield f"event: status\ndata: {{\"stage\":\"report_done\",\"current\":{i+1},\"total\":{len(accs)},\"patient_id\":\"{acc}\",\"message\":\"{acc} 完成\"}}\n\n"

    yield f"event: done\ndata: {{\"total\":{len(accs)}}}\n\n"


@router.post("/agent2/llm")
def agent2_llm():
    data = _service.load_demo_data()
    annotations = data.get("annotations", {})
    results = _service.run_agent2_llm(annotations)
    return {"status": "done", "results": results}


@router.get("/agent2/llm/stream")
def agent2_llm_stream():
    data = _service.load_demo_data()
    annotations = data.get("annotations", {})
    return StreamingResponse(_stream_llm_for_annotations(annotations), media_type="text/event-stream")


@router.post("/agent2/llm/stream")
async def agent2_llm_stream_post(payload: dict):
    annotations = payload.get("annotations", {})
    if not annotations:
        def _err():
            yield "event: error\ndata: {\"error\":\"No annotations provided\"}\n\n"
            yield "event: done\ndata: {}\n\n"
        return StreamingResponse(_err(), media_type="text/event-stream")
    return StreamingResponse(_stream_llm_for_annotations(annotations), media_type="text/event-stream")
