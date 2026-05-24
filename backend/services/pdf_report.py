"""RadClean 数据治理报告 PDF 生成器"""

import json
import os
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONTS_DIR = os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts")

_fonts_registered = False

def _register_fonts():
    global _fonts_registered
    if _fonts_registered:
        return
    for fname, name in [
        ("simhei.ttf", "SimHei"),
        ("STSONG.TTF", "STSong"),
        ("simkai.ttf", "SimKai"),
    ]:
        path = os.path.join(FONTS_DIR, fname)
        if os.path.exists(path):
            pdfmetrics.registerFont(TTFont(name, path))
    pdfmetrics.registerFont(TTFont("SimHei", os.path.join(FONTS_DIR, "simhei.ttf")))
    _fonts_registered = True


def _style(name, font_name="STSong", font_size=10, **kwargs):
    defaults = dict(
        name=name, fontName=font_name, fontSize=font_size,
        leading=font_size * 1.5, spaceAfter=6, spaceBefore=0,
    )
    defaults.update(kwargs)
    return ParagraphStyle(**defaults)


def build_pdf(result: dict, data_dir: str | None = None, governance_summary: str | None = None) -> BytesIO:
    """Generate the RadClean governance report PDF."""
    _register_fonts()

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title="RadClean 数据治理报告",
        author="RadClean",
    )

    story = []

    # ─── styles ───
    s_title = _style("title", "SimHei", 22, alignment=TA_CENTER, spaceAfter=6)
    s_subtitle = _style("subtitle", "STSong", 11, alignment=TA_CENTER, spaceAfter=20, textColor=colors.HexColor("#555555"))
    s_h1 = _style("h1", "SimHei", 15, spaceAfter=4, spaceBefore=16)
    s_h2 = _style("h2", "SimHei", 12, spaceAfter=4, spaceBefore=10)
    s_body = _style("body", "STSong", 10, spaceAfter=4)
    s_small = _style("small", "STSong", 8, textColor=colors.HexColor("#888888"))
    s_kpi_label = _style("kpi_label", "STSong", 9, alignment=TA_CENTER, textColor=colors.HexColor("#666666"))
    s_kpi_val = _style("kpi_val", "SimHei", 18, alignment=TA_CENTER)
    s_pass = _style("pass", "SimHei", 14, alignment=TA_CENTER, textColor=colors.HexColor("#2D5A27"))
    s_fail = _style("fail", "SimHei", 14, alignment=TA_CENTER, textColor=colors.HexColor("#8B1A1A"))
    s_cell = _style("cell", "STSong", 8)
    s_cell_bold = _style("cell_bold", "SimHei", 8)

    # ─── helpers ───
    def hr():
        story.append(Spacer(1, 2 * mm))
        story.append(Table([[""]], colWidths=[doc.width], rowHeights=[0.5 * mm],
                          style=TableStyle([("LINEABOVE", (0, 0), (-1, 0), 0.5, colors.HexColor("#CCCCCC"))])))
        story.append(Spacer(1, 4 * mm))

    def data_table(headers, rows, col_widths=None):
        """Styled data table with header row."""
        all_rows = [[Paragraph(h, s_cell_bold) for h in headers]] + [
            [Paragraph(str(c), s_cell) for c in row] for row in rows
        ]
        if col_widths is None:
            col_widths = [doc.width / len(headers)] * len(headers)
        t = Table(all_rows, colWidths=col_widths, repeatRows=1)
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F0F0F0")),
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#999999")),
            ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]
        # zebra striping
        for i in range(1, len(all_rows)):
            if i % 2 == 0:
                style_cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FAFAFA")))
        t.setStyle(TableStyle(style_cmds))
        return t

    def kv_table(pairs, col_widths=None):
        """Key-value table."""
        if col_widths is None:
            col_widths = [doc.width * 0.35, doc.width * 0.65]
        rows = [[Paragraph(k, s_cell_bold), Paragraph(str(v), s_cell)] for k, v in pairs]
        t = Table(rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#EEEEEE")),
        ]))
        return t

    # ═══════════════════════════════════════════
    # EXTRACT DATA
    # ═══════════════════════════════════════════
    q = result.get("quality_report", {})
    iv = result.get("image_validation", {})
    meta = result.get("cleaned_metadata", [])
    anns = result.get("annotations", {})
    clfs = result.get("classifications", {})
    llm_data = result.get("llm_structured", {})
    cleaning_mode = result.get("_cleaning_mode", "analytic")

    acc_set = set()
    for r in meta:
        acc = (r or {}).get("_accession_no")
        if acc:
            acc_set.add(acc)

    patient_ids = sorted(acc_set)
    n_patients = len(patient_ids)
    n_images = iv.get("total_files", 0)
    overall_score = q.get("overall_score", "N/A")
    overall_pass = q.get("overall_pass", False)

    # terminology
    try:
        from services.pipeline_service import PipelineService
        term = PipelineService().load_terminology()
    except Exception:
        term = []

    # ═══════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════
    story.append(Spacer(1, 5 * cm))
    story.append(Paragraph("RadClean", _style("logo", "SimHei", 32, alignment=TA_CENTER, spaceAfter=2)))
    story.append(Paragraph("放射科 CT 数据治理报告", s_title))
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(f"治理日期: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}", s_subtitle))
    story.append(Spacer(1, 2 * cm))

    # KPI row
    kpi_data = [
        [Paragraph(str(n_patients), s_kpi_val), Paragraph(str(n_images), s_kpi_val),
         Paragraph(f"{overall_score}" if isinstance(overall_score, (int, float)) else str(overall_score), s_kpi_val),
         Paragraph("PASS" if overall_pass else "FAIL", s_pass if overall_pass else s_fail)],
        [Paragraph("治理病例数", s_kpi_label), Paragraph("影像文件数", s_kpi_label),
         Paragraph("综合评分", s_kpi_label), Paragraph("质量总评", s_kpi_label)],
    ]
    kpi_t = Table(kpi_data, colWidths=[doc.width / 4] * 4)
    kpi_t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E5E5E5")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
    ]))
    story.append(kpi_t)
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph(f"清洗策略: {'DICOM 兼容模式' if cleaning_mode == 'dicom' else '分析模式'}", s_subtitle))
    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # STAGE 1 — DATA CLEANING
    # ═══════════════════════════════════════════
    story.append(Paragraph("Stage 1 · 数据净化", s_h1))
    story.append(Paragraph("规则引擎对原始 DICOM 元数据进行文件层和字段层治理。", s_body))
    hr()

    # cleaning statistics
    fields = [
        ("PatientAge", "PatientAgeClean"),
        ("PatientSex", "PatientSexClean"),
        ("Manufacturer", "ManufacturerClean"),
        ("RescaleIntercept", "RescaleInterceptClean"),
        ("RescaleSlope", "RescaleSlopeClean"),
    ]
    total_fields = 0
    changed_fields = 0
    changelog_rows = []
    for r in meta:
        acc = r.get("_accession_no", "")
        for before_f, after_f in fields:
            total_fields += 1
            before = str(r.get(before_f, ""))
            after = str(r.get(after_f, ""))
            if before != after:
                changed_fields += 1
                changelog_rows.append([acc, before_f, before, after])

    pct = round(changed_fields / max(total_fields, 1) * 100, 1)
    story.append(Paragraph(
        f"共处理 <b>{n_patients}</b> 例患者，<b>{total_fields}</b> 个字段，"
        f"其中 <b>{changed_fields}</b> 个字段发生变更（{pct}%）。",
        s_body
    ))

    # changelog table
    if changelog_rows:
        story.append(Paragraph("元数据变更明细", s_h2))
        story.append(data_table(
            ["检查号", "字段", "清洗前", "清洗后"],
            changelog_rows,
            [doc.width * 0.22, doc.width * 0.18, doc.width * 0.30, doc.width * 0.30],
        ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════
    # STAGE 2 — REPORT STRUCTURING
    # ═══════════════════════════════════════════
    story.append(Paragraph("Stage 2 · 报告结构化", s_h1))
    story.append(Paragraph("规则引擎对自由文本 CT 报告进行实体识别与疾病分类。", s_body))
    hr()

    # per-patient summary
    for acc in patient_ids:
        ann = anns.get(acc, {})
        clf = clfs.get(acc, {}) if clfs else {}

        # diseases from annotations (dict of disease_name -> list of mentions)
        diseases = sorted(ann.get("diseases", {}).keys()) if ann else []

        # anatomy from annotations (list of strings)
        anatomy = ann.get("anatomy_mentioned", []) if ann else []

        # negated findings: list of dicts with 'disease' key
        negated_raw = ann.get("negated_findings", []) if ann else []
        if negated_raw and isinstance(negated_raw[0], dict):
            negated = [n.get("disease", str(n)) for n in negated_raw]
        else:
            negated = [str(n) for n in negated_raw]

        # classification labels
        labels = clf.get("labels", []) if isinstance(clf, dict) else []
        top_label = labels[0].get("label", "") if labels else ""
        top_conf = labels[0].get("confidence", "") if labels else ""

        story.append(Paragraph(f"患者: {acc}", s_h2))
        story.append(kv_table([
            ("检出疾病数", len(diseases)),
            ("检出疾病", ", ".join(diseases) if diseases else "无"),
            ("解剖部位", ", ".join(anatomy) if anatomy else "未识别"),
            ("否定发现", ", ".join(negated) if negated else "无"),
            ("主要分类", f"{top_label} (置信度: {top_conf})" if top_label else "N/A"),
        ]))

    story.append(PageBreak())

    # LLM structured reports (if available)
    if llm_data:
        story.append(Paragraph("LLM 增强 · 13 字段深度结构化", s_h1))
        story.append(Paragraph("LLM 增强模块对自由文本报告进行语义级深度结构化提取。", s_body))
        hr()

        for acc in patient_ids:
            ld = llm_data.get(acc, {})
            if not ld or ld.get("error"):
                continue

            story.append(Paragraph(f"患者: {acc}", s_h2))

            # basic info
            story.append(kv_table([
                ("年龄", str(ld.get("age", "N/A"))),
                ("性别", str(ld.get("sex", "N/A"))),
                ("严重等级", str(ld.get("severity_rank", "N/A"))),
                ("需要随访", "是" if ld.get("follow_up") else "否"),
            ]))

            # organs detail
            organs = ld.get("organs", [])
            if organs:
                story.append(Paragraph("器官详情", _style("", "SimHei", 9, spaceAfter=2, spaceBefore=6)))
                organ_rows = []
                for o in organs:
                    organ_rows.append([
                        o.get("name", ""),
                        o.get("finding", ""),
                        str(o.get("measurement", "")),
                        str(o.get("distribution", "")),
                        str(o.get("side", "")),
                    ])
                story.append(data_table(
                    ["器官", "发现", "测量值", "分布", "侧别"],
                    organ_rows,
                    [doc.width * 0.16, doc.width * 0.28, doc.width * 0.16, doc.width * 0.18, doc.width * 0.22],
                ))

            # pathologies, negated, recommendations
            story.append(kv_table([
                ("病理发现", ", ".join(ld.get("pathologies", [])) or "无"),
                ("排除发现", ", ".join(ld.get("negated_findings", [])) or "无"),
                ("随访建议", ", ".join(ld.get("recommendations", [])) or "无"),
                ("解剖部位", ", ".join(ld.get("anatomy_mentioned", [])) or "无"),
                ("修饰词", ", ".join(ld.get("modifiers", [])) or "无"),
                ("印象摘要", ld.get("impression_summary", "N/A")),
                ("数据质量备注", ld.get("confidence_note", "N/A")),
            ]))

        story.append(PageBreak())

    # ═══════════════════════════════════════════
    # STAGE 3 — QUALITY ASSESSMENT
    # ═══════════════════════════════════════════
    story.append(Paragraph("Stage 3 · 治理验证", s_h1))
    story.append(Paragraph("从完整性、准确性、一致性、可用性四个维度量化治理效果。", s_body))
    hr()

    # overall
    story.append(kv_table([
        ("综合评分", f"{overall_score}"),
        ("质量总评", "PASS ✓" if overall_pass else "FAIL ✗"),
    ]))

    # 4-dimension detail
    for dim_key, dim_label in [
        ("completeness", "完整性"),
        ("accuracy", "准确性"),
        ("consistency", "一致性"),
        ("usability", "可用性"),
    ]:
        dim_data = q.get(dim_key, {})
        if not dim_data:
            continue

        story.append(Paragraph(dim_label, s_h2))

        score = dim_data.get("score", "N/A")
        if isinstance(score, (int, float)):
            score_str = f"{score:.2f}"
        else:
            score_str = str(score)

        items = [(f"{dim_label}评分", score_str)]

        # completeness: per-field detail
        if dim_key == "completeness":
            for fd in dim_data.get("fields", [])[:20]:
                items.append((
                    f"字段 {fd.get('field','')}",
                    f"缺失率 {fd.get('missing_rate',0):.0%} ({'PASS' if fd.get('pass') else 'FAIL'})"
                ))

        # accuracy issues
        if dim_key == "accuracy":
            issues = dim_data.get("issues", [])
            if issues:
                items.append(("问题数量", str(len(issues))))
                for iss in issues[:5]:
                    items.append(("  问题", str(iss.get("detail", iss))))

        # consistency: metadata cross-check + annotation-classification match
        if dim_key == "consistency":
            issues = dim_data.get("issues", [])
            if issues:
                items.append(("元数据不一致项", str(len(issues))))
                for iss in issues[:5]:
                    items.append((f"  {iss.get('accession','')} {iss.get('field','')}",
                                  f"metadata={iss.get('metadata_value','')} vs annotation={iss.get('annotation_value','')}"))
            ann_issues = dim_data.get("annotation_issues", [])
            if ann_issues:
                items.append(("标注-分类标签差异", str(len(ann_issues))))
                for ai in ann_issues[:3]:
                    only_ann = ", ".join(ai.get("only_in_annotations", [])) or "-"
                    only_cls = ", ".join(ai.get("only_in_classifications", [])) or "-"
                    items.append((f"  {ai.get('accession','')}",
                                  f"仅标注: {only_ann} / 仅分类: {only_cls}"))

        # usability: annotation coverage + confidence
        if dim_key == "usability":
            items.append(("阈值", str(dim_data.get("threshold", "N/A"))))
            ac = dim_data.get("annotation_coverage")
            if ac is not None:
                items.append(("标注覆盖率", f"{ac:.0%}"))
            acf = dim_data.get("avg_confidence")
            if acf is not None:
                items.append(("平均疾病置信度", f"{acf:.3f}"))
            items.append(("说明", "阳性标签覆盖率(40%) + 标注覆盖率(30%) + 平均置信度(30%)"))

        story.append(kv_table(items))

    # ═══════════════════════════════════════════
    # AI GOVERNANCE SUMMARY
    # ═══════════════════════════════════════════
    if governance_summary:
        story.append(PageBreak())
        story.append(Paragraph("AI 治理总结", s_h1))
        story.append(Paragraph("由 LLM 增强模块基于治理结果自动生成的综合分析。", s_small))
        hr()
        for line in governance_summary.strip().split('\n'):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 3 * mm))
                continue
            if line.startswith('**') and line.endswith('**'):
                story.append(Paragraph(line.strip('*'), s_h2))
            elif line.startswith('- **'):
                story.append(Paragraph(line.lstrip('- '), _style("body_bold", "SimHei", 9, spaceAfter=2)))
            elif line.startswith('- '):
                story.append(Paragraph(line[2:], s_body))
            else:
                story.append(Paragraph(line, s_body))

    # ═══════════════════════════════════════════
    # TERMINOLOGY
    # ═══════════════════════════════════════════
    if term:
        story.append(PageBreak())
        story.append(Paragraph("术语标准化对照", s_h1))
        story.append(Paragraph("中英文术语标准化映射，含常见变体。", s_body))
        hr()

        term_rows = []
        for t in term[:60]:
            variants = t.get("variants", [])
            term_rows.append([
                t.get("chinese", ""),
                t.get("english", ""),
                t.get("type", ""),
                ", ".join(variants[:4]) + ("..." if len(variants) > 4 else ""),
            ])
        story.append(data_table(
            ["标准中文", "标准英文", "类型", "变体"],
            term_rows,
            [doc.width * 0.22, doc.width * 0.28, doc.width * 0.12, doc.width * 0.38],
        ))
        if len(term) > 60:
            story.append(Paragraph(f"...共 {len(term)} 条术语，仅展示前 60 条", s_small))

    # ═══════════════════════════════════════════
    # FILE MANIFEST
    # ═══════════════════════════════════════════
    files = iv.get("files", [])
    if files:
        story.append(PageBreak())
        story.append(Paragraph("影像文件清单", s_h1))
        story.append(Paragraph("原始 CT 影像文件核验清单。", s_body))
        hr()

        f_rows = []
        for f in files[:50]:
            dims = "×".join(str(d) for d in f.get("dimensions", []))
            f_rows.append([
                f.get("filename", ""),
                f.get("patient_id", ""),
                dims,
                str(f.get("spacing_mm", "")),
                f"{f.get('size_mb', 0):.1f} MB" if f.get("size_mb") else "",
                f.get("status", ""),
            ])
        story.append(data_table(
            ["文件名", "患者ID", "尺寸(像素)", "体素间距(mm)", "文件大小", "状态"],
            f_rows,
            [doc.width * 0.30, doc.width * 0.14, doc.width * 0.14, doc.width * 0.14, doc.width * 0.12, doc.width * 0.16],
        ))

    # ─── build ───
    doc.build(story)
    buf.seek(0)
    return buf
