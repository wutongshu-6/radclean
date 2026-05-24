async function renderDashboard() {
  var page = document.getElementById('page-dashboard');
  if (!page) return;

  // Check if pipeline has been run — show empty state if not
  if (!App.state.pipelineResults) {
    page.innerHTML =
      '<div class="container">' +
      '<div class="section-header"><h2>数据治理仪表盘</h2></div>' +
      '<div class="empty-state" style="text-align:center;padding:80px 20px">' +
      '<div style="font-size:3rem;margin-bottom:16px;color:var(--text-tertiary)">--</div>' +
      '<h3 style="color:var(--text-secondary);margin-bottom:8px">尚未执行数据治理流程</h3>' +
      '<p style="color:var(--text-tertiary);font-size:0.9rem;margin-bottom:24px">仪表盘展示的是管线处理后的数据结果，请先在工作台执行治理流程</p>' +
      '<button class="btn btn-primary" data-nav="workspace">前往工作台</button>' +
      '</div>' +
      '</div>';
    return;
  }

  var pr = App.state.pipelineResults;
  var modeText = (pr._cleaning_mode === 'dicom') ? 'DICOM 兼容' : '分析';
  var modeStyle = (pr._cleaning_mode === 'dicom') ? 'background:#EEF2FB;color:var(--accent)' : 'background:#F0F4E8;color:#2D5A27';

  page.innerHTML =
    '<div class="container">' +
    '<div class="section-header"><h2>数据治理仪表盘</h2><span style="display:inline-block;padding:2px 12px;border-radius:3px;font-size:0.75rem;font-weight:600;margin-left:12px;' + modeStyle + '">' + modeText + ' 模式</span></div>' +
    '<div class="kpi-grid" id="dash-kpis"></div>' +
    '<div id="dash-ai-summary" style="margin-top:20px;padding:20px 24px;background:var(--bg-card);border:1px solid var(--accent);border-left:4px solid var(--accent);border-radius:4px;display:none">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">' +
    '<span style="font-size:0.78rem;font-weight:600;color:var(--accent);letter-spacing:0.04em;text-transform:uppercase">AI 治理总结</span>' +
    '<span style="font-size:0.65rem;color:var(--text-tertiary);background:var(--bg-primary);padding:2px 8px;border-radius:3px">LLM 增强</span>' +
    '</div>' +
    '<div id="dash-ai-summary-text" style="font-size:0.88rem;line-height:1.9;color:var(--text-secondary)"></div>' +
    '</div>' +
    '<div id="dash-semantic" style="margin-top:20px;padding:20px 24px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;display:none">' +
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">' +
    '<span style="font-size:0.78rem;font-weight:600;color:var(--text-primary);letter-spacing:0.04em">AI 语义质量抽查</span>' +
    '<span style="font-size:0.65rem;color:var(--text-tertiary);background:var(--bg-primary);padding:2px 8px;border-radius:3px">LLM 增强</span>' +
    '</div>' +
    '<div id="dash-semantic-text" style="font-size:0.85rem;line-height:1.8;color:var(--text-secondary)"></div>' +
    '</div>' +
    '<div class="charts-grid" style="margin-top:24px">' +
    '<div class="chart-box"><h3>质量维度评估</h3><div class="chart-container" id="chart-radar"></div>' +
    '<p style="font-size:0.68rem;color:var(--text-tertiary);line-height:1.7;margin-top:8px;padding-top:8px;border-top:1px solid var(--rule)">' +
    '完整性: 5 个核心字段缺失率 &le; 15% · 准确性: 年龄/斜率异常检测 · 一致性: DICOM 与报告交叉核对 · 可用性: 有效信息病例占比 · 综合 = 四项均值 &ge; 0.80' +
    '</p></div>' +
    '<div class="chart-box"><h3>疾病检出概览</h3><div class="chart-container" id="chart-disease"></div></div>' +
    '<div class="chart-box"><h3>解剖部位提及频次</h3><div class="chart-container tall" id="chart-anatomy"></div></div>' +
    '<div class="chart-box"><h3>分类标签分布</h3><div class="chart-container tall" id="chart-heatmap"></div></div>' +
    '</div>' +
    '<div class="section" style="margin-top:32px">' +
    '<div class="section-header"><h3>元数据清洗前后对比</h3></div>' +
    '<div style="overflow-x:auto" id="dash-meta-table"></div>' +
    '</div>' +
    '<div class="section" style="margin-top:32px">' +
    '<div class="section-header"><h3>病例结构化详情</h3></div>' +
    '<div style="overflow-x:auto" id="dash-detail-table"></div>' +
    '</div>' +
    '</div>';

  // Event delegation for expandable detail rows
  page.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== page) {
      if (el.classList && el.classList.contains('expand-row')) {
        var acc = el.getAttribute('data-expand');
        if (acc) {
          e.preventDefault();
          toggleDetailRow(el, acc);
          return;
        }
      }
      el = el.parentElement;
    }
  });

  try {
    if (typeof echarts === 'undefined') {
      throw new Error('ECharts 图表库加载失败，请检查网络连接后刷新页面');
    }
    var pr = App.state.pipelineResults;
    var meta = pr.cleaned_metadata || [];
    var annotations = pr.annotations || {};
    var classifications = pr.classifications || {};
    var quality = pr.quality_report || {};
    var overview = {
      total_cases: Object.keys(classifications).length,
      total_records: meta.length,
      overall_score: quality.overall_score || 0,
      overall_pass: quality.overall_pass || false,
    };

    renderKPIs(overview);
    loadGovernanceSummary();
    loadSemanticVerification();
    renderRadarChart(quality);
    renderDiseaseChart(classifications);
    renderAnatomyChart(annotations);
    renderHeatmapChart(classifications);
    renderMetaTable(meta);
    renderDetailTable(annotations, classifications);
  } catch (e) {
    console.error('Dashboard load failed:', e);
    var kpiEl = document.getElementById('dash-kpis');
    if (kpiEl) kpiEl.innerHTML = '<div class="no-data">' + (e.message || '数据加载失败') + '</div>';
  }
}

function renderKPIs(overview) {
  var el = document.getElementById('dash-kpis');
  el.innerHTML =
    '<div class="kpi-card animate-in stagger-1">' +
    '<div class="data-label">病例数</div>' +
    '<div class="data-value">' + overview.total_cases + '</div>' +
    '</div>' +
    '<div class="kpi-card animate-in stagger-2">' +
    '<div class="data-label">影像记录数</div>' +
    '<div class="data-value">' + overview.total_records + '</div>' +
    '</div>' +
    '<div class="kpi-card animate-in stagger-3">' +
    '<div class="data-label">综合质量评分</div>' +
    '<div class="data-value">' + overview.overall_score.toFixed(3) + '</div>' +
    '</div>' +
    '<div class="kpi-card ' + (overview.overall_pass ? 'pass' : 'fail') + ' animate-in stagger-4">' +
    '<div class="data-label">质量总评</div>' +
    '<div class="data-value">' + (overview.overall_pass ? 'PASS' : 'FAIL') + '</div>' +
    '</div>';
}

function renderRadarChart(quality) {
  var dom = document.getElementById('chart-radar');
  if (!dom) return;
  var chart = echarts.init(dom);
  var dims = ['completeness', 'accuracy', 'consistency', 'usability'];
  var labels = ['完整性', '准确性', '一致性', '可用性'];
  var scores = dims.map(function(d) { return quality[d] ? quality[d].score : 0; });
  var thresholds = dims.map(function(d) { return quality[d] ? quality[d].threshold : 0; });

  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { data: ['实际评分', '阈值'], bottom: 0, textStyle: { fontSize: 12 } },
    radar: {
      center: ['50%', '48%'],
      radius: '65%',
      indicator: labels.map(function(l) { return { name: l, max: 1 }; }),
    },
    series: [
      {
        type: 'radar',
        data: [
          { value: scores, name: '实际评分', areaStyle: { color: 'rgba(0,47,167,0.15)' }, lineStyle: { color: '#002FA7', width: 2 }, itemStyle: { color: '#002FA7' }, symbol: 'circle', symbolSize: 6 },
          { value: thresholds, name: '阈值', lineStyle: { color: '#9E9E9E', width: 1, type: 'dashed' }, itemStyle: { color: '#9E9E9E' }, symbol: 'none', areaStyle: { opacity: 0 } },
        ],
      },
    ],
  });

  window.addEventListener('resize', function() { chart.resize(); });
}

function renderDiseaseChart(classifications) {
  var dom = document.getElementById('chart-disease');
  if (!dom) return;
  var chart = echarts.init(dom);

  var accs = Object.keys(classifications).slice(0, 5);
  var seriesMap = {};

  for (var i = 0; i < accs.length; i++) {
    var acc = accs[i];
    var labels = classifications[acc]._positive_labels || [];
    for (var j = 0; j < labels.length; j++) {
      var l = labels[j];
      if (!seriesMap[l]) seriesMap[l] = new Array(accs.length).fill(0);
      seriesMap[l][i] += 1;
    }
  }

  var labelList = Object.keys(seriesMap);
  var colors = ['#002FA7','#3B6FD4','#5B8FEF','#7BA8FF','#9BC1FF','#A0C4E8','#86A6C8','#6D8FA8','#557888','#3D6068','#2D5A27','#4A7A44','#689A61','#87BA7E','#A5DA9B','#8B1A1A','#A84040','#C56666','#E28C8C','#FFB2B2','#9E9E9E'];

  var series = labelList.map(function(l, i) {
    return {
      name: l,
      type: 'bar',
      stack: 'total',
      data: seriesMap[l],
      itemStyle: { color: colors[i % colors.length] },
      emphasis: { focus: 'series' },
    };
  });

  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 10 }, data: labelList },
    xAxis: { type: 'category', data: accs.map(function(a) { return a.slice(-6); }), axisLabel: { fontSize: 11, fontFamily: 'JetBrains Mono' } },
    yAxis: { type: 'value', name: '检出数', nameTextStyle: { fontSize: 11 } },
    series: series,
  });

  window.addEventListener('resize', function() { chart.resize(); });
}

function renderAnatomyChart(annotations) {
  var dom = document.getElementById('chart-anatomy');
  if (!dom) return;
  var chart = echarts.init(dom);

  var counts = {};
  var annValues = Object.values(annotations);
  for (var i = 0; i < annValues.length; i++) {
    var sites = annValues[i].anatomy_mentioned || [];
    for (var j = 0; j < sites.length; j++) {
      var site = sites[j];
      counts[site] = (counts[site] || 0) + 1;
    }
  }
  var sorted = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 15);

  chart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 200, right: 40, top: 10, bottom: 10, containLabel: true },
    xAxis: { type: 'value', name: '提及次数' },
    yAxis: { type: 'category', data: sorted.map(function(s) { return s[0]; }).reverse(), axisLabel: { fontSize: 11, width: 180, overflow: 'truncate' }, inverse: true },
    series: [{
      type: 'bar',
      data: sorted.map(function(s) { return s[1]; }).reverse(),
      itemStyle: { color: '#002FA7' },
      barMaxWidth: 20,
    }],
  });

  window.addEventListener('resize', function() { chart.resize(); });
}

function renderHeatmapChart(classifications) {
  var dom = document.getElementById('chart-heatmap');
  if (!dom) return;
  var chart = echarts.init(dom);

  var accs = Object.keys(classifications).slice(0, 5);
  var labelSet = {};
  for (var i = 0; i < accs.length; i++) {
    var labels = classifications[accs[i]]._positive_labels || [];
    for (var j = 0; j < labels.length; j++) {
      labelSet[labels[j]] = true;
    }
  }
  var allLabels = Object.keys(labelSet);

  var data = [];
  for (var i = 0; i < allLabels.length; i++) {
    for (var j = 0; j < accs.length; j++) {
      var conf = (classifications[accs[j]] && classifications[accs[j]][allLabels[i]] ? classifications[accs[j]][allLabels[i]].confidence : 0) || 0;
      data.push([j, i, conf]);
    }
  }

  chart.setOption({
    tooltip: {
      position: 'top',
      formatter: function(p) { return accs[p.value[0]].slice(-6) + ' · ' + allLabels[p.value[1]] + '<br/>置信度: ' + p.value[2].toFixed(2); },
    },
    grid: { left: 160, right: 30, top: 10, bottom: 30 },
    xAxis: { type: 'category', data: accs.map(function(a) { return a.slice(-6); }), axisLabel: { fontSize: 11, fontFamily: 'JetBrains Mono' }, position: 'bottom' },
    yAxis: { type: 'category', data: allLabels, axisLabel: { fontSize: 10 } },
    visualMap: { min: 0, max: 1, calculable: true, orient: 'vertical', right: 0, top: 'center', inRange: { color: ['#FAFAFA', '#9BC1FF', '#002FA7'] } },
    series: [{
      type: 'heatmap',
      data: data,
      label: { show: true, fontSize: 10, formatter: function(p) { return p.value[2] > 0 ? p.value[2].toFixed(1) : ''; } },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
    }],
  });

  window.addEventListener('resize', function() { chart.resize(); });
}

function renderMetaTable(meta) {
  var seen = {};
  var rows = '';
  for (var i = 0; i < meta.length; i++) {
    var rec = meta[i];
    var acc = rec._accession_no || '';
    if (!acc || seen[acc]) continue;
    seen[acc] = true;
    rows += '<tr>' +
      '<td>' + acc + '</td>' +
      '<td class="cell-changed">' + (rec.PatientAge || '-') + '</td><td>' + (rec.PatientAgeClean != null ? rec.PatientAgeClean : '-') + '</td>' +
      '<td class="cell-changed">' + (rec.PatientSex || '-') + '</td><td>' + (rec.PatientSexClean != null ? rec.PatientSexClean : '-') + '</td>' +
      '<td class="cell-changed">' + (rec.RescaleIntercept || '-') + '</td><td>' + (rec.RescaleInterceptClean != null ? rec.RescaleInterceptClean : '-') + '</td>' +
      '<td class="cell-changed">' + (rec.RescaleSlope || '-') + '</td><td>' + (rec.RescaleSlopeClean != null ? rec.RescaleSlopeClean : '-') + '</td>' +
      '</tr>';
  }
  document.getElementById('dash-meta-table').innerHTML =
    '<table class="compare-table">' +
    '<thead><tr><th>检查号</th><th>年龄(前)</th><th>年龄(后)</th><th>性别(前)</th><th>性别(后)</th><th>截距(前)</th><th>截距(后)</th><th>斜率(前)</th><th>斜率(后)</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>';
}

function renderDetailTable(annotations, classifications) {
  var accs = Object.keys(classifications).sort();
  var rows = '';
  for (var i = 0; i < accs.length; i++) {
    var acc = accs[i];
    var ann = annotations[acc] || {};
    var cls = classifications[acc] || {};
    rows += '<tr class="expand-row" data-expand="' + acc + '" style="cursor:pointer">' +
      '<td>' + acc + '</td>' +
      '<td>' + (ann.age != null ? ann.age : '-') + '</td>' +
      '<td>' + (ann.sex != null ? ann.sex : '-') + '</td>' +
      '<td>' + (cls._primary_diagnosis || '-') + '</td>' +
      '<td>' + ((cls._positive_labels || []).join(', ') || '-') + '</td>' +
      '<td>' + (ann.anatomy_mentioned || []).length + '</td>' +
      '<td>' + (ann.modifiers_mentioned || []).length + '</td>' +
      '</tr>' +
      '<tr class="detail-row" id="detail-' + acc + '" style="display:none"><td colspan="7"></td></tr>';
  }
  document.getElementById('dash-detail-table').innerHTML =
    '<table class="data-table">' +
    '<thead><tr><th>检查号</th><th>年龄</th><th>性别</th><th>主要诊断</th><th>阳性标签</th><th>解剖部位数</th><th>修饰词数</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '</table>';
}

function toggleDetailRow(tr, acc) {
  var detailRow = document.getElementById('detail-' + acc);
  if (!detailRow) return;
  if (detailRow.style.display === 'none') {
    Promise.resolve(App.state.pipelineResults.annotations || {}).then(function(data) {
      var ann = data[acc] || {};
      var diseases = Object.keys(ann.diseases || {});
      var negated = ann.negated_findings || [];
      var diseaseTags = '';
      for (var i = 0; i < diseases.length; i++) {
        var d = diseases[i];
        diseaseTags += '<span class="entity-tag disease">' + d + ' (' + ann.diseases[d].length + ')</span>';
      }
      var negatedTags = '';
      for (var j = 0; j < negated.length; j++) {
        negatedTags += '<span class="entity-tag negated">' + negated[j].disease + '</span>';
      }
      var anatomyTags = '';
      var am = ann.anatomy_mentioned || [];
      for (var k = 0; k < am.length; k++) {
        anatomyTags += '<span class="entity-tag anatomy">' + am[k] + '</span>';
      }
      var modTags = '';
      var mm = ann.modifiers_mentioned || [];
      for (var m = 0; m < mm.length; m++) {
        modTags += '<span class="entity-tag">' + mm[m] + '</span>';
      }
      var rawTextHtml = '';
      if (ann.raw_text) {
        rawTextHtml = '<div style="grid-column:1/-1"><strong>原始文本:</strong><div style="font-size:0.85rem;line-height:1.8;color:var(--text-secondary);max-height:150px;overflow-y:auto;padding:8px;background:var(--bg-primary);border:1px solid var(--border);margin-top:4px">' + ann.raw_text.slice(0, 1000) + '</div></div>';
      }
      detailRow.children[0].innerHTML =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
        '<div><strong>检出疾病:</strong><div class="entity-tags">' + (diseaseTags || '无') + '</div></div>' +
        '<div><strong>否定发现:</strong><div class="entity-tags">' + (negatedTags || '无') + '</div></div>' +
        '<div><strong>解剖部位:</strong><div class="entity-tags">' + (anatomyTags || '无') + '</div></div>' +
        '<div><strong>修饰词:</strong><div class="entity-tags">' + (modTags || '无') + '</div></div>' +
        rawTextHtml +
        '</div>';
    });
    detailRow.style.display = '';
  } else {
    detailRow.style.display = 'none';
  }
}

function loadSemanticVerification() {
  var box = document.getElementById('dash-semantic');
  var textEl = document.getElementById('dash-semantic-text');
  if (!box || !textEl) return;

  API.getDemoData('semantic_verification').then(function(data) {
    if (!data || Object.keys(data).length === 0) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    var qualityMap = { good: '良好 ✓', fair: '一般 ~', poor: '较差 ✗' };
    var colorMap = { good: 'var(--success)', fair: '#B8860B', poor: 'var(--fail)' };
    var html = '';
    var accs = Object.keys(data);
    for (var i = 0; i < accs.length; i++) {
      var acc = accs[i];
      var v = data[acc];
      var q = v.overall_quality || 'unknown';
      html += '<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--rule)">' +
        '<strong style="font-family:var(--font-mono);font-size:0.82rem">' + acc + '</strong>' +
        '<span style="display:inline-block;margin-left:10px;padding:1px 10px;border-radius:3px;font-size:0.72rem;font-weight:600;color:' + (colorMap[q] || 'var(--text-tertiary)') + ';background:' + (q === 'good' ? '#EDF5EC' : q === 'poor' ? '#FDEDED' : '#FDF8ED') + '">' + (qualityMap[q] || q) + '</span>' +
        '<span style="font-size:0.72rem;color:var(--text-tertiary);margin-left:8px">置信度 ' + (v.confidence != null ? (v.confidence * 100).toFixed(0) + '%' : '-') + '</span>' +
        '<div style="margin-top:6px;font-size:0.8rem;line-height:1.7">' + (v.brief_note || '') + '</div>';
      if (v.false_positives && v.false_positives.length > 0) {
        html += '<div style="margin-top:4px"><span style="color:var(--fail);font-size:0.7rem">假阳性: </span><span style="font-size:0.75rem">' + v.false_positives.slice(0,3).join(', ') + '</span></div>';
      }
      if (v.false_negatives && v.false_negatives.length > 0) {
        html += '<div style="margin-top:2px"><span style="color:#B8860B;font-size:0.7rem">遗漏: </span><span style="font-size:0.75rem">' + v.false_negatives.slice(0,3).join(', ') + '</span></div>';
      }
      html += '</div>';
    }
    textEl.innerHTML = html;
  }).catch(function() {
    box.style.display = 'none';
  });
}

function loadGovernanceSummary() {
  var box = document.getElementById('dash-ai-summary');
  var textEl = document.getElementById('dash-ai-summary-text');
  if (!box || !textEl) return;

  API.getDemoData('governance_summary').then(function(data) {
    var text = (data && data.text) ? data.text : '';
    if (!text) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    // Convert markdown-like formatting to HTML
    var html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p style="margin-top:8px">')
      .replace(/\n- /g, '\n<span class="entity-tag" style="font-size:0.75rem;margin-right:4px">&bull;</span> ')
      .replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    textEl.innerHTML = html;
  }).catch(function() {
    box.style.display = 'none';
  });
}
