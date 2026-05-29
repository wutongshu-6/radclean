var _outputMode = 'human'; // 'model' | 'human'
var _outputData = null;

async function renderDashboard() {
  var page = document.getElementById('page-dashboard');
  if (!page) return;

  // Load output data
  try {
    var [assessments, findings, termMappings, kernelMapping] = await Promise.all([
      API.getDemoData('per_patient_assessments'),
      API.getDemoData('structured_findings'),
      API.getDemoData('terminology_mappings'),
      API.getDemoData('kernel_mapping')
    ]);
    _outputData = {
      assessments: assessments || {},
      findings: findings || {},
      termMappings: termMappings || {},
      kernelMapping: kernelMapping || {}
    };
  } catch(e) {
    _outputData = { assessments: {}, findings: {}, termMappings: {}, kernelMapping: {} };
  }

  var patientIds = Object.keys(_outputData.assessments).sort();

  page.innerHTML =
    '<div class="container">' +
    '<div class="section-header">' +
    '<h2>治理产出</h2>' +
    '<p class="text-secondary" style="font-size:0.85rem;margin-top:4px">双输出体系 — 模型消费（机器可读）· 人工审查（可视化质控）</p>' +
    '</div>' +

    // Mode toggle
    '<div style="display:flex;justify-content:center;margin-bottom:var(--space-xl)">' +
    '<div class="mode-toggle">' +
    '<button class="mode-btn active" data-mode="human" id="mode-human">人工审查输出<br><small>面向质控人员</small></button>' +
    '<button class="mode-btn" data-mode="model" id="mode-model">模型消费输出<br><small>面向 AI 训练</small></button>' +
    '</div>' +
    '</div>' +

    // Human review section
    '<div id="output-human">' +
    renderHumanOverview(patientIds) +
    '</div>' +

    // Model consumption section
    '<div id="output-model" style="display:none">' +
    renderModelOverview(patientIds) +
    '</div>' +

    '</div>';

  // Mode switch
  page.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== page) {
      if (el.classList && el.classList.contains('mode-btn')) {
        var mode = el.getAttribute('data-mode');
        if (mode) switchOutputMode(mode);
        return;
      }
      el = el.parentElement;
    }
  });

  // Report tab switching
  page.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== page) {
      if (el.classList && el.classList.contains('report-tab')) {
        var tab = el.getAttribute('data-tab');
        if (tab) switchReportTab(tab);
        return;
      }
      el = el.parentElement;
    }
  });

  // Patient selector
  var sel = document.getElementById('patient-selector');
  if (sel) {
    sel.addEventListener('change', function() {
      loadPatientDetails(this.value);
    });
    // Load first patient by default
    if (patientIds.length > 0) loadPatientDetails(patientIds[0]);
  }

  // Render first report tab
  switchReportTab('probe');

  // Render radar chart
  setTimeout(function() { renderQualityRadar(); }, 300);
}

// === Mode Switching ===

function switchOutputMode(mode) {
  _outputMode = mode;
  var human = document.getElementById('output-human');
  var model = document.getElementById('output-model');
  var btnH = document.getElementById('mode-human');
  var btnM = document.getElementById('mode-model');

  if (btnH) btnH.classList.toggle('active', mode === 'human');
  if (btnM) btnM.classList.toggle('active', mode === 'model');
  if (human) human.style.display = mode === 'human' ? '' : 'none';
  if (model) model.style.display = mode === 'model' ? '' : 'none';
}

// === HUMAN REVIEW MODE ===

function renderHumanOverview(patientIds) {
  var totalPatients = patientIds.length;
  var totalScore = 0, passCount = 0, warnCount = 0;
  for (var i = 0; i < patientIds.length; i++) {
    var a = (_outputData.assessments[patientIds[i]] || {});
    totalScore += a.overall_quality_score || 0;
    if ((a.quality_grade || '').indexOf('B') === 0 || (a.quality_grade || '').indexOf('A') === 0) passCount++;
    if ((a.quality_grade || '').indexOf('C') === 0) warnCount++;
  }
  var avgScore = patientIds.length > 0 ? (totalScore / patientIds.length).toFixed(1) : 0;

  var html =
    // KPI row
    '<div class="kpi-grid" style="margin-bottom:var(--space-lg)">' +
    '<div class="kpi-card"><div class="data-label">总病例数</div><div class="data-value">' + totalPatients + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">平均质量评分</div><div class="data-value">' + avgScore + '</div></div>' +
    '<div class="kpi-card pass"><div class="data-label">PASS 率</div><div class="data-value">' + (passCount > 0 ? (passCount/totalPatients*100).toFixed(0) + '%' : '—') + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">需关注病例</div><div class="data-value">' + warnCount + '</div></div>' +
    '</div>' +

    // Quality radar chart
    '<div class="chart-box" style="margin-bottom:var(--space-lg)">' +
    '<h3>四维质量评估</h3>' +
    '<div class="chart-container" id="chart-radar"></div>' +
    '</div>' +

    // Per-patient assessment cards
    '<div class="section-header"><h3>患者质量评估</h3></div>' +
    '<div class="assessment-grid">';

  for (var i = 0; i < patientIds.length; i++) {
    var pid = patientIds[i];
    var a = _outputData.assessments[pid] || {};
    var dims = a.four_dimensions || {};
    var grade = a.quality_grade || '';
    var gradeClass = 'grade-b';
    if (grade.indexOf('A') === 0) gradeClass = 'grade-a';
    else if (grade.indexOf('C') === 0) gradeClass = 'grade-c';

    html += '<div class="assessment-card">' +
      '<div class="assessment-card-header">' +
      '<span class="pid">' + pid + '</span>' +
      '<span class="grade-badge ' + gradeClass + '">' + (grade || '—') + '</span>' +
      '</div>' +
      '<div class="assessment-card-body">' +
      '<div style="margin-bottom:8px;font-size:0.75rem;color:var(--text-tertiary)">评分: ' + (a.overall_quality_score || '—') + '</div>';

    // 4 dimension mini bars
    var dimKeys = ['completeness', 'consistency', 'accuracy', 'usability'];
    var dimNames = ['完整性', '一致性', '准确性', '可用性'];
    for (var d = 0; d < dimKeys.length; d++) {
      var dim = dims[dimKeys[d]] || {};
      var score = dim.score || 0;
      var fillColor = score >= 85 ? 'var(--success)' : score >= 75 ? 'var(--accent)' : score >= 65 ? '#B8860B' : 'var(--fail)';
      html += '<div class="dimension-mini">' +
        '<span class="dimension-mini-label">' + dimNames[d] + '</span>' +
        '<div class="dimension-mini-bar"><div class="dimension-mini-fill" style="width:' + score + '%;background:' + fillColor + '"></div></div>' +
        '<span class="dimension-mini-score">' + score + '</span>' +
        '</div>';
    }

    // Issues
    if (a.actionable_recommendations && a.actionable_recommendations.length > 0) {
      html += '<div style="margin-top:8px;font-size:0.7rem;color:var(--text-tertiary)">建议:</div>';
      for (var r = 0; r < Math.min(a.actionable_recommendations.length, 2); r++) {
        var rec = a.actionable_recommendations[r];
        html += '<div class="recommendation-item priority-' + (rec.priority || 'low') + '">' + rec.action + '</div>';
      }
    }

    html += '<div class="summary-text">' + (a.summary || '') + '</div>' +
      '</div></div>';
  }

  html += '</div>' +

    // Report gallery
    '<div class="section-header" style="margin-top:var(--space-xl)"><h3>诊断报告</h3></div>' +
    '<div class="report-tabs">' +
    '<button class="report-tab active" data-tab="probe">探针诊断</button>' +
    '<button class="report-tab" data-tab="field">字段完整性</button>' +
    '<button class="report-tab" data-tab="alignment">空间对齐</button>' +
    '<button class="report-tab" data-tab="phi">PHI 扫描</button>' +
    '<button class="report-tab" data-tab="annotation">标注校验</button>' +
    '</div>' +
    '<div id="report-content" class="card" style="min-height:200px;padding:var(--space-lg)"></div>';

  return html;
}

// === MODEL CONSUMPTION MODE ===

function renderModelOverview(patientIds) {
  var html =
    // KPI row
    '<div class="kpi-grid" style="margin-bottom:var(--space-lg)">' +
    '<div class="kpi-card"><div class="data-label">病例数</div><div class="data-value">' + patientIds.length + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">结构化发现</div><div class="data-value">' + (Object.keys(_outputData.findings).length > 0 ? '100%' : '—') + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">术语映射覆盖率</div><div class="data-value">100%</div></div>' +
    '<div class="kpi-card"><div class="data-label">核类型</div><div class="data-value">' + ((_outputData.kernelMapping.mappings || []).length || '—') + '</div></div>' +
    '</div>' +

    // Patient selector
    '<div style="margin-bottom:var(--space-lg);display:flex;align-items:center;gap:12px">' +
    '<label style="font-weight:600;font-size:0.85rem">患者:</label>' +
    '<select id="patient-selector" style="padding:8px 16px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;font-family:var(--font-mono);min-width:180px">' +
    patientIds.map(function(p) { return '<option value="' + p + '">' + p + '</option>'; }).join('') +
    '</select>' +
    '</div>' +

    // Patient detail panels
    '<div id="patient-detail-area">' +
    '<p style="color:var(--text-tertiary);text-align:center;padding:40px">选择患者以查看详情</p>' +
    '</div>' +

    // Kernel mapping
    '<div class="section-header" style="margin-top:var(--space-xl)"><h3>核类型标准化映射</h3></div>' +
    '<div class="card" style="padding:0;overflow-x:auto" id="kernel-table"></div>';

  return html;
}

// === Report Tab Content ===

function switchReportTab(tab) {
  var tabs = document.querySelectorAll('.report-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);

  var content = document.getElementById('report-content');
  if (!content) return;

  // Load report data
  var datasetMap = {
    probe: 'probe_report',
    field: 'field_completeness_report',
    alignment: 'alignment_report',
    phi: 'phi_report',
    annotation: 'annotation_report'
  };

  API.getDemoData(datasetMap[tab]).then(function(data) {
    if (!data) { content.innerHTML = '<p style="color:var(--text-tertiary)">报告加载中...</p>'; return; }

    switch(tab) {
      case 'probe': content.innerHTML = renderProbeReport(data); break;
      case 'field': content.innerHTML = renderFieldReport(data); break;
      case 'alignment': content.innerHTML = renderAlignmentReport(data); break;
      case 'phi': content.innerHTML = renderPhiReport(data); break;
      case 'annotation': content.innerHTML = renderAnnotationReport(data); break;
    }
  }).catch(function() {
    content.innerHTML = '<p style="color:var(--text-tertiary)">报告暂不可用</p>';
  });
}

function renderProbeReport(d) {
  var issues = (d.issues || []).map(function(i) {
    var sev = i.severity === 'high' ? 'issue-severity-high' : i.severity === 'medium' ? 'issue-severity-medium' : 'issue-severity-low';
    return '<span class="issue-tag ' + sev + '">' + i.type + ' (' + (i.count || '—') + ')</span> ' + i.detail;
  }).join('<br>');

  var actions = (d.recommended_actions || []).map(function(a) { return '<span class="output-item">' + a + '</span>'; }).join(' ');

  return '<h4 style="font-size:0.9rem;margin-bottom:12px">探针扫描诊断报告 <span style="font-size:0.7rem;color:var(--text-tertiary)">' + (d.scan_date || '') + '</span></h4>' +
    '<div class="kpi-grid" style="margin-bottom:16px">' +
    '<div class="kpi-card"><div class="data-label">患者数</div><div class="data-value">' + (d.patient_count || 0) + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">总文件数</div><div class="data-value">' + ((d.file_stats || {}).total_files || 0) + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">NIfTI 文件</div><div class="data-value">' + ((d.file_stats || {}).nifti_files || 0) + '</div></div>' +
    '<div class="kpi-card ' + (d.has_problems ? 'fail' : 'pass') + '"><div class="data-label">问题检测</div><div class="data-value">' + (d.has_problems ? '有问题' : '无问题') + '</div></div>' +
    '</div>' +
    '<div style="margin-bottom:12px"><strong>核类型:</strong> ' + (d.kernel_types || []).join(', ') + '</div>' +
    '<div style="margin-bottom:12px"><strong>发现问题:</strong><br><div style="font-size:0.8rem;line-height:2;color:var(--text-secondary)">' + issues + '</div></div>' +
    '<div><strong>推荐操作:</strong><br><div class="output-items" style="margin-top:6px">' + actions + '</div></div>' +
    '<p style="margin-top:12px;font-size:0.85rem;line-height:1.7;color:var(--text-secondary);padding-top:12px;border-top:1px solid var(--rule)">' + (d.summary || '') + '</p>';
}

function renderFieldReport(d) {
  var fc = d.field_completeness || {};
  var fields = Object.keys(fc);
  var rows = '';
  for (var i = 0; i < fields.length; i++) {
    var f = fc[fields[i]];
    rows += '<tr><td>' + fields[i] + '</td><td>' + (f.coverage || '—') + '</td></tr>';
  }

  return '<h4 style="font-size:0.9rem;margin-bottom:12px">字段完整性校验报告</h4>' +
    '<p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px">扫描日期: ' + (d.scan_date || '') + ' &middot; 文件总数: ' + (d.total_files || 0) + '</p>' +
    '<table class="cross-ref-table">' +
    '<thead><tr><th>字段</th><th>覆盖率</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<p style="margin-top:12px;font-size:0.85rem;line-height:1.7;color:var(--text-secondary);padding-top:12px;border-top:1px solid var(--rule)">' + (d.summary || '') + '</p>';
}

function renderAlignmentReport(d) {
  return '<h4 style="font-size:0.9rem;margin-bottom:12px">空间对齐校验报告</h4>' +
    '<div class="kpi-grid" style="margin-bottom:16px">' +
    '<div class="kpi-card"><div class="data-label">检查对数</div><div class="data-value">' + (d.pairs_checked || 0) + '</div></div>' +
    '<div class="kpi-card pass"><div class="data-label">匹配成功</div><div class="data-value">' + (d.matched || 0) + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">不匹配</div><div class="data-value">' + (d.unmatched || 0) + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">孤儿文件</div><div class="data-value">' + (d.orphan || 0) + '</div></div>' +
    '</div>' +
    '<p style="font-size:0.85rem;line-height:1.7;color:var(--text-secondary);padding-top:12px;border-top:1px solid var(--rule)">' + (d.summary || '') + '</p>';
}

function renderPhiReport(d) {
  var fps = (d.false_positives || []).map(function(fp) {
    return '<tr><td>' + (fp.file || '') + '</td><td><span class="mono">' + (fp.matched_text || '') + '</span></td><td>' + (fp.pattern || '') + '</td><td><span style="color:var(--success);font-weight:600">' + (fp.verdict || '') + '</span></td></tr>';
  }).join('');

  var confirmed = d.confirmed_phi || [];
  var confirmedHtml = confirmed.length === 0
    ? '<div style="color:var(--success);font-weight:600">无真实 PHI 泄露 ✓</div>'
    : confirmed.map(function(c) { return '<span class="issue-tag issue-severity-high">' + c.matched_text + '</span>'; }).join(' ');

  return '<h4 style="font-size:0.9rem;margin-bottom:12px">PHI 隐私合规扫描报告</h4>' +
    '<div class="kpi-grid" style="margin-bottom:16px">' +
    '<div class="kpi-card"><div class="data-label">扫描文件数</div><div class="data-value">' + (d.scanned_files || 0) + '</div></div>' +
    '<div class="kpi-card pass"><div class="data-label">确认 PHI</div><div class="data-value">' + confirmed.length + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">LLM 复核</div><div class="data-value">' + ((d.phi_scan_statistics || {}).llm_reviewed_candidates || 0) + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">误报率</div><div class="data-value">' + ((d.phi_scan_statistics || {}).false_positive_rate || '—') + '</div></div>' +
    '</div>' +
    '<div style="margin-bottom:12px"><strong>确认 PHI:</strong> ' + confirmedHtml + '</div>' +
    (fps ? '<div><strong>LLM 排除项 (误报):</strong><br><table class="cross-ref-table" style="margin-top:6px"><thead><tr><th>文件</th><th>匹配文本</th><th>模式</th><th>判定</th></tr></thead><tbody>' + fps + '</tbody></table></div>' : '') +
    '<p style="margin-top:12px;font-size:0.85rem;line-height:1.7;color:var(--text-secondary);padding-top:12px;border-top:1px solid var(--rule)">' + (d.action_required || '') + '</p>';
}

function renderAnnotationReport(d) {
  return '<h4 style="font-size:0.9rem;margin-bottom:12px">标注文件质量校验报告</h4>' +
    '<p style="font-size:0.85rem;line-height:1.7;color:var(--text-secondary)">' + (d.note || '') + '</p>' +
    '<p style="margin-top:12px;padding-top:12px;border-top:1px solid var(--rule);font-size:0.78rem;color:var(--text-tertiary)">' + (d.summary || '') + '</p>';
}

// === Patient Detail Loading (Model mode) ===

function loadPatientDetails(pid) {
  var area = document.getElementById('patient-detail-area');
  if (!area) return;

  area.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px">加载中...</p>';

  Promise.all([
    API.get('/outputs/patient/' + pid + '/findings'),
    API.get('/outputs/patient/' + pid + '/mappings')
  ]).then(function(results) {
    var findings = results[0];
    var mappings = results[1];

    var sf = (findings.structured_findings || []);
    var findingsRows = '';
    for (var i = 0; i < sf.length; i++) {
      var f = sf[i];
      var severityHtml = f.severity ? '<span class="issue-tag issue-severity-' + (f.severity === '建议组织学确诊' ? 'high' : f.severity.indexOf('Lung-RADS') === 0 ? 'medium' : 'low') + '">' + f.severity + '</span>' : '—';
      var negationHtml = f.negation ? '<span style="color:var(--fail);font-weight:600">是</span>' : '<span style="color:var(--text-tertiary)">否</span>';
      var temporalHtml = f.temporal ? (f.temporal.change_type || '—') : '—';

      findingsRows += '<tr>' +
        '<td>' + (f.finding_id || '') + '</td>' +
        '<td>' + (f.anatomy || '') + '</td>' +
        '<td>' + (f.finding || '') + '</td>' +
        '<td>' + (f.finding_type || '') + '</td>' +
        '<td>' + severityHtml + '</td>' +
        '<td>' + negationHtml + '</td>' +
        '<td style="font-size:0.72rem">' + temporalHtml + '</td>' +
        '</tr>';
    }

    var termMappings = (mappings.terminology || {}).mappings || [];
    var termRows = '';
    for (var j = 0; j < termMappings.length; j++) {
      var tm = termMappings[j];
      var confColor = tm.confidence >= 0.95 ? 'var(--success)' : tm.confidence >= 0.85 ? '#B8860B' : 'var(--fail)';
      termRows += '<tr>' +
        '<td>' + (tm.original_term || '') + '</td>' +
        '<td><span class="standard-badge radlex" style="font-size:0.65rem">' + (tm.radlex_term || '') + ' <span class="mono">' + (tm.radlex_id || '') + '</span></span></td>' +
        '<td><span class="standard-badge snomed" style="font-size:0.65rem">' + (tm.snomed_term || '') + ' <span class="mono">' + (tm.snomed_ct || '') + '</span></span></td>' +
        '<td style="color:' + confColor + ';font-weight:600">' + (tm.confidence != null ? (tm.confidence * 100).toFixed(0) + '%' : '—') + '</td>' +
        '<td>' + (tm.source || '') + '</td>' +
        '</tr>';
    }

    var semMappings = (mappings.semantic || {}).fields || [];
    var semRows = '';
    for (var k = 0; k < semMappings.length; k++) {
      var sm = semMappings[k];
      semRows += '<tr>' +
        '<td>' + (sm.field || '') + '</td>' +
        '<td><span class="mono">' + (sm.agent1_format_value || '') + '</span></td>' +
        '<td>' + (sm.agent3_semantic_value || '') + '</td>' +
        '<td><span class="standard-badge loinc" style="font-size:0.65rem">' + (sm.loinc_code || '—') + '</span></td>' +
        '<td><span class="standard-badge snomed" style="font-size:0.65rem">' + (sm.snomed_code || '—') + '</span></td>' +
        '<td style="font-size:0.7rem;color:var(--text-tertiary)">' + (sm.note || '') + '</td>' +
        '</tr>';
    }

    area.innerHTML =
      '<div style="margin-bottom:var(--space-lg)">' +
      '<div class="section-header"><h4>结构化发现</h4><span style="font-size:0.72rem;color:var(--text-tertiary)">发现数: ' + sf.length + '</span></div>' +
      '<div class="card" style="padding:0;overflow-x:auto">' +
      '<table class="data-table" style="font-size:0.78rem">' +
      '<thead><tr><th>ID</th><th>解剖部位</th><th>发现</th><th>类型</th><th>严重度</th><th>否定</th><th>时序</th></tr></thead>' +
      '<tbody>' + findingsRows + '</tbody>' +
      '</table></div></div>' +

      '<div style="margin-bottom:var(--space-lg)">' +
      '<div class="section-header"><h4>术语标准化映射 (RadLex + SNOMED CT)</h4><span style="font-size:0.72rem;color:var(--text-tertiary)">映射数: ' + termMappings.length + '</span></div>' +
      '<div class="card" style="padding:0;overflow-x:auto">' +
      '<table class="data-table" style="font-size:0.75rem">' +
      '<thead><tr><th>原始术语</th><th>RadLex (RID)</th><th>SNOMED CT</th><th>置信度</th><th>来源</th></tr></thead>' +
      '<tbody>' + termRows + '</tbody>' +
      '</table></div></div>' +

      '<div style="margin-bottom:var(--space-lg)">' +
      '<div class="section-header"><h4>元数据语义映射</h4><span style="font-size:0.72rem;color:var(--text-tertiary)">Agent1 格式标准化 &rarr; Agent3 语义标准化</span></div>' +
      '<div class="card" style="padding:0;overflow-x:auto">' +
      '<table class="data-table" style="font-size:0.78rem">' +
      '<thead><tr><th>字段</th><th>Agent1 格式值</th><th>Agent3 语义值</th><th>LOINC</th><th>SNOMED</th><th>备注</th></tr></thead>' +
      '<tbody>' + semRows + '</tbody>' +
      '</table></div></div>';
  });
}

// === Quality Radar Chart ===

function renderQualityRadar() {
  var dom = document.getElementById('chart-radar');
  if (!dom || typeof echarts === 'undefined') return;
  var chart = echarts.init(dom);

  var patientIds = Object.keys(_outputData.assessments);
  var dimKeys = ['completeness', 'consistency', 'accuracy', 'usability'];
  var dimNames = ['完整性', '一致性', '准确性', '可用性'];

  // Aggregate + per-patient series
  var allSeries = [];
  var avgScores = [0, 0, 0, 0];
  var colors = ['#002FA7', '#3B6FD4', '#5B8FEF', '#2D5A27', '#B8860B', '#8B1A1A'];

  for (var p = 0; p < patientIds.length; p++) {
    var a = _outputData.assessments[patientIds[p]] || {};
    var dims = a.four_dimensions || {};
    var scores = dimKeys.map(function(dk) { return (dims[dk] || {}).score || 0; });
    for (var d = 0; d < 4; d++) avgScores[d] += scores[d];
    allSeries.push({
      name: patientIds[p],
      type: 'radar',
      data: [{ value: scores, name: patientIds[p] }],
      lineStyle: { width: 1, color: colors[p % colors.length], type: 'dashed' },
      itemStyle: { color: colors[p % colors.length] },
      symbol: 'circle', symbolSize: 4,
      areaStyle: { opacity: 0 },
    });
  }

  for (var d = 0; d < 4; d++) avgScores[d] = +(avgScores[d] / patientIds.length).toFixed(1);

  allSeries.unshift({
    name: '平均评分',
    type: 'radar',
    data: [{ value: avgScores, name: '平均' }],
    lineStyle: { color: '#002FA7', width: 3 },
    itemStyle: { color: '#002FA7' },
    symbol: 'circle', symbolSize: 8,
    areaStyle: { color: 'rgba(0,47,167,0.12)' },
  });

  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 10 } },
    radar: {
      center: ['50%', '45%'],
      radius: '65%',
      indicator: dimNames.map(function(l) { return { name: l, max: 100 }; }),
    },
    series: allSeries,
  });

  window.addEventListener('resize', function() { chart.resize(); });
}

// === Kernel Mapping Table ===

function loadKernelTable() {
  var el = document.getElementById('kernel-table');
  if (!el) return;

  API.getDemoData('kernel_mapping').then(function(data) {
    if (!data || !data.mappings) return;
    var cross = data.cross_vendor_equivalents || {};
    var rows = '';
    for (var i = 0; i < data.mappings.length; i++) {
      var m = data.mappings[i];
      var eq = cross[m.original] || {};
      rows += '<tr>' +
        '<td><strong>' + m.original + '</strong></td>' +
        '<td><span class="mono">' + m.standard_code + '</span></td>' +
        '<td>' + m.kernel_family + '</td>' +
        '<td>' + m.sharpness_level + '</td>' +
        '<td>' + m.body_region + '</td>' +
        '<td>' + m.clinical_use + '</td>' +
        '<td><span class="standard-badge nifti" style="font-size:0.6rem">' + (eq.GE || '—') + '</span></td>' +
        '<td><span class="standard-badge nifti" style="font-size:0.6rem">' + (eq.Philips || '—') + '</span></td>' +
        '<td><span class="standard-badge nifti" style="font-size:0.6rem">' + (eq.Canon || '—') + '</span></td>' +
        '</tr>';
    }
    el.innerHTML =
      '<table class="cross-ref-table">' +
      '<thead><tr><th>原始编码</th><th>标准编码</th><th>核家族</th><th>锐利度</th><th>适用部位</th><th>临床用途</th><th>GE</th><th>Philips</th><th>Canon</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p style="padding:12px 16px;font-size:0.68rem;color:var(--text-tertiary)">' + (data.note || '') + '</p>';
  });
}

// Trigger kernel table after render
setTimeout(function() { loadKernelTable(); }, 200);
