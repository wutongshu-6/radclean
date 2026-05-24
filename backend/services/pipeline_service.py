import csv
import io
import json
import os
import sys
import tempfile
import shutil
import time
import zipfile
from pathlib import Path

def _log(msg):
    from datetime import datetime
    ts = datetime.now().strftime("%H:%M:%S")
    with open(os.path.join(os.path.dirname(__file__), "_debug.log"), "a", encoding="utf-8") as _f:
        _f.write(f"[{ts}] {msg}\n")
        _f.flush()

PIPELINE_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "26思必驰opc", "data_clean")
)
if PIPELINE_ROOT not in sys.path:
    sys.path.insert(0, PIPELINE_ROOT)

from medical_data_agent.pipeline import CleaningPipeline
from medical_data_agent.terminology_mapper import TerminologyMapper


DEMO_DATA_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "demo_data")
)


class PipelineService:
    def __init__(self):
        self._pipeline = None
        self._progress = 0
        self._status = "idle"
        self._last_result = None
        self._last_data_dir = None

    @property
    def progress(self):
        return self._progress

    @property
    def status(self):
        return self._status

    def load_demo_data(self):
        data = {}
        for name in ["cleaned_metadata", "annotations", "classifications", "quality_report", "image_validation", "llm_structured"]:
            path = os.path.join(DEMO_DATA_DIR, f"{name}.json")
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    data[name] = json.load(f)
        return data

    def load_semantic_verification(self):
        path = os.path.join(DEMO_DATA_DIR, "semantic_verification.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def load_governance_summary(self):
        path = os.path.join(DEMO_DATA_DIR, "governance_summary.txt")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        # Generate on the fly via LLM
        try:
            from .llm_service import LLMService
            data = self.load_demo_data()
            quality = data.get("quality_report", {})
            annotations = data.get("annotations", {})
            meta_summary = {
                'total_cases': len(annotations),
                'total_records': len(data.get('cleaned_metadata', [])),
                'annotation_coverage': quality.get('usability', {}).get('annotation_coverage', 0),
                'avg_confidence': quality.get('usability', {}).get('avg_confidence', 0),
            }
            llm = LLMService()
            return llm.generate_governance_summary(quality, meta_summary)
        except Exception:
            return None

    def load_terminology(self):
        path = os.path.join(DEMO_DATA_DIR, "terminology.json")
        with open(path, "r", encoding="utf-8") as f:
            terms = json.load(f)

        custom_path = os.path.join(DEMO_DATA_DIR, "custom_terminology.json")
        custom_data = {}
        if os.path.exists(custom_path):
            with open(custom_path, "r", encoding="utf-8") as f:
                custom_data = json.load(f)

        # Apply variant patches to preset terms
        patches = custom_data.get("_variant_patches", {})
        if patches:
            for t in terms:
                added = patches.get(t["standard_en"], [])
                if added:
                    t["variants"] = t["variants"] + added
                    t["_has_custom_variants"] = True

        # Append custom terms
        custom_terms = custom_data.get("_custom_terms", [])
        terms.extend(custom_terms)
        return terms

    def _load_custom_data(self):
        custom_path = os.path.join(DEMO_DATA_DIR, "custom_terminology.json")
        if os.path.exists(custom_path):
            with open(custom_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Migrate legacy list format to dict format
            if isinstance(data, list):
                return {"_custom_terms": data}
            return data
        return {}

    def _save_custom_data(self, data):
        custom_path = os.path.join(DEMO_DATA_DIR, "custom_terminology.json")
        with open(custom_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def add_custom_term(self, term: dict):
        data = self._load_custom_data()
        term["_custom"] = True
        data.setdefault("_custom_terms", []).append(term)
        self._save_custom_data(data)
        return term

    def add_variants_to_term(self, standard_en: str, variants: list[str]):
        data = self._load_custom_data()
        patches = data.setdefault("_variant_patches", {})
        patches.setdefault(standard_en, []).extend(variants)
        self._save_custom_data(data)
        return {"standard_en": standard_en, "added_variants": variants}

    def reclean_metadata_dicom(self, records):
        """Re-clean pre-computed demo metadata using DICOM mode."""
        from medical_data_agent.utils import normalize_age_dicom, normalize_sex_dicom
        for rec in records:
            rec["PatientAgeClean"] = normalize_age_dicom(rec.get("PatientAge"))
            rec["PatientSexClean"] = normalize_sex_dicom(rec.get("PatientSex"))
        return records

    def run_pipeline(self, data_dir: str, agent: str = "all", cleaning_mode: str = "analysis", use_llm: bool = False):
        self._status = "running"
        self._progress = 0
        steps_total = {"all": 4, "agent1": 1, "agent2": 2, "agent3": 2}

        _log(f"[RadClean] data_dir={data_dir}")
        _log(f"[RadClean] contents={os.listdir(data_dir) if os.path.isdir(data_dir) else 'NOT A DIR'}")

        try:
            pipeline = CleaningPipeline(data_root=data_dir)
            pipeline.metadata_cleaner.mode = cleaning_mode

            # Stage 1 is prerequisite for Stage 2 and Stage 3
            if agent in ("all", "agent1", "agent2", "agent3"):
                self._progress = 10
                pipeline.validate_images()
                self._progress = 15
                import glob as _glob1
                meta_dir = os.path.join(data_dir, "ctvit-transformer")
                if not os.path.isdir(meta_dir):
                    candidates = _glob1.glob(os.path.join(data_dir, "**", "ctvit-transformer"), recursive=True)
                    if candidates:
                        meta_dir = candidates[0]
                from medical_data_agent.utils import load_json_metadata
                pipeline.raw_metadata = load_json_metadata(meta_dir)
                pipeline.cleaned_metadata = pipeline.metadata_cleaner.clean(pipeline.raw_metadata)
                self._progress = 25 if agent == "agent1" else 25

            # Stage 2 is prerequisite for Stage 3
            if agent in ("all", "agent2", "agent3"):
                import pandas as pd
                import glob as _glob
                # Search for data_reports.xlsx or any .xlsx at any depth
                excel_path = os.path.join(data_dir, "data_reports.xlsx")
                _log(f"[RadClean] Stage2: looking for data_reports.xlsx, checking {excel_path} → exists={os.path.exists(excel_path)}")
                if not os.path.exists(excel_path):
                    candidates = _glob.glob(os.path.join(data_dir, "**", "data_reports.xlsx"), recursive=True)
                    _log(f"[RadClean] Stage2: glob candidates for data_reports.xlsx: {candidates}")
                    if candidates:
                        excel_path = candidates[0]
                    else:
                        # Fallback: try any .xlsx that looks like report data
                        all_xlsx = _glob.glob(os.path.join(data_dir, "**", "*.xlsx"), recursive=True)
                        _log(f"[RadClean] Stage2: all .xlsx files: {all_xlsx}")
                        for cand in all_xlsx:
                            if 'text_prompts' in os.path.basename(cand):
                                continue  # skip prompt files
                            excel_path = cand
                            break
                if os.path.exists(excel_path):
                    _log(f"[RadClean] Stage2: reading Excel from {excel_path}")
                    df = pd.read_excel(excel_path)
                    _log(f"[RadClean] Stage2: columns={list(df.columns)}, rows={len(df)}")
                    # Normalize column names: try to find the accession column
                    acc_col = None
                    acc_candidates = ['AccessionNo', 'Accession', 'PatientID', 'PatientId',
                                      'patient_id', 'accession_no', 'ID', 'Id', '编号', '检查号',
                                      '住院号', '病历号']
                    for c in acc_candidates:
                        if c in df.columns:
                            acc_col = c
                            break
                    # If no known accession column, try the first column
                    if acc_col is None and len(df.columns) > 0:
                        acc_col = df.columns[0]
                    _log(f"[RadClean] Stage2: using acc_col={acc_col}")
                    # Rename to what annotator expects
                    if acc_col and acc_col != 'AccessionNo':
                        df = df.rename(columns={acc_col: 'AccessionNo'})
                    ann_excel = pipeline.annotator.annotate_reports_from_excel(df)
                    _log(f"[RadClean] Stage2: annotated {len(ann_excel)} reports from Excel")
                    pipeline.annotations.update(ann_excel)

                    # If no annotations from data_reports.xlsx, try text_prompts.xlsx format
                    if not pipeline.annotations:
                        prompt_path = os.path.join(data_dir, "text_prompts.xlsx")
                        if not os.path.exists(prompt_path):
                            candidates = _glob.glob(os.path.join(data_dir, "**", "text_prompts.xlsx"), recursive=True)
                            if candidates:
                                prompt_path = candidates[0]
                        if os.path.exists(prompt_path):
                            _log(f"[RadClean] Stage2: trying text_prompts.xlsx from {prompt_path}")
                            df_prompts = pd.read_excel(prompt_path)
                            text_col = None
                            for c in ['Text_prompts', 'Text', 'text', 'Report', '报告', ' Findings']:
                                if c in df_prompts.columns:
                                    text_col = c
                                    break
                            if text_col is None and len(df_prompts.columns) >= 2:
                                text_col = df_prompts.columns[1]
                            if text_col:
                                id_col = df_prompts.columns[0]
                                df_prompts = df_prompts.rename(columns={id_col: 'AccessionNo', text_col: 'Findings'})
                                df_prompts['ClinicalInformation'] = ''
                                df_prompts['Technique'] = ''
                                df_prompts['Impressions'] = ''
                                ann_prompts = pipeline.annotator.annotate_reports_from_excel(df_prompts)
                                _log(f"[RadClean] Stage2: annotated {len(ann_prompts)} reports from text_prompts")
                                pipeline.annotations.update(ann_prompts)
                # Search for superres/ctvit_outputs at any depth
                superres_dir = os.path.join(data_dir, "superres", "ctvit_outputs")
                _log(f"[RadClean] Stage2: looking for superres, checking {superres_dir} → exists={os.path.exists(superres_dir)}")
                if not os.path.exists(superres_dir):
                    candidates = _glob.glob(os.path.join(data_dir, "**", "superres", "ctvit_outputs"), recursive=True)
                    _log(f"[RadClean] Stage2: glob for superres: {candidates}")
                    if candidates:
                        superres_dir = candidates[0]
                if os.path.exists(superres_dir):
                    _log(f"[RadClean] Stage2: found superres at {superres_dir}")
                    ann_superres = pipeline.annotator.annotate_superres_txts(superres_dir)
                    _log(f"[RadClean] Stage2: annotated {len(ann_superres)} groups from superres txts")
                    for acc, anns in ann_superres.items():
                        merged = anns[0] if len(anns) == 1 else pipeline._merge_anns(anns)
                        if acc in pipeline.annotations:
                            pipeline.annotations[acc] = pipeline._merge_two_anns(pipeline.annotations[acc], merged)
                        else:
                            pipeline.annotations[acc] = merged

                # LLM 增强：自动对 Stage 2 标注结果进行 13 字段结构化
                if use_llm:
                    _log(f"[RadClean] Stage2: running LLM structuring on {len(pipeline.annotations)} reports")
                    try:
                        llm_results = self.run_agent2_llm(pipeline.annotations)
                        pipeline._llm_structured = llm_results
                        _log(f"[RadClean] Stage2: LLM structured {len(llm_results)} reports")
                    except Exception as e:
                        _log(f"[RadClean] Stage2: LLM structuring failed — {e}")
                        pipeline._llm_structured = None

                self._progress = 50 if agent == "agent2" else 50

            if agent in ("all", "agent3"):
                pipeline.classifications = pipeline.classifier.classify_batch(pipeline.annotations)
                self._progress = 75
                pipeline.quality_report = pipeline.quality_guard.assess(
                    pipeline.cleaned_metadata,
                    pipeline.annotations,
                    pipeline.classifications,
                )
                self._progress = 90

            self._progress = 100
            self._status = "done"
            self._last_data_dir = data_dir
            self._last_result = pipeline._build_output()
            self._last_result["_cleaning_mode"] = cleaning_mode

            # Include LLM results if available
            llm = getattr(pipeline, '_llm_structured', None)
            if llm:
                self._last_result["llm_structured"] = llm

            # Generate AI governance summary on-the-fly (when quality_report is available)
            if agent in ("all", "agent3") and pipeline.quality_report:
                try:
                    from .llm_service import LLMService as _LLMService
                    llm_svc = _LLMService()
                    meta_summary = {
                        "total_records": len(pipeline.cleaned_metadata) if pipeline.cleaned_metadata else 0,
                        "total_cases": len(pipeline.annotations) if pipeline.annotations else 0,
                    }
                    gov_summary = llm_svc.generate_governance_summary(
                        pipeline.quality_report, meta_summary
                    )
                    self._last_result["governance_summary"] = gov_summary
                    _log(f"[RadClean] Stage3: AI governance summary generated ({len(gov_summary)} chars)")
                except Exception as e:
                    _log(f"[RadClean] Stage3: governance summary failed — {e}")

                try:
                    sem_verify = llm_svc.verify_batch_semantic(pipeline.annotations, sample_size=3)
                    self._last_result["semantic_verification"] = sem_verify
                    _log(f"[RadClean] Stage3: semantic verification done for {len(sem_verify)} cases")
                except Exception as e:
                    _log(f"[RadClean] Stage3: semantic verification failed — {e}")

            return self._last_result

        except Exception as e:
            self._status = "error"
            raise e

    def export_results(self):
        if not self._last_result:
            # Fall back to demo data if no pipeline has been run
            result = self.load_demo_data()
            if not result:
                raise ValueError("No pipeline results available. Run the pipeline first.")
            data_dir = None
        else:
            data_dir = self._last_data_dir
            result = self._last_result

        # Use temp file, not BytesIO — the payload can reach ~1 GB
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        try:
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
                root = "radclean_governed_data/"

                # ── README.txt ──
                readme = self._build_readme(result)
                zf.writestr(root + "README.txt", readme)

                # ── summary.csv ──
                zf.writestr(root + "summary.csv", self._build_summary_csv(result))

                # ── PDF 报告 ──
                try:
                    from .pdf_report import build_pdf
                    summary = self.load_governance_summary()
                    pdf_buf = build_pdf(result, data_dir, governance_summary=summary)
                    zf.writestr(root + "RadClean_治理报告.pdf", pdf_buf.getvalue())
                except Exception as e:
                    _log(f"PDF report generation failed: {e}")

                # ── AI 治理摘要 ──
                try:
                    summary = self.load_governance_summary()
                    if summary:
                        zf.writestr(root + "reports/governance_summary.txt", summary)
                except Exception:
                    pass

                # ── AI 语义验证 ──
                try:
                    semver = self.load_semantic_verification()
                    if semver:
                        zf.writestr(root + "reports/semantic_verification.json",
                                    json.dumps(semver, ensure_ascii=False, indent=2))
                except Exception:
                    pass

                # ── reports/  (JSON) ──
                for key in ["quality_report", "image_validation"]:
                    data = result.get(key)
                    if data is not None:
                        zf.writestr(root + f"reports/{key}.json",
                                    json.dumps(data, ensure_ascii=False, indent=2))

                # terminology from demo_data
                try:
                    term = self.load_terminology()
                    zf.writestr(root + "reports/terminology_mapping.json",
                                json.dumps(term, ensure_ascii=False, indent=2))
                except Exception:
                    pass

                # ── data/  (治理产物) ──
                for key in ["cleaned_metadata", "annotations", "classifications"]:
                    data = result.get(key)
                    if data is not None:
                        zf.writestr(root + f"data/{key}.json",
                                    json.dumps(data, ensure_ascii=False, indent=2))

                # metadata changelog CSV
                changelog = self._build_changelog_csv(result)
                if changelog:
                    zf.writestr(root + "data/metadata_changelog.csv", changelog)

                # file manifest CSV
                manifest = self._build_file_manifest(result, data_dir)
                if manifest:
                    zf.writestr(root + "data/file_manifest.csv", manifest)

                # structured reports (LLM) — if present
                llm_data = result.get("llm_structured")
                if llm_data:
                    zf.writestr(root + "data/structured_reports/llm_structured.json",
                                json.dumps(llm_data, ensure_ascii=False, indent=2))

                # ── images/  (原始影像, ZIP_STORED 不二次压缩) ──
                self._add_images(zf, root + "images/", data_dir)

            tmp.seek(0)
            return tmp

        except Exception:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass
            raise

    # ── Private helpers ──

    def _build_readme(self, result):
        from datetime import datetime
        q = result.get("quality_report", {})
        iv = result.get("image_validation", {})
        meta = result.get("cleaned_metadata", [])
        acc_set = set()
        for r in meta:
            acc = (r or {}).get("_accession_no")
            if acc:
                acc_set.add(acc)

        lines = [
            "RadClean 数据治理包",
            "=" * 40,
            f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"治理病例数: {len(acc_set)}",
            f"影像文件数: {iv.get('total_files', 'N/A')}",
            f"影像数据量: {iv.get('total_size_mb', 'N/A')} MB",
            f"质量总评: {'PASS' if q.get('overall_pass') else 'FAIL'}",
            f"综合评分: {q.get('overall_score', 'N/A')}",
            "",
            "目录说明:",
            "  reports/  治理报告（质量评估、影像校验、术语对照）",
            "  data/     治理产物（清洗后元数据、标注、分类、变更记录）",
            "  images/   原始 CT 影像（.nii.gz NIfTI 格式，按患者组织）",
            "",
            "",
            f"清洗策略: {'DICOM 兼容模式 (年龄→DICOM AS, 性别→DICOM CS)' if result.get('_cleaning_mode') == 'dicom' else '分析模式 (年龄→整数, 性别→全称)'}",
            "",
            "数据治理范围:",
            "  Stage 1 — 元数据清洗: 年龄/性别格式化、厂商标准化、HU截距/斜率校验",
            "  Stage 2 — 报告标注: 21类疾病检出、50+解剖部位识别、否定排除",
            "  Stage 3 — 治理验证: 完整性/准确性/一致性/可用性 4维评估",
        ]
        return "\n".join(lines) + "\n"

    def _build_summary_csv(self, result):
        meta = result.get("cleaned_metadata", [])
        anns = result.get("annotations", {})
        clfs = result.get("classifications", {})

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["检查号", "年龄", "性别", "设备", "检出疾病数", "部位数", "否定发现数", "主要分类", "分类置信度"])

        seen = set()
        for r in meta:
            acc = r.get("_accession_no", "")
            if not acc or acc in seen:
                continue
            seen.add(acc)
            ann = anns.get(acc, {})
            clf = clfs.get(acc, {})
            diseases = list(ann.get("diseases", {}).keys()) if ann else []
            anatomy = ann.get("anatomy_mentioned", []) if ann else []
            negated = ann.get("negated_findings", []) if ann else []
            top_cls = ""
            top_conf = ""
            if clf and clf.get("labels"):
                top = clf["labels"][0] if clf["labels"] else {}
                top_cls = top.get("label", "")
                top_conf = top.get("confidence", "")

            w.writerow([
                acc,
                r.get("PatientAgeClean", r.get("PatientAge", "")),
                r.get("PatientSexClean", r.get("PatientSex", "")),
                r.get("ManufacturerClean", r.get("Manufacturer", "")),
                len(diseases),
                len(anatomy),
                len(negated),
                top_cls,
                top_conf,
            ])
        return buf.getvalue()

    def _build_changelog_csv(self, result):
        meta = result.get("cleaned_metadata", [])
        if not meta:
            return ""

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["检查号", "字段", "清洗前", "清洗后"])

        fields = [
            ("PatientAge", "PatientAgeClean"),
            ("PatientSex", "PatientSexClean"),
            ("Manufacturer", "ManufacturerClean"),
            ("RescaleIntercept", "RescaleInterceptClean"),
            ("RescaleSlope", "RescaleSlopeClean"),
        ]

        seen = set()
        for r in meta:
            acc = r.get("_accession_no", "")
            if not acc or acc in seen:
                continue
            seen.add(acc)
            for before_f, after_f in fields:
                before = str(r.get(before_f, ""))
                after = str(r.get(after_f, ""))
                if before != after:
                    w.writerow([acc, before_f, before, after])
        return buf.getvalue()

    def _build_file_manifest(self, result, data_dir):
        iv = result.get("image_validation")
        if iv and iv.get("files"):
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(["文件名", "患者ID", "尺寸", "体素间距(mm)", "方向", "文件大小(MB)", "状态"])

            for f in iv["files"]:
                dims = "×".join(str(d) for d in f.get("dimensions", []))
                spac = "×".join(str(s) for s in f.get("voxel_spacing_mm", []))
                size_mb = round(f.get("file_size_bytes", 0) / (1024 * 1024), 2)
                w.writerow([
                    f.get("file", ""),
                    f.get("patient_id", ""),
                    dims,
                    spac,
                    f.get("orientation", ""),
                    size_mb,
                    "OK" if f.get("valid") else "CORRUPT",
                ])
            return buf.getvalue()
        return ""

    def _add_images(self, zf, prefix, data_dir):
        """Add .nii.gz image files to the zip using ZIP_STORED (already compressed)."""
        import glob
        import re

        if not data_dir or not os.path.isdir(data_dir):
            return

        # ctvit-transformer: original CT images
        ctvit_dir = os.path.join(data_dir, "ctvit-transformer")
        if os.path.isdir(ctvit_dir):
            for src_path in glob.glob(os.path.join(ctvit_dir, "**", "*.nii.gz"), recursive=True):
                patient = self._extract_patient(src_path, data_dir)
                arcname = f"{prefix}{patient}/original/{os.path.basename(src_path)}"
                zf.write(src_path, arcname, compress_type=zipfile.ZIP_STORED)

        # superres: super-resolution processed images
        superres_dir = os.path.join(data_dir, "superres", "ctvit_outputs")
        if os.path.isdir(superres_dir):
            for src_path in glob.glob(os.path.join(superres_dir, "**", "*.nii.gz"), recursive=True):
                patient = self._extract_patient(src_path, data_dir)
                arcname = f"{prefix}{patient}/superres/{os.path.basename(src_path)}"
                zf.write(src_path, arcname, compress_type=zipfile.ZIP_STORED)

    @staticmethod
    def _extract_patient(src_path, data_dir):
        import re
        rel = os.path.relpath(src_path, data_dir)
        for part in rel.replace("\\", "/").split("/"):
            m = re.search(r'BGC\d+', part, re.IGNORECASE)
            if m:
                return m.group(0).upper()
        return "unknown"

    def run_agent2_llm(self, annotations: dict):
        from .llm_service import LLMService
        llm = LLMService()
        results = {}
        for acc, ann in annotations.items():
            raw_text = ann.get("raw_text", "")
            if raw_text:
                results[acc] = llm.structure_report(raw_text, acc)
        return results
