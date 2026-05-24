var wbState = {
  dataSource: 'demo',
  cleaningMode: 'analysis',
  stageStatus: { agent1: 'idle', agent2: 'idle', agent3: 'idle' },
  results: null,
};

function renderWorkbench() {
  var page = document.getElementById('page-workspace');
  if (!page) return;

  // Auto-start demo if navigated from home "查看结果"
  if (App.state.autoDemo) {
    App.state.autoDemo = false;
    wbState.results = {};
    setTimeout(function() { runPipeline('all'); }, 400);
  }

  // Strategy popover HTML (shared, rendered once)
  var strategyPopoverHTML =
    '<div class="strategy-popover" id="strategy-popover">' +
    '<div id="strategy-desc-analysis">' +
    '<div style="font-weight:600;margin-bottom:8px;color:var(--accent);font-size:0.82rem">分析模式 &mdash; 面向数据科学</div>' +
    '<div class="strategy-fields">' +
    '<div class="sf-row"><span class="sf-label">年龄</span><span class="vr-tag">AS</span> <code>077Y</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">77</code></div>' +
    '<div class="sf-row"><span class="sf-label">性别</span><span class="vr-tag">CS</span> <code>M</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">Male</code></div>' +
    '<div class="sf-row"><span class="sf-label">截距</span><span class="vr-tag">DS</span> <code>&quot;-8192&quot;</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">-8192.0</code></div>' +
    '<div class="sf-row"><span class="sf-label">斜率</span><span class="vr-tag">DS</span> <code>&quot;1&quot;</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">1.0</code></div>' +
    '<div class="sf-row"><span class="sf-label">厂商</span><span class="vr-tag">LO</span> <code>siemens</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">Siemens</code></div>' +
    '</div>' +
    '<div class="strategy-refs">' +
    '<div class="ref-title">DICOM 标准依据</div>' +
    '<div><span class="vr-tag">AS</span> Age String &mdash; PS3.5 §6.2, nnnX 固定3位+单位(Y/M/W/D)</div>' +
    '<div><span class="vr-tag">CS</span> Code String &mdash; PS3.3 §C.7.1.1, 枚举值 M/F/O</div>' +
    '<div><span class="vr-tag">DS</span> Decimal String &mdash; PS3.5 §6.2, 浮点数字符串</div>' +
    '<div><span class="vr-tag">LO</span> Long String &mdash; PS3.5 §6.2, 最长64字符</div>' +
    '</div>' +
    '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:0.68rem;color:var(--text-tertiary)">' +
    '适用场景: 统计分析 · ML 特征工程 · 通用数据仓库' +
    '</div></div>' +
    '<div id="strategy-desc-dicom" style="display:none">' +
    '<div style="font-weight:600;margin-bottom:8px;color:var(--accent);font-size:0.82rem">DICOM 兼容 &mdash; 面向医学系统</div>' +
    '<div class="strategy-fields">' +
    '<div class="sf-row"><span class="sf-label">年龄</span><span class="vr-tag">AS</span> <code>77</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">077Y</code></div>' +
    '<div class="sf-row"><span class="sf-label">性别</span><span class="vr-tag">CS</span> <code>Male</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">M</code></div>' +
    '<div class="sf-row"><span class="sf-label">截距</span><span class="vr-tag">DS</span> <code>&quot;-8192&quot;</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">-8192.0</code></div>' +
    '<div class="sf-row"><span class="sf-label">斜率</span><span class="vr-tag">DS</span> <code>&quot;1&quot;</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">1.0</code></div>' +
    '<div class="sf-row"><span class="sf-label">厂商</span><span class="vr-tag">LO</span> <code>siemens</code> <span class="sf-arrow">&rarr;</span> <code class="sf-result">Siemens</code></div>' +
    '</div>' +
    '<div class="strategy-refs">' +
    '<div class="ref-title">DICOM 标准依据</div>' +
    '<div><span class="vr-tag">AS</span> Age String &mdash; PS3.5 §6.2, nnnX 固定3位+单位(Y/M/W/D)</div>' +
    '<div><span class="vr-tag">CS</span> Code String &mdash; PS3.3 §C.7.1.1, 枚举值 M/F/O</div>' +
    '<div><span class="vr-tag">DS</span> Decimal String &mdash; PS3.5 §6.2, 浮点数字符串</div>' +
    '<div><span class="vr-tag">LO</span> Long String &mdash; PS3.5 §6.2, 最长64字符</div>' +
    '</div>' +
    '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:0.68rem;color:var(--text-tertiary)">' +
    '适用场景: PACS/DICOM 网络传输 · HIS/RIS 集成 · 临床试验数据交换' +
    '</div></div>' +
    '</div>';

  // Helper to generate a stage column
  function _stageCol(num, title, subtitle, icon, agentKey, colorHex) {
    return '<div class="stage-column stage-' + agentKey + '" id="stage-' + agentKey + '">' +
      '<div class="stage-column-header">' +
      '<div class="stage-header-top">' +
      '<span class="stage-num" style="color:' + colorHex + '">' + num + '</span>' +
      '<h3>' + title + '</h3>' +
      '<span class="header-actions" id="header-actions-' + agentKey + '"></span>' +
      '<span class="stage-status" id="status-' + agentKey + '">等待中</span>' +
      '</div>' +
      '<div class="stage-subtitle">' + subtitle + '</div>' +
      '</div>' +
      '<div class="stage-column-body" id="body-' + agentKey + '">' +
      '<div style="display:flex;align-items:flex-start;gap:14px;padding:8px 0">' +
      '<div style="width:40px;height:40px;border-radius:50%;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">' + icon + '</div>' +
      '<div><p style="font-size:0.85rem;color:var(--text-secondary);margin:0">等待执行</p><p style="font-size:0.75rem;color:var(--text-tertiary);margin:4px 0 0">' + subtitle + '</p></div>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  page.innerHTML =
    strategyPopoverHTML +
    '<div class="workbench-toolbar" id="workbench-toolbar">' +
    '<div class="toolbar-main">' +
    '<div class="toolbar-left">' +
    '<div class="toolbar-group">' +
    '<span class="toolbar-label">数据源</span>' +
    '<div class="radio-pills" id="wb-source">' +
    '<span class="pill active" data-src="demo">演示</span>' +
    '<span class="pill" data-src="upload">上传</span>' +
    '</div>' +
    '</div>' +
    '<div class="toolbar-group">' +
    '<span class="toolbar-label">策略</span>' +
    '<div class="radio-pills" id="wb-cleaning-mode">' +
    '<span class="pill active" data-mode="analysis">分析</span>' +
    '<span class="pill" data-mode="dicom">DICOM</span>' +
    '</div>' +
    '<i class="info-icon" id="strategy-info-btn" title="查看策略详情">&#9432;</i>' +
    '</div>' +
    '<button class="btn btn-accent" data-action="run-pipeline" data-agent="all" style="font-weight:600;letter-spacing:0.04em;white-space:nowrap;padding:9px 22px;font-size:0.88rem">开始治理 &rarr;</button>' +
    '<div class="toolbar-upload" id="wb-upload">' +
    '<div class="upload-zone" id="upload-zone" data-action="open-file" style="padding:5px 12px;font-size:0.72rem">选择文件</div>' +
    '<input type="file" id="file-input" multiple accept=".zip,.json,.xlsx,.txt,.csv,.nii.gz,.dcm" style="display:none">' +
    '<span class="toolbar-file-list" id="file-list"></span>' +
    '</div>' +
    '</div>' +
    '<div class="toolbar-right">' +
    '<div class="toolbar-status-dots" id="toolbar-status">' +
    '<div class="toolbar-status-item"><span class="toolbar-status-dot" id="toolbar-status-1"></span><span>净化</span></div>' +
    '<div class="toolbar-status-item"><span class="toolbar-status-dot" id="toolbar-status-2"></span><span>结构化</span></div>' +
    '<div class="toolbar-status-item"><span class="toolbar-status-dot" id="toolbar-status-3"></span><span>验证</span></div>' +
    '</div>' +
    '<div id="toolbar-export" style="display:none;align-items:center;gap:6px">' +
    '<button class="btn btn-outline btn-sm" data-action="export-zip" style="white-space:nowrap;font-weight:600">导出 ZIP</button>' +
    '<button class="btn btn-accent btn-sm" data-action="goto-dashboard" style="white-space:nowrap;font-weight:600">仪表盘 &rarr;</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="toolbar-sub">' +
    '<div id="wb-source-hint" style="font-size:0.65rem;color:var(--text-tertiary)">治理结果即时呈现，可切换至上传模式处理自有数据</div>' +
    '</div>' +
    '</div>' +
    '<div class="workbench-stages">' +
    _stageCol(1, '数据净化', 'DICOM 元数据清洗 — 文件层去残留 + 字段层格式标准化 (5 字段)', '&#128202;', 'agent1', 'var(--accent)') +
    _stageCol(2, '报告结构化', '非结构化报告 → 结构化标注 · 规则引擎 + LLM 增强', '&#128270;', 'agent2', '#B8860B') +
    _stageCol(3, '治理验证', '多维评估 — 完整性 · 准确性 · 一致性 · 可用性 + 术语标准化', '&#9989;', 'agent3', 'var(--success)') +
    '</div>';

  var fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', function(event) {
      var files = event.target.files;
      wbState._files = [];
      for (var i = 0; i < files.length; i++) {
        wbState._files.push(files[i]);
      }
      var fl = document.getElementById('file-list');
      if (fl) fl.textContent = wbState._files.length + ' 个文件已选择';
    });
  }

  // Strategy info icon → toggle popover
  var infoBtn = document.getElementById('strategy-info-btn');
  if (infoBtn) {
    infoBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var popover = document.getElementById('strategy-popover');
      if (popover) popover.classList.toggle('visible');
    });
  }

  // Close popover on outside click
  document.addEventListener('click', function(e) {
    var popover = document.getElementById('strategy-popover');
    if (!popover || !popover.classList.contains('visible')) return;
    var infoBtn = document.getElementById('strategy-info-btn');
    if (infoBtn && infoBtn.contains(e.target)) return;
    if (!popover.contains(e.target)) popover.classList.remove('visible');
  });

  page.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== page) {
      var src = el.getAttribute('data-src');
      if (src && el.parentElement && el.parentElement.id === 'wb-source') {
        e.preventDefault();
        switchSource(src, el);
        return;
      }
      var mode = el.getAttribute('data-mode');
      if (mode && el.parentElement && el.parentElement.id === 'wb-cleaning-mode') {
        e.preventDefault();
        switchCleaningMode(mode, el);
        return;
      }
      var action = el.getAttribute('data-action');
      if (action === 'open-file') {
        e.preventDefault();
        var fi = document.getElementById('file-input');
        if (fi) fi.click();
        return;
      }
      if (action === 'run-pipeline') {
        e.preventDefault();
        var agent = el.getAttribute('data-agent');
        if (!agent) return;

        runPipeline(agent);
        return;
      }
      if (action === 'run-llm') {
        e.preventDefault();
        var anns = (wbState.results && wbState.results.annotations) || {};
        runLLMStructuringAsync(wbState.dataSource === 'demo', anns).then(function(llmResults) {
          if (llmResults && Object.keys(llmResults).length > 0) {
            wbState.results.llm_structured = llmResults;
            App.state.pipelineResults = wbState.results;
            if (wbState.results.annotations) {
              renderAgent2Comparison(wbState.results.annotations, llmResults);
            }
            var hdr2 = document.getElementById('header-actions-agent2');
            if (hdr2) {
              hdr2.innerHTML =
                '<button class="btn btn-outline btn-sm" data-action="run-llm" style="font-size:0.78rem;padding:6px 14px;font-weight:500">重新 LLM 分析</button>' +
                '<button class="btn btn-outline btn-sm" data-action="download" data-download="annotations" style="font-size:0.78rem;padding:6px 14px;font-weight:500">导出 JSON</button>';
            }
          }
        });
        return;
      }
      if (action === 'download') {
        e.preventDefault();
        var dlKey = el.getAttribute('data-download');
        if (dlKey && wbState.results && wbState.results[dlKey]) {
          downloadJSON(wbState.results[dlKey], dlKey + '.json');
        }
        return;
      }
      if (action === 'export-zip') {
        e.preventDefault();
        API.exportResults();
        return;
      }
      if (action === 'goto-dashboard') {
        e.preventDefault();
        Router.go('dashboard');
        return;
      }
      el = el.parentElement;
    }
  });

  setupDragDrop();

  // Sync state from App if wbState is empty (survives page navigation)
  if ((!wbState.results || Object.keys(wbState.results).length === 0) && App.state.pipelineResults) {
    wbState.results = App.state.pipelineResults;
    wbState.stageStatus.agent1 = 'done';
    wbState.stageStatus.agent2 = 'done';
    wbState.stageStatus.agent3 = 'done';
    wbState.dataSource = 'demo';
    if (wbState.results._cleaning_mode) {
      wbState.cleaningMode = wbState.results._cleaning_mode;
    }
  }

  // Restore previous pipeline results if returning from another page
  if (wbState.results && Object.keys(wbState.results).length > 0) {
    // Restore stage status indicators
    for (var stageKey in wbState.stageStatus) {
      if (wbState.stageStatus[stageKey] === 'done') {
        setStageStatus(stageKey, 'done');
      }
    }
    // Restore result displays
    if (wbState.results.cleaned_metadata) {
      renderAgent1Result(wbState.results.cleaned_metadata, wbState.results.image_validation);
    }
    if (wbState.results.annotations) {
      renderAgent2Result(wbState.results.annotations);
    }
    if (wbState.results.quality_report) {
      renderAgent3Result(wbState.results.quality_report);
    }
    // Show export section + dashboard link
    showDashboardLink();
    updateSourceStatus();
  }
}

function switchCleaningMode(mode, el) {
  wbState.cleaningMode = mode;
  var labels = document.querySelectorAll('#wb-cleaning-mode .pill');
  for (var i = 0; i < labels.length; i++) {
    labels[i].classList.remove('active');
  }
  if (el) el.classList.add('active');
  // Toggle description panels in popover
  var descA = document.getElementById('strategy-desc-analysis');
  var descD = document.getElementById('strategy-desc-dicom');
  if (descA) descA.style.display = mode === 'analysis' ? 'block' : 'none';
  if (descD) descD.style.display = mode === 'dicom' ? 'block' : 'none';
  // Show hint that re-run is needed when results already exist
  if (wbState.results && Object.keys(wbState.results).length > 0) {
    wbState._modeChanged = true;
    var runBtn = document.querySelector('[data-action="run-pipeline"][data-agent="all"]');
    if (runBtn) {
      runBtn.style.transition = 'box-shadow 0.2s';
      runBtn.style.boxShadow = '0 0 0 2px var(--accent)';
      setTimeout(function() { runBtn.style.boxShadow = ''; }, 2000);
    }
    var body1 = document.getElementById('body-agent1');
    if (body1) {
      var hint = document.createElement('div');
      hint.style.cssText = 'margin-bottom:12px;padding:8px 12px;background:#FEF3E0;border:1px solid #E8C87A;border-radius:4px;font-size:0.75rem;color:#8B6914';
      hint.textContent = '清洗策略已切换，当前结果为旧策略产出。请重新点击「开始治理」以应用新策略。';
      hint.id = 'mode-change-hint';
      var oldHint = document.getElementById('mode-change-hint');
      if (oldHint) oldHint.remove();
      body1.insertBefore(hint, body1.firstChild);
    }
  }
}

function switchSource(src, el) {
  wbState.dataSource = src;
  wbState._files = undefined;
  var fl = document.getElementById('file-list');
  if (fl) fl.textContent = '';
  var labels = document.querySelectorAll('#wb-source .pill');
  for (var i = 0; i < labels.length; i++) {
    labels[i].classList.remove('active');
  }
  if (el) el.classList.add('active');
  var upEl = document.getElementById('wb-upload');
  if (upEl) {
    if (src === 'upload') {
      upEl.classList.add('visible');
    } else {
      upEl.classList.remove('visible');
    }
  }
  var hintEl = document.getElementById('wb-source-hint');
  if (hintEl) {
    hintEl.textContent = src === 'upload' ? '选择文件并点击「开始治理」' : '治理结果即时呈现，可切换至上传模式处理自有数据';
  }
}

function setupDragDrop() {
  var zone = document.getElementById('upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
  zone.addEventListener('dragleave', function() { zone.style.borderColor = 'var(--border)'; });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--border)';
    var dt = e.dataTransfer;
    // Use dt.files for synchronous file access (works in all browsers)
    if (dt.files && dt.files.length > 0) {
      wbState._files = [];
      for (var i = 0; i < dt.files.length; i++) {
        wbState._files.push(dt.files[i]);
      }
      var fl = document.getElementById('file-list');
      if (fl) fl.textContent = wbState._files.length + ' 个文件已选择';
    }
  });
}

function agentsFor(agent) {
  return agent === 'all' ? ['agent1', 'agent2', 'agent3'] : [agent];
}

function delay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}


function setButtonsDisabled(disabled) {
  var btns = document.querySelectorAll('[data-action="run-pipeline"], [data-action="run-llm"]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].disabled = disabled;
    btns[i].style.opacity = disabled ? '0.5' : '1';
    btns[i].style.cursor = disabled ? 'not-allowed' : 'pointer';
  }
}

async function runPipeline(agent) {
  // Prevent concurrent pipeline runs
  if (wbState._running) {
    console.log('Pipeline already running, ignoring request');
    return;
  }
  wbState._running = true;
  setButtonsDisabled(true);

  var stages = agentsFor(agent);

  // Reset only the selected stages to idle
  for (var i = 0; i < stages.length; i++) {
    wbState.stageStatus[stages[i]] = 'idle';
    setStageStatus(stages[i], 'idle');
    var ha = document.getElementById('header-actions-' + stages[i]);
    if (ha) ha.innerHTML = '';
  }

  try {
    console.log('[runPipeline] agent=' + agent + ' dataSource=' + wbState.dataSource + ' _files=' + (wbState._files ? wbState._files.length : 'undefined') + ' cleaningMode=' + wbState.cleaningMode);

    if (wbState.dataSource === 'demo') {
      await executeDemoPipeline(agent, stages);
      return;
    }

    // Upload mode without files — gracefully fall back to demo data
    if (!wbState._files || wbState._files.length === 0) {
      console.log('[runPipeline] Upload mode but no files — falling back to demo data');
      wbState.dataSource = 'demo';
      // Update UI to reflect fallback
      var labels = document.querySelectorAll('#wb-source .pill');
      for (var i = 0; i < labels.length; i++) {
        labels[i].classList.remove('active');
        if (labels[i].getAttribute('data-src') === 'demo') labels[i].classList.add('active');
      }
      var upEl = document.getElementById('wb-upload');
      if (upEl) upEl.classList.remove('visible');
      await executeDemoPipeline(agent, stages);
      return;
    }

    console.log('[runPipeline] uploading ' + wbState._files.length + ' file(s): ' + wbState._files.map(function(f){return f.name;}).join(', '));

    if (!wbState.results) wbState.results = {};
    delete wbState.results.llm_structured;

    // Sequential stage execution — each stage runs, renders, then proceeds to next
    if (stages.indexOf('agent1') !== -1) {
      setStageStatus('agent1', 'running');
            var res1 = await API.runPipeline('agent1', wbState._files, wbState.cleaningMode, false);
      if (res1.status === 'error') throw new Error(res1.message);
      if (res1.cleaned_metadata && res1.cleaned_metadata.length > 0)
        wbState.results.cleaned_metadata = res1.cleaned_metadata;
      if (res1.image_validation)
        wbState.results.image_validation = res1.image_validation;
      setStageStatus('agent1', 'done');
            renderAgent1Result(wbState.results.cleaned_metadata, wbState.results.image_validation);
    }

    if (stages.indexOf('agent2') !== -1) {
      setStageStatus('agent2', 'running');
            var res2 = await API.runPipeline('agent2', wbState._files, wbState.cleaningMode, false);
      if (res2.status === 'error') throw new Error(res2.message);
      if (res2.annotations && Object.keys(res2.annotations).length > 0)
        wbState.results.annotations = res2.annotations;
      setStageStatus('agent2', 'done');
            renderAgent2Result(wbState.results.annotations);

      // Auto-trigger LLM streaming on uploaded annotations with real-time reasoning display
      var llmResults = await runLLMStructuringAsync(false, wbState.results.annotations);
      if (llmResults && Object.keys(llmResults).length > 0) {
        wbState.results.llm_structured = llmResults;
        if (wbState.results.annotations) {
          renderAgent2Comparison(wbState.results.annotations, llmResults);
        }
      }
    }

    if (stages.indexOf('agent3') !== -1) {
      setStageStatus('agent3', 'running');
      // Run API call and progress animation in parallel
      var res3Promise = API.runPipeline('agent3', wbState._files, wbState.cleaningMode, false);
      await showStage3Progress();
      var res3 = await res3Promise;
      if (res3.status === 'error') throw new Error(res3.message);
      if (res3.classifications && Object.keys(res3.classifications).length > 0)
        wbState.results.classifications = res3.classifications;
      if (res3.quality_report && Object.keys(res3.quality_report).length > 0)
        wbState.results.quality_report = res3.quality_report;
      // Save real-time AI-generated results
      if (res3.governance_summary)
        wbState.results.governance_summary = res3.governance_summary;
      if (res3.semantic_verification && Object.keys(res3.semantic_verification).length > 0)
        wbState.results.semantic_verification = res3.semantic_verification;
      setStageStatus('agent3', 'done');
      renderAgent3Result(wbState.results.quality_report);
      loadStage3Summary(wbState.results.governance_summary);
      loadStage3Semantic(wbState.results.semantic_verification);
    }

    wbState.results._cleaning_mode = wbState.cleaningMode;
    App.state.pipelineResults = wbState.results;
    showDashboardLink();
    updateSourceStatus();
    wbState._running = false;
    setButtonsDisabled(false);
  } catch (e) {
    for (var k = 0; k < stages.length; k++) setStageStatus(stages[k], 'error');
        console.error(e);
    alert('管线执行失败: ' + (e.message || '未知错误'));
    wbState._running = false;
    setButtonsDisabled(false);
  }
}

async function executeDemoPipeline(agent, stages) {
  if (!wbState.results) wbState.results = {};
  delete wbState.results.llm_structured;

  if (stages.indexOf('agent1') !== -1) {
    setStageStatus('agent1', 'running');
        wbState.results.cleaned_metadata = await API.getDemoData('cleaned_metadata', wbState.cleaningMode);
    try { wbState.results.image_validation = await API.getDemoData('image_validation'); } catch(e) {}
    await delay(800);
    setStageStatus('agent1', 'done');
        renderAgent1Result(wbState.results.cleaned_metadata, wbState.results.image_validation);
  }

  if (stages.indexOf('agent2') !== -1) {
    setStageStatus('agent2', 'running');
        wbState.results.annotations = await API.getDemoData('annotations', wbState.cleaningMode);
    await delay(600);
    setStageStatus('agent2', 'done');
        renderAgent2Result(wbState.results.annotations);

    // Auto-trigger LLM streaming with real-time reasoning display
    var llmResults = await runLLMStructuringAsync(true);
    if (llmResults && Object.keys(llmResults).length > 0) {
      wbState.results.llm_structured = llmResults;
      if (wbState.results.annotations) {
        renderAgent2Comparison(wbState.results.annotations, llmResults);
      }
    }
  }

  if (stages.indexOf('agent3') !== -1) {
    setStageStatus('agent3', 'running');
    // Fire fetches in parallel with progress animation
    var qPromise = API.getDemoData('quality_report', wbState.cleaningMode);
    var cPromise = API.getDemoData('classifications', wbState.cleaningMode);
    await showStage3Progress();
    var qr = await qPromise;
    var cl = await cPromise;
    wbState.results.quality_report = qr;
    wbState.results.classifications = cl;
    setStageStatus('agent3', 'done');
    renderAgent3Result(wbState.results.quality_report);
    loadStage3Summary();
    loadStage3Semantic();
  }
  wbState.results._cleaning_mode = wbState.cleaningMode;
  App.state.pipelineResults = wbState.results;
  showDashboardLink();
  updateSourceStatus();
  wbState._running = false;
  setButtonsDisabled(false);
}

function setStageStatus(stage, status) {
  wbState.stageStatus[stage] = status;
  var el = document.getElementById('status-' + stage);
  if (el) {
    var labels = { idle: '等待中', running: '运行中', done: '✓ 完成', error: '✗ 失败' };
    el.textContent = labels[status] || status;
    el.className = 'stage-status ' + status;
  }

  // Toggle stage column border class
  var card = document.getElementById('stage-' + stage);
  if (card) {
    card.classList.remove('running', 'done');
    if (status === 'running') card.classList.add('running');
    if (status === 'done') card.classList.add('done');
  }

  // Update toolbar status dots
  var sbMap = { agent1: 1, agent2: 2, agent3: 3 };
  var sbNum = sbMap[stage];
  if (sbNum) {
    var dotEl = document.getElementById('toolbar-status-' + sbNum);
    if (dotEl) {
      dotEl.className = 'toolbar-status-dot ' + (status === 'done' || status === 'running' || status === 'error' ? status : '');
    }
  }

  // Show export section when all stages done
  if (status === 'done') {
    var allDone = wbState.stageStatus.agent1 === 'done' && wbState.stageStatus.agent2 === 'done' && wbState.stageStatus.agent3 === 'done';
    if (allDone) {
      var exportEl = document.getElementById('toolbar-export');
      if (exportEl) exportEl.style.display = 'flex';
    }
  }
}

function loadStageResults(agent) {
  if (!wbState.results) return;

  var stages = agentsFor(agent);

  for (var s = 0; s < stages.length; s++) {
    var st = stages[s];
    if (st === 'agent1' && wbState.results.cleaned_metadata) {
      renderAgent1Result(wbState.results.cleaned_metadata, wbState.results.image_validation);
    }
    if (st === 'agent2' && wbState.results.annotations) {
      renderAgent2Result(wbState.results.annotations);
    }
    if (st === 'agent3' && wbState.results.quality_report) {
      renderAgent3Result(wbState.results.quality_report);
    }
  }
}

function downloadJSON(data, filename) {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderAgent1Result(meta, imgVal) {
  setStageStatus('agent1', 'done');
  document.getElementById('header-actions-agent1').innerHTML =
    '<button class="btn btn-outline btn-sm" data-action="download" data-download="cleaned_metadata" style="font-size:0.78rem;padding:6px 14px;font-weight:500">导出 JSON</button>';

  // Derive image data context from metadata
  var accSet = {};
  var manufacturers = {};
  var withImages = 0;
  for (var i = 0; i < meta.length; i++) {
    var r = meta[i];
    if (r._accession_no) accSet[r._accession_no] = true;
    if (r._source_path) withImages++;
    if (r.ManufacturerClean) manufacturers[r.ManufacturerClean] = (manufacturers[r.ManufacturerClean] || 0) + 1;
  }
  var devices = Object.keys(manufacturers);
  var deviceSummary = '';
  for (var d = 0; d < devices.length; d++) {
    deviceSummary += '<span class="entity-tag anatomy" style="font-size:0.7rem">' + devices[d] + '</span>';
  }

  // Build image validation summary section
  var imgSection = '';
  if (imgVal) {
    var dimBadge = imgVal.dimensions_consistent ? '一致' : '不一致';
    var dimColor = imgVal.dimensions_consistent ? 'var(--success)' : '#B8860B';
    var spacBadge = imgVal.voxel_spacing_consistent ? '一致' : '不一致';
    var spacColor = imgVal.voxel_spacing_consistent ? 'var(--success)' : '#B8860B';
    var orientBadge = imgVal.orientation_consistent ? '一致' : '不一致';
    var orientColor = imgVal.orientation_consistent ? 'var(--success)' : '#B8860B';

    var dimVariants = '';
    if (imgVal.dimensions_variants && imgVal.dimensions_variants.length > 0) {
      dimVariants = imgVal.dimensions_variants.map(function(d) { return d.join(' × '); }).join(', ');
    }

    imgSection =
      '<div class="img-val-section" style="margin-bottom:16px;padding:14px;background:#F8F9FA;border:1px solid var(--border);border-radius:6px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
      '<span style="font-weight:600;font-size:0.85rem;color:var(--text-primary)">影像文件校验</span>' +
      '<span style="font-size:0.7rem;color:var(--text-tertiary)">.nii.gz NIfTI 格式</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">' +
      '<div><div style="font-size:0.7rem;color:var(--text-tertiary)">文件总数</div><div style="font-weight:600;color:var(--text-primary)">' + imgVal.total_files + ' 个</div></div>' +
      '<div><div style="font-size:0.7rem;color:var(--text-tertiary)">数据总量</div><div style="font-weight:600;color:var(--text-primary)">' + imgVal.total_size_mb + ' MB</div></div>' +
      '<div><div style="font-size:0.7rem;color:var(--text-tertiary)">数据格式</div><div style="font-weight:600;color:var(--success)">uint16</div></div>' +
      '<div><div style="font-size:0.7rem;color:var(--text-tertiary)">有效文件</div><div style="font-weight:600;color:var(--success)">' + imgVal.valid_files + ' / ' + imgVal.total_files + '</div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:0.75rem">' +
      '<div><span style="color:var(--text-tertiary)">尺寸: </span><span style="color:' + dimColor + ';font-weight:600">' + dimBadge + '</span><span style="color:var(--text-tertiary);margin-left:4px">' + dimVariants + '</span></div>' +
      '<div><span style="color:var(--text-tertiary)">体素间距: </span><span style="color:' + spacColor + ';font-weight:600">' + spacBadge + '</span><span style="color:var(--text-tertiary);margin-left:4px">1.0×1.0×1.0 mm</span></div>' +
      '<div><span style="color:var(--text-tertiary)">方向: </span><span style="color:' + orientColor + ';font-weight:600">' + orientBadge + '</span><span style="color:var(--text-tertiary);margin-left:4px">' + (imgVal.orientations ? imgVal.orientations.join(', ') : '') + '</span></div>' +
      '</div>' +
      (imgVal.errors && imgVal.errors.length > 0 ? '<div style="margin-top:8px;font-size:0.7rem;color:var(--fail)">' + imgVal.errors.join('; ') + '</div>' : '') +
      '</div>';
  }

  var metaRows = '';
  var seen = {};
  var changeStats = { age: 0, sex: 0, intercept: 0, slope: 0, manufacturer: 0 };
  var totalRows = 0;
  for (var i = 0; i < meta.length; i++) {
    var rec = meta[i];
    var acc = rec._accession_no || '';
    if (!acc || seen[acc]) continue;
    seen[acc] = true;
    totalRows++;
    var ageChanged = String(rec.PatientAge) !== String(rec.PatientAgeClean);
    var sexChanged = String(rec.PatientSex) !== String(rec.PatientSexClean);
    var interChanged = String(rec.RescaleIntercept) !== String(rec.RescaleInterceptClean);
    var slopeChanged = String(rec.RescaleSlope) !== String(rec.RescaleSlopeClean);
    var manuChanged = String(rec.Manufacturer) !== String(rec.ManufacturerClean);
    if (ageChanged) changeStats.age++;
    if (sexChanged) changeStats.sex++;
    if (interChanged) changeStats.intercept++;
    if (slopeChanged) changeStats.slope++;
    if (manuChanged) changeStats.manufacturer++;
    metaRows += '<tr>' +
      '<td>' + acc + '</td>' +
      '<td class="' + (ageChanged ? 'cell-changed' : 'cell-same') + '">' + (rec.PatientAge || '-') + '</td><td class="' + (ageChanged ? 'cell-cleaned' : 'cell-same') + '">' + (rec.PatientAgeClean != null ? rec.PatientAgeClean : '-') + '</td>' +
      '<td class="' + (sexChanged ? 'cell-changed' : 'cell-same') + '">' + (rec.PatientSex || '-') + '</td><td class="' + (sexChanged ? 'cell-cleaned' : 'cell-same') + '">' + (rec.PatientSexClean != null ? rec.PatientSexClean : '-') + '</td>' +
      '<td class="' + (manuChanged ? 'cell-changed' : 'cell-same') + '">' + (rec.Manufacturer || '-') + '</td><td class="' + (manuChanged ? 'cell-cleaned' : 'cell-same') + '">' + (rec.ManufacturerClean != null ? rec.ManufacturerClean : '-') + '</td>' +
      '<td class="' + (interChanged ? 'cell-changed' : 'cell-same') + '">' + (rec.RescaleIntercept || '-') + '</td><td class="' + (interChanged ? 'cell-cleaned' : 'cell-same') + '">' + (rec.RescaleInterceptClean != null ? rec.RescaleInterceptClean : '-') + '</td>' +
      '<td class="' + (slopeChanged ? 'cell-changed' : 'cell-same') + '">' + (rec.RescaleSlope || '-') + '</td><td class="' + (slopeChanged ? 'cell-cleaned' : 'cell-same') + '">' + (rec.RescaleSlopeClean != null ? rec.RescaleSlopeClean : '-') + '</td>' +
      '</tr>';
  }
  var totalChanges = changeStats.age + changeStats.sex + changeStats.intercept + changeStats.slope + changeStats.manufacturer;
  var changeSummary = '';
  if (totalChanges > 0) {
    var parts = [];
    if (changeStats.age > 0) parts.push(changeStats.age + ' 处年龄');
    if (changeStats.sex > 0) parts.push(changeStats.sex + ' 处性别');
    if (changeStats.manufacturer > 0) parts.push(changeStats.manufacturer + ' 处厂商');
    if (changeStats.intercept > 0) parts.push(changeStats.intercept + ' 处截距');
    if (changeStats.slope > 0) parts.push(changeStats.slope + ' 处斜率');
    changeSummary = '<div style="margin-bottom:12px;padding:10px 14px;background:#EEF2FB;border:1px solid #D0DBF0;border-radius:6px;font-size:0.78rem;color:var(--accent);display:flex;align-items:center;gap:8px">' +
      '<span style="font-weight:700;font-family:var(--font-mono)">' + totalChanges + '</span> 个字段值已清洗 · ' +
      '<span style="color:var(--text-secondary)">' + parts.join(' · ') + '</span>' +
      '</div>';
  } else {
    changeSummary = '<div style="margin-bottom:12px;padding:10px 14px;background:#F8F9FA;border:1px solid var(--border);border-radius:6px;font-size:0.78rem;color:var(--text-tertiary)">所有字段值已符合标准，无需额外清洗</div>';
  }

  var modeLabel = wbState.cleaningMode === 'dicom' ? 'DICOM' : '分析';
  var modeBadge = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px"><span style="font-size:0.75rem;font-weight:600;color:var(--text-secondary)">清洗策略</span><span style="display:inline-block;padding:2px 10px;border-radius:3px;font-size:0.72rem;font-weight:600;background:' + (wbState.cleaningMode === 'dicom' ? '#EEF2FB' : '#F0F4E8') + ';color:var(--accent)">' + modeLabel + ' 模式</span></div>';

  document.getElementById('body-agent1').innerHTML =
    modeBadge + imgSection +
    '<div style="margin-bottom:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
    '<div style="display:flex;align-items:center;gap:6px">' +
    '<span style="font-size:0.75rem;font-weight:600;color:var(--text-secondary)">输入数据</span>' +
    '<span class="entity-tag anatomy" style="font-size:0.7rem">CT 影像元数据 (JSON)</span>' +
    '<span class="entity-tag anatomy" style="font-size:0.7rem">报告文本 (.xlsx/.txt)</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px">' +
    '<span style="font-size:0.75rem;font-weight:600;color:var(--text-secondary)">设备</span>' + deviceSummary +
    '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
    '<span style="font-size:0.75rem;color:var(--text-tertiary)">' + meta.length + ' 条 CT 记录 · ' + Object.keys(accSet).length + ' 个病例 · ' + withImages + ' 个影像关联</span>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
    changeSummary +
    '<table class="compare-table"><thead><tr><th>检查号</th><th>年龄(前)</th><th>年龄(后)</th><th>性别(前)</th><th>性别(后)</th><th>厂商(前)</th><th>厂商(后)</th><th>截距(前)</th><th>截距(后)</th><th>斜率(前)</th><th>斜率(后)</th></tr></thead>' +
    '<tbody>' + metaRows + '</tbody></table></div>' +
    '<div style="margin-top:10px">' +
    '<span style="font-size:0.8rem;color:var(--text-secondary)">共清洗 ' + meta.length + ' 条元数据记录</span>' +
    '</div>';
}

function renderAgent2Result(anns) {
  setStageStatus('agent2', 'done');

  var hasLLM = wbState.results && wbState.results.llm_structured;
  var actionsHtml = '<button class="btn btn-outline btn-sm" data-action="download" data-download="annotations" style="font-size:0.78rem;padding:6px 14px;font-weight:500">导出 JSON</button>';
  if (hasLLM) {
    actionsHtml = '<button class="btn btn-outline btn-sm" data-action="run-llm" style="font-size:0.78rem;padding:6px 14px;font-weight:500">重新 LLM 分析</button>' + actionsHtml;
  }
  document.getElementById('header-actions-agent2').innerHTML = actionsHtml;
  var annKeys = Object.keys(anns);
  var annSummary = '';
  for (var j = 0; j < annKeys.length && j < 5; j++) {
    var acc2 = annKeys[j];
    var ann = anns[acc2];
    var diseases = Object.keys(ann.diseases || {});
    var anatomy = ann.anatomy_mentioned || [];
    var negated = ann.negated_findings || [];
    annSummary += '<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--rule)">' +
      '<strong>' + acc2 + '</strong>' +
      '<span class="text-tertiary" style="margin-left:8px;font-size:0.8rem">年龄 ' + (ann.age || '-') + ' · ' + (ann.sex || '-') + '</span>' +
      '<div class="entity-tags">' +
      diseases.map(function(d) { return '<span class="entity-tag disease">' + d + '</span>'; }).join('') +
      anatomy.slice(0,8).map(function(a) { return '<span class="entity-tag anatomy">' + a + '</span>'; }).join('') +
      negated.map(function(n) { return '<span class="entity-tag negated" title="' + (n.context || '') + '">' + n.disease + '</span>'; }).join('') +
      '</div></div>';
  }
  document.getElementById('body-agent2').innerHTML =
    annSummary +
    '<div style="margin-top:12px"></div>' +
    '<div id="llm-results" style="margin-top:16px"></div>' +
    '<p style="margin-top:8px;font-size:0.8rem;color:var(--text-secondary)">共标注 ' + annKeys.length + ' 份报告 · 规则引擎 (21 疾病 + 50+ 部位)' + (hasLLM ? ' + LLM 13字段结构化' : '') + '</p>' +
    '<div class="tag-legend" style="margin-top:12px;padding:10px 14px;background:#F8F9FA;border-radius:6px;font-size:0.72rem;color:var(--text-tertiary);display:flex;flex-wrap:wrap;gap:10px">' +
    '<span><span class="entity-tag disease" style="font-size:0.65rem;margin-right:4px">疾病检出</span> 21 类疾病</span>' +
    '<span><span class="entity-tag anatomy" style="font-size:0.65rem;margin-right:4px">解剖部位</span> 50+ 部位</span>' +
    '<span><span class="entity-tag negated" style="font-size:0.65rem;margin-right:4px">已否定</span> 排除项</span>' +
    '<span><span class="entity-tag match" style="font-size:0.65rem;margin-right:4px">LLM 一致</span> 双重确认</span>' +
    '<span><span class="entity-tag llm-new" style="font-size:0.65rem;margin-right:4px">LLM 新增</span> 仅 LLM 发现</span>' +
    '</div>';

  // Auto-render LLM comparison when pre-computed results exist
  if (hasLLM) {
    renderAgent2Comparison(anns, wbState.results.llm_structured);
  }
}

var STAGE3_STEPS = [
  { id: 'completeness', label: '完整性校验', desc: '检查 5 个必填 DICOM 字段缺失率...', detail: 'PatientName, PatientID, StudyDate, Modality, AccessionNumber' },
  { id: 'accuracy', label: '准确性校验', desc: '检测异常值（年龄范围 / HU 斜率参数）...', detail: '年龄 0-120 / 斜率 -2000~2000 / 厂商名称映射' },
  { id: 'consistency', label: '一致性校验', desc: 'DICOM 元数据 vs 报告标注交叉核对...', detail: '性别/年龄一致性 + 标注-分类标签匹配' },
  { id: 'usability', label: '可用性评估', desc: '计算标注覆盖率与平均置信度...', detail: '疾病标注密度 + 术语置信度 + 否定检测' },
  { id: 'terminology', label: '术语标准化', desc: '模糊匹配 RadLex 标准术语库...', detail: '71 条标准术语 · 中英双语 · 变体归一' },
  { id: 'ai_summary', label: 'AI 治理总结', desc: 'AI 分析治理结果并生成改进建议...', detail: '综合 4 维评分 + 元数据画像 + 改进方向' }
];

function showStage3Progress() {
  var body = document.getElementById('body-agent3');
  if (!body) return Promise.resolve();

  var html = '<div style="padding:16px 0">';
  for (var i = 0; i < STAGE3_STEPS.length; i++) {
    html +=
      '<div id="step3-' + STAGE3_STEPS[i].id + '" style="display:flex;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--rule);opacity:0.4;transition:opacity 0.3s">' +
      '<div id="step3-icon-' + STAGE3_STEPS[i].id + '" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;margin-right:14px;font-size:0.7rem;color:var(--text-tertiary);flex-shrink:0;transition:all 0.3s">···</div>' +
      '<div style="flex:1">' +
      '<div style="font-size:0.82rem;font-weight:600;color:var(--text-primary)">' + STAGE3_STEPS[i].label + '</div>' +
      '<div style="font-size:0.72rem;color:var(--text-tertiary);margin-top:2px">' + STAGE3_STEPS[i].desc + '</div>' +
      '<div id="step3-detail-' + STAGE3_STEPS[i].id + '" style="font-size:0.65rem;color:var(--text-tertiary);margin-top:1px;display:none"></div>' +
      '</div>' +
      '</div>';
  }
  html += '</div>';
  body.innerHTML = html;

  var delayBetween = 550; // ms between each step activation

  function animateStep(i) {
    if (i >= STAGE3_STEPS.length) return Promise.resolve();
    var step = STAGE3_STEPS[i];
    var row = document.getElementById('step3-' + step.id);
    var icon = document.getElementById('step3-icon-' + step.id);
    var detail = document.getElementById('step3-detail-' + step.id);

    // Activate: highlight row, show spinner
    if (row) row.style.opacity = '1';
    if (icon) {
      icon.innerHTML = '◉';
      icon.style.borderColor = 'var(--accent)';
      icon.style.color = 'var(--accent)';
    }
    if (detail) {
      detail.style.display = 'block';
      detail.textContent = step.detail;
    }

    return delay(delayBetween + Math.random() * 300).then(function() {
      // Complete: checkmark
      if (icon) {
        icon.innerHTML = '&#10003;';
        icon.style.borderColor = 'var(--success)';
        icon.style.color = 'var(--success)';
      }
      return animateStep(i + 1);
    });
  }

  return animateStep(0);
}

function renderAgent3Result(quality) {
  setStageStatus('agent3', 'done');
  document.getElementById('header-actions-agent3').innerHTML =
    '<button class="btn btn-outline btn-sm" data-action="download" data-download="quality_report" style="font-size:0.78rem;padding:6px 14px;font-weight:500">导出报告 JSON</button>';

  var dimDetails = buildQualityExplanation(quality);

  document.getElementById('body-agent3').innerHTML =
    '<div class="kpi-grid" style="margin-bottom:16px">' +
    '<div class="kpi-card ' + (quality.completeness && quality.completeness.pass ? 'pass' : 'fail') + '"><div class="data-label">完整性 Completeness</div><div class="data-value">' + (quality.completeness ? quality.completeness.score.toFixed(3) : '-') + '</div><div class="text-tertiary" style="font-size:0.7rem">5 个必填字段缺失率均 &le; 15%</div><div class="text-tertiary" style="font-size:0.7rem">阈值 ' + (quality.completeness ? quality.completeness.threshold : '-') + '</div></div>' +
    '<div class="kpi-card ' + (quality.accuracy && quality.accuracy.pass ? 'pass' : 'fail') + '"><div class="data-label">准确性 Accuracy</div><div class="data-value">' + (quality.accuracy ? quality.accuracy.score.toFixed(3) : '-') + '</div><div class="text-tertiary" style="font-size:0.7rem">异常值检测（年龄范围 / 斜率）</div><div class="text-tertiary" style="font-size:0.7rem">阈值 ' + (quality.accuracy ? quality.accuracy.threshold : '-') + '</div></div>' +
    '<div class="kpi-card ' + (quality.consistency && quality.consistency.pass ? 'pass' : 'fail') + '"><div class="data-label">一致性 Consistency</div><div class="data-value">' + (quality.consistency ? quality.consistency.score.toFixed(3) : '-') + '</div><div class="text-tertiary" style="font-size:0.7rem">DICOM 元数据 vs 报告标注交叉核对</div><div class="text-tertiary" style="font-size:0.7rem">含标注-分类标签匹配检验</div><div class="text-tertiary" style="font-size:0.7rem">阈值 ' + (quality.consistency ? quality.consistency.threshold : '-') + '</div></div>' +
    '<div class="kpi-card ' + (quality.usability && quality.usability.pass ? 'pass' : 'fail') + '"><div class="data-label">可用性 Usability</div><div class="data-value">' + (quality.usability ? quality.usability.score.toFixed(3) : '-') + '</div><div class="text-tertiary" style="font-size:0.7rem">标注覆盖率 ' + (quality.usability && quality.usability.annotation_coverage != null ? (quality.usability.annotation_coverage * 100).toFixed(0) + '%' : '-') + '</div><div class="text-tertiary" style="font-size:0.7rem">平均置信度 ' + (quality.usability && quality.usability.avg_confidence != null ? quality.usability.avg_confidence.toFixed(3) : '-') + '</div><div class="text-tertiary" style="font-size:0.7rem">阈值 ' + (quality.usability ? quality.usability.threshold : '-') + '</div></div>' +
    '</div>' +
    '<div style="text-align:center;padding:16px">' +
    '<span style="font-family:var(--font-serif);font-size:1.5rem;font-weight:700;color:' + (quality.overall_pass ? 'var(--success)' : 'var(--fail)') + '">' + (quality.overall_pass ? 'PASS' : 'FAIL') + '</span>' +
    '<span class="text-tertiary" style="margin-left:12px">综合评分 = (完整性 + 准确性 + 一致性 + 可用性) / 4 = ' + (quality.overall_score != null ? quality.overall_score.toFixed(3) : '-') + '</span>' +
    '</div>' +
    dimDetails +
    '<div id="stage3-ai-summary" style="margin-top:20px;padding:16px 20px;background:linear-gradient(135deg,#F8FAFB,#EEF2FB);border-left:3px solid var(--accent);border-radius:4px;display:none">' +
    '<div style="font-size:0.75rem;font-weight:600;color:var(--accent);margin-bottom:8px;letter-spacing:0.03em">AI 治理总结 <span style="font-weight:400;color:var(--text-tertiary);font-size:0.65rem;margin-left:6px">LLM 增强</span></div>' +
    '<div id="stage3-ai-summary-text" style="font-size:0.82rem;line-height:1.8;color:var(--text-secondary)">加载中...</div>' +
    '</div>' +
    '<div id="stage3-semantic" style="margin-top:16px;display:none">' +
    '<div style="font-size:0.75rem;font-weight:600;color:var(--text-primary);margin-bottom:8px">AI 语义质量抽查 <span style="font-weight:400;color:var(--text-tertiary);font-size:0.65rem;margin-left:6px">LLM 审核标注准确性</span></div>' +
    '<div id="stage3-semantic-text"></div>' +
    '</div>';
  // Async load the AI summary
  loadStage3Summary();
  loadStage3Semantic();
}

function buildQualityExplanation(quality) {
  var completeFields = '';
  if (quality.completeness && quality.completeness.fields) {
    for (var i = 0; i < quality.completeness.fields.length; i++) {
      var f = quality.completeness.fields[i];
      var fStatus = f.pass ? 'color:var(--success)' : 'color:var(--fail)';
      completeFields += '<tr><td style="font-family:var(--font-mono);font-size:0.75rem">' + f.field + '</td><td style="text-align:right">' + f.missing_count + '</td><td style="text-align:right">' + (f.missing_rate * 100).toFixed(1) + '%</td><td style="text-align:center;' + fStatus + ';font-weight:600">' + (f.pass ? 'PASS' : 'FAIL') + '</td></tr>';
    }
  }

  var consistencyIssues = '';
  if (quality.consistency && quality.consistency.issues && quality.consistency.issues.length > 0) {
    for (var j = 0; j < quality.consistency.issues.length && j < 10; j++) {
      var ci = quality.consistency.issues[j];
      consistencyIssues += '<tr><td style="font-family:var(--font-mono);font-size:0.72rem">' + ci.accession + '</td><td>' + ci.field + '</td><td style="text-align:right">' + ci.metadata_value + '</td><td style="text-align:right">' + ci.annotation_value + '</td></tr>';
    }
  }

  var annotationIssues = '';
  var annIssuesData = quality.consistency && quality.consistency.annotation_issues;
  if (annIssuesData && annIssuesData.length > 0) {
    for (var aj = 0; aj < annIssuesData.length && aj < 10; aj++) {
      var annIss = annIssuesData[aj];
      annotationIssues += '<tr><td style="font-family:var(--font-mono);font-size:0.72rem">' + annIss.accession + '</td><td style="font-size:0.72rem">' + (annIss.only_in_annotations || []).join(', ') + '</td><td style="font-size:0.72rem">' + (annIss.only_in_classifications || []).join(', ') + '</td></tr>';
    }
  }

  var annotationStatsRows = '';
  var annStatsData = quality.usability && quality.usability.annotation_stats;
  if (annStatsData && annStatsData.length > 0) {
    for (var ak = 0; ak < annStatsData.length; ak++) {
      var ast = annStatsData[ak];
      annotationStatsRows += '<tr><td style="font-family:var(--font-mono);font-size:0.72rem">' + ast.accession + '</td><td style="text-align:right">' + ast.disease_count + '</td><td style="text-align:right">' + ast.avg_confidence.toFixed(3) + '</td><td style="text-align:center">' + (ast.has_annotations ? '<span style="color:var(--success)">&#10003;</span>' : '<span style="color:var(--fail)">&#10007;</span>') + '</td></tr>';
    }
  }

  var accuracyIssues = '';
  if (quality.accuracy && quality.accuracy.issues && quality.accuracy.issues.length > 0) {
    for (var k = 0; k < quality.accuracy.issues.length && k < 10; k++) {
      var ai = quality.accuracy.issues[k];
      accuracyIssues += '<tr><td>' + ai.record + '</td><td>' + ai.field + '</td><td>' + ai.reason + '</td></tr>';
    }
  }

  return '' +
    '<details style="margin-top:8px;padding:16px;background:#F8F9FA;border:1px solid var(--border);border-radius:6px">' +
    '<summary style="font-weight:600;font-size:0.85rem;cursor:pointer;color:var(--accent)">' + '评分机制说明 — 如何计算？' + '</summary>' +

    '<div style="margin-top:14px">' +
    '<div style="font-weight:600;font-size:0.82rem;margin-bottom:6px">' + '1. 完整性 Completeness' + '</div>' +
    '<p style="font-size:0.78rem;color:var(--text-secondary);line-height:1.8;margin-bottom:10px">' +
    '检查 5 个核心 DICOM 字段的缺失率：PatientAgeClean（年龄）、PatientSexClean（性别）、RescaleInterceptClean（HU 截距）、RescaleSlopeClean（HU 斜率）、ManufacturerClean（设备厂商）。每字段缺失率 &le; 15% 即通过。总分 = 通过字段数 / 5。' +
    '</p>' +
    (completeFields ?
    '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-bottom:12px"><thead><tr style="background:var(--bg-primary)"><th style="padding:4px 8px;text-align:left">字段</th><th style="padding:4px 8px;text-align:right">缺失数</th><th style="padding:4px 8px;text-align:right">缺失率</th><th style="padding:4px 8px;text-align:center">判定</th></tr></thead><tbody>' + completeFields + '</tbody></table>'
    : '') +

    '<div style="font-weight:600;font-size:0.82rem;margin-bottom:6px;margin-top:16px">' + '2. 准确性 Accuracy' + '</div>' +
    '<p style="font-size:0.78rem;color:var(--text-secondary);line-height:1.8;margin-bottom:10px">' +
    '检测异常值：(1) 年龄超出 0–120 岁范围；(2) RescaleSlope 接近零（&lt; 1e-9），HU 校准参数无效。总分 = 1 - 异常记录数 / 总记录数。' +
    '</p>' +
    (accuracyIssues ?
    '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-bottom:12px"><thead><tr style="background:var(--bg-primary)"><th style="padding:4px 8px;text-align:left">记录</th><th style="padding:4px 8px;text-align:left">字段</th><th style="padding:4px 8px;text-align:left">原因</th></tr></thead><tbody>' + accuracyIssues + '</tbody></table>'
    : '<p style="font-size:0.75rem;color:var(--success);margin-bottom:10px">' + '无异常检测项，所有值在合理范围内' + '</p>') +

    '<div style="font-weight:600;font-size:0.82rem;margin-bottom:6px;margin-top:16px">' + '3. 一致性 Consistency' + '</div>' +
    '<p style="font-size:0.78rem;color:var(--text-secondary);line-height:1.8;margin-bottom:10px">' +
    '双层交叉核对：(a) DICOM 元数据（年龄/性别） vs 报告标注结果（精确匹配，年龄差 &lt; 2 岁）；(b) 标注疾病标签 vs 分类阳性标签（名称匹配）。总分 = 1 - (元数据不匹配数 + 标签不一致数 × 0.5) / 总标注数。' +
    '</p>' +
    '<p style="font-size:0.8rem;color:var(--text-secondary);font-weight:600">' + '—— 元数据交叉核对 ——' + '</p>' +
    (consistencyIssues ?
    '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-bottom:8px"><thead><tr style="background:var(--bg-primary)"><th style="padding:4px 8px;text-align:left">检查号</th><th style="padding:4px 8px;text-align:left">字段</th><th style="padding:4px 8px;text-align:right">元数据值</th><th style="padding:4px 8px;text-align:right">标注值</th></tr></thead><tbody>' + consistencyIssues + '</tbody></table>'
    : '<p style="font-size:0.75rem;color:var(--success);margin-bottom:8px">' + '元数据与报告标注完全一致' + '</p>') +
    '<p style="font-size:0.8rem;color:var(--text-secondary);font-weight:600">' + '—— 标注 vs 分类标签匹配 ——' + '</p>' +
    (annotationIssues ?
    '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-bottom:12px"><thead><tr style="background:var(--bg-primary)"><th style="padding:4px 8px;text-align:left">检查号</th><th style="padding:4px 8px;text-align:left">仅标注有</th><th style="padding:4px 8px;text-align:left">仅分类有</th></tr></thead><tbody>' + annotationIssues + '</tbody></table>'
    : '<p style="font-size:0.75rem;color:var(--success);margin-bottom:12px">' + '标注与分类标签完全一致，无跨源冲突' + '</p>') +

    '<div style="font-weight:600;font-size:0.82rem;margin-bottom:6px;margin-top:16px">' + '4. 可用性 Usability' + '</div>' +
    '<p style="font-size:0.78rem;color:var(--text-secondary);line-height:1.8;margin-bottom:10px">' +
    '综合评估：(a) 阳性标签覆盖率（40%权重）— 病例是否具备有效分类标签或标注内容；(b) 标注覆盖率（30%权重）— 多少病例被至少检出 1 种疾病；(c) 平均置信度（30%权重）— 分类标签的平均置信度。总分 = 三项加权。' +
    '</p>' +
    (annotationStatsRows ?
    '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-bottom:12px"><thead><tr style="background:var(--bg-primary)"><th style="padding:4px 8px;text-align:left">检查号</th><th style="padding:4px 8px;text-align:right">检出数</th><th style="padding:4px 8px;text-align:right">平均置信度</th><th style="padding:4px 8px;text-align:center">有标注</th></tr></thead><tbody>' + annotationStatsRows + '</tbody></table>'
    : '') +

    '<div style="font-weight:600;font-size:0.82rem;margin-bottom:6px;margin-top:16px">' + '5. 综合评分' + '</div>' +
    '<p style="font-size:0.78rem;color:var(--text-secondary);line-height:1.8">' +
    '四项评分取均值：Overall = (Completeness + Accuracy + Consistency + Usability) / 4。综合评分 &ge; 0.80 即为 PASS。' +
    '</p>' +

    '</div></details>';
}

function normalizeLabel(name) {
  return name.replace(/_/g, ' ').toLowerCase();
}

function classifyDiseases(ruleDiseases, llmPathologies) {
  var ruleSet = {};
  var ruleKeys = Object.keys(ruleDiseases || {});
  for (var i = 0; i < ruleKeys.length; i++) {
    ruleSet[normalizeLabel(ruleKeys[i])] = ruleKeys[i];
  }
  var llp = llmPathologies || [];
  var llmSet = {};
  for (var j = 0; j < llp.length; j++) {
    llmSet[llp[j].toLowerCase()] = llp[j];
  }

  var both = [];     // matched (use original display names)
  var ruleOnly = [];
  var llmOnly = [];

  for (var k = 0; k < ruleKeys.length; k++) {
    var norm = normalizeLabel(ruleKeys[k]);
    if (llmSet.hasOwnProperty(norm)) {
      both.push({ rule: ruleKeys[k], llm: llmSet[norm] });
      delete llmSet[norm];
    } else {
      ruleOnly.push(ruleKeys[k]);
    }
  }
  var llmRemaining = Object.keys(llmSet);
  for (var m = 0; m < llmRemaining.length; m++) {
    llmOnly.push(llmSet[llmRemaining[m]]);
  }
  return { both: both, ruleOnly: ruleOnly, llmOnly: llmOnly };
}

function tagsHtml(items, cssClass) {
  var html = '';
  for (var i = 0; i < items.length; i++) {
    html += '<span class="entity-tag ' + cssClass + '">' + items[i] + '</span>';
  }
  if (items.length === 0) html = '<span class="text-tertiary" style="font-size:0.8rem">无</span>';
  return html;
}

function renderAgent2Comparison(anns, llmResults) {
  var annKeys = Object.keys(anns);
  var html = '';

  for (var i = 0; i < annKeys.length && i < 5; i++) {
    var acc = annKeys[i];
    var ann = anns[acc];
    var llm = llmResults[acc] || {};
    var llmErr = llm.error || '';

    var ruleDiseases = Object.keys(ann.diseases || {});
    var cls = classifyDiseases(ann.diseases, llm.pathologies);

    // Normalize negated findings for comparison
    var ruleNegated = (ann.negated_findings || []).map(function(n) { return n.disease; });
    var llmNegated = llm.negated_findings || [];
    var negNorm = {};
    for (var ni = 0; ni < ruleNegated.length; ni++) { negNorm[ruleNegated[ni].toLowerCase()] = ruleNegated[ni]; }
    for (var nj = 0; nj < llmNegated.length; nj++) {
      if (negNorm.hasOwnProperty(llmNegated[nj].toLowerCase())) {
        delete negNorm[llmNegated[nj].toLowerCase()];
      }
    }

    // Compact tag lists — rule engine diseases matched + unmatched
    var ruleMatchedTags = '';
    for (var ri = 0; ri < cls.both.length; ri++) {
      ruleMatchedTags += '<span class="entity-tag match">' + cls.both[ri].rule + '</span>';
    }
    for (var rj = 0; rj < cls.ruleOnly.length; rj++) {
      ruleMatchedTags += '<span class="entity-tag disease">' + cls.ruleOnly[rj] + '</span>';
    }

    var llmMatchedTags = '';
    for (var li = 0; li < cls.both.length; li++) {
      llmMatchedTags += '<span class="entity-tag match">' + cls.both[li].llm + '</span>';
    }
    for (var lj = 0; lj < cls.llmOnly.length; lj++) {
      llmMatchedTags += '<span class="entity-tag llm-new">' + cls.llmOnly[lj] + '</span>';
    }

    // Organs table rows
    var organsRows = '';
    var organs = llm.organs || [];
    for (var o = 0; o < organs.length; o++) {
      var org = organs[o];
      organsRows += '<tr>' +
        '<td>' + (org.name || '-') + '</td>' +
        '<td>' + (org.finding || '-') + '</td>' +
        '<td>' + (org.measurement || '-') + '</td>' +
        '<td>' + (org.distribution || '-') + '</td>' +
        '<td>' + (org.side || '-') + '</td>' +
        '</tr>';
    }

    // Impression + recommendations
    var impressionHtml = '';
    if (llm.impression_summary) {
      impressionHtml = '<div style="margin-top:10px;padding:10px 14px;background:var(--bg-primary);border-left:3px solid var(--accent);font-size:0.85rem;line-height:1.7">' +
        '<strong>Impression: </strong>' + llm.impression_summary +
        '</div>';
    }

    var recsHtml = '';
    var recs = llm.recommendations || [];
    if (recs.length > 0) {
      var recItems = '';
      for (var ri2 = 0; ri2 < recs.length; ri2++) {
        recItems += '<li>' + recs[ri2] + '</li>';
      }
      recsHtml = '<div style="margin-top:8px;font-size:0.85rem"><strong>建议: </strong><ul style="margin:4px 0 0 18px;padding:0">' + recItems + '</ul></div>';
    }

    var severityBadge = '';
    if (llm.severity_rank) {
      var sevColor = { high: 'var(--fail)', medium: '#B8860B', low: 'var(--success)' };
      severityBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:3px;font-size:0.75rem;font-weight:600;background:' + (sevColor[llm.severity_rank] || 'var(--text-tertiary)') + ';color:#fff;margin-left:8px">' + llm.severity_rank.toUpperCase() + '</span>';
    }

    var followUpBadge = '';
    if (llm.follow_up !== undefined && llm.follow_up !== null) {
      followUpBadge = '<span style="display:inline-block;padding:2px 10px;border-radius:3px;font-size:0.75rem;font-weight:600;background:' + (llm.follow_up ? 'var(--accent)' : 'var(--text-tertiary)') + ';color:#fff;margin-left:8px">随访: ' + (llm.follow_up ? '建议' : '无') + '</span>';
    }

    var cardBorder = llmErr ? '2px solid var(--fail)' : '1px solid var(--border)';

    html += '<div style="margin-bottom:20px;padding:20px;border:' + cardBorder + ';border-radius:6px;background:var(--bg-card)">' +
      // Header
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--rule)">' +
      '<div>' +
      '<strong style="font-size:1rem">' + acc + '</strong>' +
      '<span class="text-tertiary" style="margin-left:10px;font-size:0.85rem">年龄 ' + (ann.age || llm.age || '-') + ' · ' + (ann.sex || llm.sex || '-') + '</span>' +
      severityBadge + followUpBadge +
      '</div>' +
      (llmErr ? '<span style="color:var(--fail);font-size:0.8rem">LLM: ' + llmErr + '</span>' : '') +
      '</div>' +

      // Disease comparison — two column
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
      '<div>' +
      '<div class="text-tertiary" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">规则引擎检出</div>' +
      '<div class="entity-tags">' + (ruleMatchedTags || '<span class="text-tertiary" style="font-size:0.8rem">无</span>') + '</div>' +
      '</div>' +
      '<div>' +
      '<div class="text-tertiary" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">LLM 结构化检出</div>' +
      '<div class="entity-tags">' + (llmMatchedTags || '<span class="text-tertiary" style="font-size:0.8rem">无</span>') + '</div>' +
      '</div>' +
      '</div>' +

      // Organs detail
      (organsRows ? '<div style="margin-top:14px"><div class="text-tertiary" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">LLM 器官/发现详情</div>' +
      '<table style="width:100%;font-size:0.8rem;border-collapse:collapse"><thead><tr style="background:var(--bg-primary)"><th style="padding:6px 8px;text-align:left;font-weight:600">器官</th><th style="padding:6px 8px;text-align:left;font-weight:600">发现</th><th style="padding:6px 8px;text-align:left;font-weight:600">测量</th><th style="padding:6px 8px;text-align:left;font-weight:600">分布</th><th style="padding:6px 8px;text-align:left;font-weight:600">侧别</th></tr></thead><tbody>' + organsRows + '</tbody></table></div>' : '') +

      impressionHtml +
      recsHtml +
      (llm.confidence_note ? '<div style="margin-top:8px;font-size:0.8rem;color:var(--text-tertiary);font-style:italic">' + llm.confidence_note + '</div>' : '') +
      '</div>';
  }

  document.getElementById('body-agent2').innerHTML = html +
    '<p style="margin-top:8px;font-size:0.8rem;color:var(--text-secondary)">规则引擎 + LLM 对比 · 共 ' + annKeys.length + ' 份报告</p>';
}

function runLLMStructuringAsync(useDemo, annotationsOverride) {
  // Promise-based wrapper — used by pipeline to await LLM completion
  return new Promise(function(resolve) {
    var body = document.getElementById('body-agent2');
    if (!body) { resolve({}); return; }

    var anns = annotationsOverride || (wbState.results && wbState.results.annotations) || {};
    var annKeys = Object.keys(anns);
    if (annKeys.length === 0) { resolve({}); return; }

    var totalReports = annKeys.length;
    var streamResults = {};
    var currentPatient = '';
    var currentStreamText = '';
    var completedCount = 0;
    var errorCount = 0;
    var rafPending = false;
    var NL = String.fromCharCode(10);

    var stageDisplays = '';
    for (var si = 0; si < annKeys.length; si++) {
      stageDisplays += '<span id="llm-stage-' + si + '" style="font-size:0.7rem;color:var(--text-tertiary);padding:2px 8px;border:1px solid var(--border);border-radius:3px;display:inline-block">&#x25CB; ' + annKeys[si] + '</span>';
    }

    body.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
      '<span style="font-weight:600;font-size:0.78rem;color:var(--text-primary);white-space:nowrap">处理进度</span>' +
      '<div id="llm-progress-bar" style="flex:1;height:4px;background:var(--border);border-radius:2px;min-width:60px">' +
      '<div id="llm-progress-fill" style="height:100%;width:0%;background:var(--accent);border-radius:2px;transition:width 0.15s"></div></div>' +
      '<span id="llm-progress-text" style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap">连接中...</span>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px" id="llm-stages">' + stageDisplays + '</div>' +
      '<div style="font-weight:600;font-size:0.8rem;margin-bottom:6px;color:var(--text-primary)">实时推理过程 <span id="llm-current-label" style="font-weight:400;font-size:0.7rem;color:var(--text-tertiary);margin-left:6px"></span></div>' +
      '<div id="llm-stream-box" style="background:#1A1A2E;color:#E0E0E0;font-family:var(--font-mono);font-size:0.76rem;line-height:1.7;padding:14px;border-radius:6px;min-height:300px;max-height:500px;overflow-y:auto;white-space:pre-wrap;word-break:break-word">' +
      '<span style="color:var(--text-tertiary)">等待模型响应...</span>' +
      '</div>';

    var streamBox = document.getElementById('llm-stream-box');
    var progressFill = document.getElementById('llm-progress-fill');
    var progressText = document.getElementById('llm-progress-text');
    var currentLabel = document.getElementById('llm-current-label');

    function updateProgress() {
      var pct = Math.round(completedCount / totalReports * 100);
      if (progressFill) progressFill.style.width = pct + '%';
    }

    function markStageDone(acc) {
      var idx = annKeys.indexOf(acc);
      if (idx >= 0) {
        var el = document.getElementById('llm-stage-' + idx);
        if (el) el.innerHTML = '&#x25CF; ' + acc;
      }
    }

    function markStageError(acc) {
      var idx = annKeys.indexOf(acc);
      if (idx >= 0) {
        var el = document.getElementById('llm-stage-' + idx);
        if (el) el.innerHTML = '<span style="color:var(--fail)">&#x2715; ' + acc + '</span>';
      }
    }

    function flushStreamBox() {
      rafPending = false;
      if (streamBox && currentPatient) {
        streamBox.innerHTML = '<span style="color:#7AA2F7">--- ' + currentPatient + ' ---</span>' + NL +
          escapeHtml(currentStreamText);
        streamBox.scrollTop = streamBox.scrollHeight;
      }
    }

    function scheduleFlush() {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(flushStreamBox);
      }
    }

    var callbacks = {
      onStatus: function(status) {
        if (status.stage === 'start') {
          if (progressText) progressText.textContent = '0 / ' + status.total + ' 份';
          return;
        }
        if (status.stage === 'processing') {
          if (status.patient_id !== currentPatient) {
            currentPatient = status.patient_id;
            currentStreamText = '';
            if (streamBox) {
              streamBox.innerHTML = '<span style="color:#7AA2F7">--- ' + currentPatient + ' ---</span>' + NL;
            }
          }
          if (currentLabel) currentLabel.textContent = status.message || '';
          if (progressText) progressText.textContent = '处理中 ' + status.current + ' / ' + status.total;
          return;
        }
        if (status.stage === 'report_done') {
          completedCount++;
          markStageDone(status.patient_id);
          updateProgress();
          if (progressText) progressText.textContent = completedCount + ' / ' + totalReports + ' 已完成';
          return;
        }
      },
      onChunk: function(chunk) {
        if (chunk.patient_id === currentPatient) {
          currentStreamText += chunk.text;
          scheduleFlush();
        }
      },
      onResult: function(result) {
        streamResults[result.patient_id] = result;
      },
      onError: function(err) {
        errorCount++;
        if (err.patient_id) markStageError(err.patient_id);
        updateProgress();
        if (streamBox) {
          streamBox.innerHTML += NL + '<span style="color:#E06060">[错误] ' + (err.error || '未知错误') + '</span>' + NL;
        }
      },
      onDone: function() {
        updateProgress();
        if (progressText) progressText.textContent = '全部完成 · 共 ' + completedCount + ' 份报告';
        resolve(streamResults);
      }
    };

    if (useDemo) {
      API.streamLLM(callbacks.onStatus, callbacks.onChunk, callbacks.onResult, callbacks.onError, callbacks.onDone);
    } else {
      API.streamLLMFromAnnotations(anns, callbacks.onStatus, callbacks.onChunk, callbacks.onResult, callbacks.onError, callbacks.onDone);
    }
  });
}

function runLLMStructuring() {
  var body = document.getElementById('body-agent2');
  if (!body) return;

  var anns = wbState.results.annotations || {};
  var annKeys = Object.keys(anns);
  var totalReports = annKeys.length;

  var streamResults = {};
  var currentPatient = '';
  var currentStreamText = '';
  var completedCount = 0;
  var errorCount = 0;
  var processingIdx = -1;
  var rafPending = false;
  var NL = String.fromCharCode(10);
  var stageDisplays = '';
  for (var si = 0; si < annKeys.length; si++) {
    stageDisplays += '<span id="llm-stage-' + si + '" style="font-size:0.7rem;color:var(--text-tertiary);padding:2px 8px;border:1px solid var(--border);border-radius:3px;display:inline-block">&#x25CB; ' + annKeys[si] + '</span>';
  }

  var initialHtml =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
    '<span style="font-weight:600;font-size:0.78rem;color:var(--text-primary);white-space:nowrap">' + '处理进度' + '</span>' +
    '<div id="llm-progress-bar" style="flex:1;height:4px;background:var(--border);border-radius:2px;min-width:60px">' +
    '<div id="llm-progress-fill" style="height:100%;width:0%;background:var(--accent);border-radius:2px;transition:width 0.15s"></div></div>' +
    '<span id="llm-progress-text" style="font-size:0.7rem;color:var(--text-secondary);white-space:nowrap">' + '连接中...' + '</span>' +
    '</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px" id="' + 'llm-stages">' + stageDisplays + '</div>' +
    '<div style="font-weight:600;font-size:0.8rem;margin-bottom:6px;color:var(--text-primary)">' + '实时推理过程' + ' <span id="llm-current-label" style="font-weight:400;font-size:0.7rem;color:var(--text-tertiary);margin-left:6px"></span></div>' +
    '<div id="llm-stream-box" style="background:#1A1A2E;color:#E0E0E0;font-family:var(--font-mono);font-size:0.76rem;line-height:1.7;padding:14px;border-radius:6px;min-height:300px;max-height:500px;overflow-y:auto;white-space:pre-wrap;word-break:break-word">' +
    '<span style="color:var(--text-tertiary)">' + '等待模型响应...' + '</span>' +
    '</div>';

  body.innerHTML = initialHtml;

  var streamBox = document.getElementById('llm-stream-box');
  var progressFill = document.getElementById('llm-progress-fill');
  var progressText = document.getElementById('llm-progress-text');
  var currentLabel = document.getElementById('llm-current-label');

  function updateProgress() {
    var pct = Math.round(completedCount / totalReports * 100);
    if (progressFill) progressFill.style.width = pct + '%';
  }

  function setProgressText(msg) {
    if (progressText) progressText.textContent = msg;
  }

  function markStageDone(acc) {
    var idx = annKeys.indexOf(acc);
    if (idx >= 0) {
      var el = document.getElementById('llm-stage-' + idx);
      if (el) el.innerHTML = '&#x25CF; ' + acc;
    }
  }

  function markStageError(acc) {
    var idx = annKeys.indexOf(acc);
    if (idx >= 0) {
      var el = document.getElementById('llm-stage-' + idx);
      if (el) el.innerHTML = '<span style="color:var(--fail)">&#x2715; ' + acc + '</span>';
    }
  }

  function flushStreamBox() {
    rafPending = false;
    if (streamBox && currentPatient) {
      streamBox.innerHTML = '<span style="color:#7AA2F7">--- ' + currentPatient + ' ---</span>' + NL +
        escapeHtml(currentStreamText);
      streamBox.scrollTop = streamBox.scrollHeight;
    }
  }

  function scheduleFlush() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(flushStreamBox);
    }
  }

  API.streamLLM(
    function onStatus(status) {
      if (status.stage === 'start') {
        setProgressText('0 / ' + status.total + ' 份');
        return;
      }
      if (status.stage === 'processing') {
        processingIdx = (status.current || 1) - 1;
        if (status.patient_id !== currentPatient) {
          currentPatient = status.patient_id;
          currentStreamText = '';
          if (streamBox) {
            streamBox.innerHTML = '<span style="color:#7AA2F7">--- ' + currentPatient + ' ---</span>' + NL;
          }
        }
        if (currentLabel) currentLabel.textContent = status.message || '';
        setProgressText('处理中 ' + status.current + ' / ' + status.total);
        return;
      }
      if (status.stage === 'report_done') {
        completedCount++;
        markStageDone(status.patient_id);
        updateProgress();
        setProgressText(completedCount + ' / ' + totalReports + ' 已完成');
        return;
      }
    },
    function onChunk(chunk) {
      if (chunk.patient_id === currentPatient) {
        currentStreamText += chunk.text;
        scheduleFlush();
      }
    },
    function onResult(result) {
      streamResults[result.patient_id] = result;
    },
    function onError(err) {
      errorCount++;
      if (err.patient_id) markStageError(err.patient_id);
      updateProgress();
      if (streamBox) {
        streamBox.innerHTML += NL + '<span style="color:#E06060">[错误] ' + (err.error || '未知错误') + '</span>' + NL;
      }
    },
    function onDone() {
      updateProgress();
      setProgressText('全部完成 · 共 ' + completedCount + ' 份报告');

      if (completedCount === 0 && errorCount > 0) {
        body.innerHTML =
          '<div style="text-align:center;padding:32px 20px">' +
          '<div style="font-size:1.2rem;margin-bottom:12px;color:var(--text-secondary)">LLM 增强暂不可用</div>' +
          '<p style="font-size:0.85rem;color:var(--text-tertiary);line-height:1.8;max-width:480px;margin:0 auto">' +
          '此功能为可选增强模块，需配置 LLM API Key 后方可使用。<br>' +
          '规则引擎标注结果已覆盖 21 类疾病 + 50+ 解剖部位，可满足常规治理需求。</p>' +
          '<button class="btn btn-outline btn-sm" data-action="run-llm" style="margin-top:16px">重试 LLM 增强</button>' +
          '</div>';
        return;
      }

      if (Object.keys(streamResults).length > 0) {
        wbState.results.llm_structured = streamResults;
        App.state.pipelineResults = wbState.results;
        renderAgent2Comparison(wbState.results.annotations, streamResults);
        // Update button label
        var hdr2 = document.getElementById('header-actions-agent2');
        if (hdr2) {
          hdr2.innerHTML =
            '<button class="btn btn-outline btn-sm" data-action="run-llm" style="font-size:0.78rem;padding:6px 14px;font-weight:500">重新 LLM 分析</button>' +
            '<button class="btn btn-outline btn-sm" data-action="download" data-download="annotations" style="font-size:0.78rem;padding:6px 14px;font-weight:500">导出 JSON</button>';
        }
      } else {
        body.innerHTML = '<p class="text-tertiary">LLM 调用未返回有效结果</p>' +
          '<button class="btn btn-outline btn-sm" data-action="run-llm" style="margin-top:12px">重试 LLM 增强</button>';
      }
    }
  );
}

function loadStage3Semantic(precomputedData) {
  var box = document.getElementById('stage3-semantic');
  var textEl = document.getElementById('stage3-semantic-text');
  if (!box || !textEl) return;

  function renderData(data) {
    if (!data || Object.keys(data).length === 0) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    var qualityMap = { good: '良好 ✓', fair: '一般 ~', poor: '较差 ✗' };
    var colorMap = { good: 'var(--success)', fair: '#B8860B', poor: 'var(--fail)' };
    var bgMap = { good: '#EDF5EC', fair: '#FDF8ED', poor: '#FDEDED' };
    var accs = Object.keys(data);
    textEl.innerHTML = '';

    function revealPatient(idx) {
      if (idx >= accs.length) return;
      var acc = accs[idx];
      var v = data[acc];
      var q = v.overall_quality || 'unknown';
      var html = '<div style="margin-bottom:10px;padding:12px 14px;background:var(--bg-primary);border-radius:4px;animation:fadeIn 0.4s ease">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
        '<strong style="font-family:var(--font-mono);font-size:0.8rem">' + acc + '</strong>' +
        '<span style="padding:1px 8px;border-radius:3px;font-size:0.68rem;font-weight:600;color:' + (colorMap[q] || 'var(--text-tertiary)') + ';background:' + (bgMap[q] || 'var(--bg-primary)') + '">' + (qualityMap[q] || q) + '</span>' +
        '<span style="font-size:0.65rem;color:var(--text-tertiary)">置信度 ' + (v.confidence != null ? (v.confidence * 100).toFixed(0) + '%' : '-') + '</span>' +
        '</div>' +
        '<div style="font-size:0.78rem;line-height:1.7;color:var(--text-secondary)">' + (v.brief_note || '') + '</div>';
      if (v.false_positives && v.false_positives.length > 0) {
        html += '<div style="margin-top:4px"><span style="color:var(--fail);font-size:0.68rem">假阳性: </span><span style="font-size:0.72rem;color:var(--text-secondary)">' + v.false_positives.slice(0,3).join(', ') + '</span></div>';
      }
      if (v.false_negatives && v.false_negatives.length > 0) {
        html += '<div style="margin-top:2px"><span style="color:#B8860B;font-size:0.68rem">遗漏: </span><span style="font-size:0.72rem;color:var(--text-secondary)">' + v.false_negatives.slice(0,3).join(', ') + '</span></div>';
      }
      if (v.negation_errors && v.negation_errors.length > 0) {
        html += '<div style="margin-top:2px"><span style="color:#B8860B;font-size:0.68rem">否定错误: </span><span style="font-size:0.72rem;color:var(--text-secondary)">' + v.negation_errors.slice(0,2).join(', ') + '</span></div>';
      }
      html += '</div>';
      textEl.innerHTML += html;
      setTimeout(function() { revealPatient(idx + 1); }, 500 + Math.random() * 400);
    }
    revealPatient(0);
  }

  // Show loading indicator
  textEl.innerHTML = '<span style="color:var(--text-tertiary);font-size:0.78rem">加载语义验证数据</span> <span class="typing-dots">...</span>';

  // Use precomputed data from pipeline (uploaded data)
  if (precomputedData) {
    setTimeout(function() { renderData(precomputedData); }, 800);
    return;
  }

  // Demo data: fetch from server
  API.getDemoData('semantic_verification').then(function(data) {
    renderData(data);
  }).catch(function() {
    box.style.display = 'none';
  });
}

function loadStage3Summary(precomputedText) {
  var box = document.getElementById('stage3-ai-summary');
  var textEl = document.getElementById('stage3-ai-summary-text');
  if (!box || !textEl) return;

  function renderText(text) {
    if (!text) { box.style.display = 'none'; return; }
    // Process markdown-like formatting
    var paragraphs = text.split(/\n\n+/);
    var fullHTML = '';
    for (var p = 0; p < paragraphs.length; p++) {
      var para = paragraphs[p]
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n- /g, '\n<span style="color:var(--accent)">&bull;</span> ')
        .replace(/\n/g, '<br>');
      fullHTML += '<p style="margin-top:8px">' + para + '</p>';
    }
    // Typewriter reveal: show paragraph by paragraph
    var paraDivs = fullHTML.split('</p>').filter(function(s) { return s.trim(); });
    textEl.innerHTML = '';
    box.style.display = 'block';

    function revealNext(idx) {
      if (idx >= paraDivs.length) return;
      textEl.innerHTML += paraDivs[idx] + '</p>';
      setTimeout(function() { revealNext(idx + 1); }, 350 + Math.random() * 250);
    }
    revealNext(0);
  }

  // Show thinking indicator
  textEl.innerHTML = '<span style="color:var(--accent)">分析治理数据中</span> <span class="typing-dots">...</span>';

  // Use precomputed text from pipeline (uploaded data)
  if (precomputedText) {
    // Brief delay so the thinking indicator is visible
    setTimeout(function() { renderText(precomputedText); }, 1200);
    return;
  }

  // Demo data: fetch from server
  API.getDemoData('governance_summary').then(function(data) {
    renderText((data && data.text) ? data.text : '');
  }).catch(function() {
    box.style.display = 'none';
  });
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateSourceStatus() {
  var hintEl = document.getElementById('wb-source-hint');
  var results = wbState.results;
  if (!results) return;

  var meta = results.cleaned_metadata || [];
  var anns = results.annotations || {};
  var accSet = {};
  for (var i = 0; i < meta.length; i++) {
    var acc = (meta[i] || {})._accession_no;
    if (acc) accSet[acc] = true;
  }
  var patientCount = Object.keys(accSet).length || Object.keys(anns).length || 0;
  var hasLLM = results.llm_structured && Object.keys(results.llm_structured).length > 0;

  if (wbState.dataSource === 'upload' && wbState._files && wbState._files.length > 0) {
    var fileNames = wbState._files.slice(0, 3).map(function(f) { return f.name; }).join(', ');
    if (hintEl) hintEl.innerHTML = '<span style="color:var(--success);font-weight:600">&#10003;</span> ' + patientCount + ' 病例' + (hasLLM ? ' · LLM' : '') + ' · ' + fileNames + (wbState._files.length > 3 ? ' ...' : '');
  } else {
    if (hintEl) hintEl.innerHTML = patientCount + ' 病例' + (hasLLM ? ' · LLM 增强' : '') + ' · 治理完成';
  }
}

function showDashboardLink() {
  var exportEl = document.getElementById('toolbar-export');
  if (!exportEl) return;
  exportEl.style.display = 'flex';
}
