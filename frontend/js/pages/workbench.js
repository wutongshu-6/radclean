var wbState = {
  dataSource: 'demo',
  formatStandard: 'dicom',
  cleaningMode: 'analysis',
  stageStatus: { agent1: 'idle', agent2: 'idle', agent3: 'idle' },
  results: null,
  toolStatus: { agent1: {}, agent2: {}, agent3: {} }
};

var AGENT_TOOLS = {
  agent1: ['探针扫描', '残留清理', '后缀修复', '零字节检测', '格式标准化', 'HU值还原', '完整性校验', '空间对齐', 'PHI扫描', '患者索引'],
  agent2: ['规则提取', 'LLM增强', '否定检测', '时序提取'],
  agent3: ['术语标准化', '核类型映射']
};

function initToolStatus(agentKey) {
  var tools = AGENT_TOOLS[agentKey];
  wbState.toolStatus[agentKey] = {};
  for (var i = 0; i < tools.length; i++) {
    wbState.toolStatus[agentKey][tools[i]] = 'pending';
  }
  updateAllToolChips(agentKey);
}

function setToolStatus(agentKey, toolName, status) {
  if (!wbState.toolStatus[agentKey]) wbState.toolStatus[agentKey] = {};
  var current = wbState.toolStatus[agentKey][toolName];
  if (status === 'running' && current === 'pending') { /* ok */ }
  else if (status === 'done' && (current === 'running' || current === 'pending')) { /* ok */ }
  else { return; }
  wbState.toolStatus[agentKey][toolName] = status;
  updateToolChip(agentKey, toolName, status);
}

function updateToolChip(agentKey, toolName, status) {
  var chip = document.getElementById('tool-' + agentKey + '-' + toolName);
  if (!chip) return;
  chip.classList.remove('pending', 'active', 'done');
  if (status === 'running') chip.classList.add('active');
  else if (status === 'done') chip.classList.add('done');
  else chip.classList.add('pending');
}

function completeAllTools(agentKey) {
  var tools = AGENT_TOOLS[agentKey];
  for (var i = 0; i < tools.length; i++) {
    if (wbState.toolStatus[agentKey][tools[i]] !== 'done') {
      wbState.toolStatus[agentKey][tools[i]] = 'done';
      updateToolChip(agentKey, tools[i], 'done');
    }
  }
}

function updateAllToolChips(agentKey) {
  var statuses = wbState.toolStatus[agentKey] || {};
  var tools = AGENT_TOOLS[agentKey];
  for (var i = 0; i < tools.length; i++) {
    updateToolChip(agentKey, tools[i], statuses[tools[i]] || 'pending');
  }
}

async function animateTools(agentKey, delayMs) {
  var tools = AGENT_TOOLS[agentKey];
  for (var i = 0; i < tools.length; i++) {
    setToolStatus(agentKey, tools[i], 'running');
    await delay(delayMs + Math.random() * 100);
    setToolStatus(agentKey, tools[i], 'done');
  }
}

function renderWorkbench() {
  var page = document.getElementById('page-workspace');
  if (!page) return;

  // Auto-start demo if navigated from home "查看结果"
  if (App.state.autoDemo) {
    App.state.autoDemo = false;
    wbState.results = {};
    setTimeout(function() { runPipeline('all'); }, 400);
  }

  // Helper to generate a vertical pipeline stage
  function _pipelineStage(num, title, subtitle, agentKey, colorHex, isOutput) {
    var tools = AGENT_TOOLS[agentKey] || [];
    var toolChips = '';
    for (var i = 0; i < tools.length; i++) {
      toolChips += '<span class="tool-mini pending" id="tool-' + agentKey + '-' + tools[i] + '">' + (i + 1) + '. ' + tools[i] + '</span>';
    }
    var toolRow = tools.length > 0 ? '<div class="pipeline-tools" id="tools-' + agentKey + '">' + toolChips + '</div>' : '';
    var bodyId = isOutput ? 'body-output' : 'body-' + agentKey;
    var stageClass = isOutput ? 'stage-output' : agentKey;
    return '<section class="pipeline-stage stage-' + stageClass + '" id="stage-' + agentKey + '">' +
      '<div class="pipeline-stage-header" data-action="toggle-stage" data-stage="' + agentKey + '">' +
      '<div class="pipeline-step-indicator">' + num + '</div>' +
      '<div class="pipeline-stage-title">' +
      '<h3>' + title + '</h3>' +
      '<div class="stage-subtitle">' + subtitle + '</div>' +
      '</div>' +
      '<span class="pipeline-stage-status" id="status-' + agentKey + '">等待中</span>' +
      (isOutput ? '' : '<div id="' + agentKey + '-actions" style="display:flex;align-items:center;gap:6px;flex-shrink:0"></div>') +
      '<button class="pipeline-stage-toggle" title="折叠/展开">−</button>' +
      '</div>' +
      toolRow +
      '<div class="pipeline-stage-body" id="' + bodyId + '">' +
      (isOutput ? '' : '<div style="display:flex;align-items:flex-start;gap:14px;padding:8px 0"><div style="width:40px;height:40px;border-radius:50%;background:var(--bg-primary);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">' + (num === '1' ? '&#128202;' : num === '2' ? '&#128270;' : '&#9989;') + '</div><div><p style="font-size:0.85rem;color:var(--text-secondary);margin:0">等待执行</p><p style="font-size:0.75rem;color:var(--text-tertiary);margin:4px 0 0">' + subtitle + '</p></div></div>') +
      '</div>' +
      '</section>';
  }

  page.innerHTML =
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
    '<span class="toolbar-label">格式</span>' +
    '<div class="radio-pills" id="wb-format-standard">' +
    '<span class="pill active" data-format="dicom">DICOM</span>' +
    '<span class="pill" data-format="nifti">NIfTI</span>' +
    '</div>' +
    '</div>' +
    '<button class="btn btn-accent" data-action="run-pipeline" data-agent="all" style="font-weight:600;letter-spacing:0.04em;white-space:nowrap;padding:9px 22px;font-size:0.88rem">开始治理 &rarr;</button>' +
    '<div class="toolbar-upload" id="wb-upload">' +
    '<div class="upload-zone" id="upload-zone" data-action="open-file" style="padding:5px 12px;font-size:0.72rem">选择文件</div>' +
    '<input type="file" id="file-input" multiple accept=".zip,.json,.xlsx,.txt,.csv,.nii.gz,.dcm" style="display:none">' +
    '<span class="toolbar-file-list" id="file-list"></span>' +
    '</div>' +
    '</div>' +
    '<div class="toolbar-right">' +
    '<div id="toolbar-export" style="display:none;align-items:center;gap:6px">' +
    '<button class="btn btn-outline btn-sm" data-action="export-zip" style="white-space:nowrap;font-weight:600">导出 ZIP</button>' +
    '<button class="btn btn-accent btn-sm" data-action="goto-dashboard" style="white-space:nowrap;font-weight:600">治理产出 &rarr;</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="toolbar-sub">' +
    '<div id="wb-source-hint" style="font-size:0.65rem;color:var(--text-tertiary)">治理结果即时呈现，可切换至上传模式处理自有数据</div>' +
    '</div>' +
    '</div>' +
    '<div class="wb-main-layout">' +
    '<div class="wb-timeline">' +
    _pipelineStage('1', '数据净化', '文件层去残留 + 字段层格式标准化 · 5 字段 DICOM 元数据清洗', 'agent1', 'var(--accent)') +
    _pipelineStage('2', '报告结构化', '非结构化报告 → 结构化标注 · 规则引擎 + LLM 语义增强', 'agent2', '#B8860B') +
    _pipelineStage('3', '治理验证', '多维评估 — 完整性 · 准确性 · 一致性 · 可用性 + 术语标准化', 'agent3', 'var(--success)') +
    _pipelineStage('4', '治理产出', '双视角输出 — 模型消费数据集 + 人工审查质量报告', 'output', '#6B3FA0', true) +
    '</div>' +
    '<aside class="wb-standards-sidebar collapsed" id="standards-sidebar">' +
    '<div class="standards-sidebar-header">' +
    '<h5>标准框架</h5>' +
    '<button class="standards-sidebar-toggle" data-action="toggle-standards">+</button>' +
    '</div>' +
    '<div class="standards-sidebar-body" id="standards-sidebar-body">' +
    '<div class="so-layer" id="so-layer1"><div class="so-layer-label">图像格式层</div><div class="so-badges"><span class="so-badge dicom">DICOM</span><span class="so-badge nifti">NIfTI</span></div></div>' +
    '<div class="so-layer" id="so-layer2"><div class="so-layer-label">术语编码层</div><div class="so-badges"><span class="so-badge radlex">RadLex</span><span class="so-badge snomed">SNOMED CT</span><span class="so-badge loinc">LOINC</span><span class="so-badge icd10">ICD-10</span></div></div>' +
    '<div class="so-layer" id="so-layer3"><div class="so-layer-label">报告规范层</div><div class="so-badges"><span class="so-badge acr">ACR RADS</span><span class="so-badge dicomsr">DICOM SR</span></div></div>' +
    '</div>' +
    '</aside>' +
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

  page.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== page) {
      var src = el.getAttribute('data-src');
      if (src && el.parentElement && el.parentElement.id === 'wb-source') {
        e.preventDefault();
        switchSource(src, el);
        return;
      }
      var fmt = el.getAttribute('data-format');
      if (fmt && el.parentElement && el.parentElement.id === 'wb-format-standard') {
        e.preventDefault();
        switchFormatStandard(fmt, el);
        return;
      }
      var action = el.getAttribute('data-action');
      if (action === 'open-file') {
        e.preventDefault();
        var fi = document.getElementById('file-input');
        if (fi) fi.click();
        return;
      }
      if (action === 'toggle-stage') {
        e.preventDefault();
        var stg = el.getAttribute('data-stage');
        var bodyEl = document.getElementById(stg === 'output' ? 'body-output' : 'body-' + stg);
        if (bodyEl) bodyEl.classList.toggle('collapsed');
        var btn = el.querySelector('.pipeline-stage-toggle');
        if (btn) btn.textContent = bodyEl && bodyEl.classList.contains('collapsed') ? '+' : '−';
        return;
      }
      if (action === 'toggle-standards') {
        e.preventDefault();
        var sidebar = document.getElementById('standards-sidebar');
        if (sidebar) {
          sidebar.classList.toggle('collapsed');
          var btn = sidebar.querySelector('.standards-sidebar-toggle');
          if (btn) btn.textContent = sidebar.classList.contains('collapsed') ? '+' : '−';
        }
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
            var a2Actions = document.getElementById('agent2-actions');
            if (a2Actions) {
              a2Actions.innerHTML =
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

  // Initialize standards sidebar format highlight
  updateStandardsSidebarFormat(wbState.formatStandard);

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
    // Restore stage status indicators + tool chips
    for (var stageKey in wbState.stageStatus) {
      if (wbState.stageStatus[stageKey] === 'done') {
        setStageStatus(stageKey, 'done');
        // Mark all tools as done for completed stages
        completeAllTools(stageKey);
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

function switchFormatStandard(fmt, el) {
  wbState.formatStandard = fmt;
  var labels = document.querySelectorAll('#wb-format-standard .pill');
  for (var i = 0; i < labels.length; i++) {
    labels[i].classList.remove('active');
  }
  if (el) el.classList.add('active');
  // Update standards sidebar to reflect format choice
  updateStandardsSidebarFormat(fmt);
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
    var ha = document.getElementById(stages[i] + '-actions');
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
      initToolStatus('agent1');
      var anim1 = animateTools('agent1', 250);
            var res1 = await API.runPipeline('agent1', wbState._files, wbState.cleaningMode, false);
      if (res1.status === 'error') throw new Error(res1.message);
      if (res1.cleaned_metadata && res1.cleaned_metadata.length > 0)
        wbState.results.cleaned_metadata = res1.cleaned_metadata;
      if (res1.image_validation)
        wbState.results.image_validation = res1.image_validation;
      completeAllTools('agent1');
      setStageStatus('agent1', 'done');
            renderAgent1Result(wbState.results.cleaned_metadata, wbState.results.image_validation);
    }

    if (stages.indexOf('agent2') !== -1) {
      setStageStatus('agent2', 'running');
      initToolStatus('agent2');
      var anim2 = animateTools('agent2', 250);
            var res2 = await API.runPipeline('agent2', wbState._files, wbState.cleaningMode, false);
      if (res2.status === 'error') throw new Error(res2.message);
      if (res2.annotations && Object.keys(res2.annotations).length > 0)
        wbState.results.annotations = res2.annotations;
      completeAllTools('agent2');
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
      initToolStatus('agent3');
      var anim3 = animateTools('agent3', 250);
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
      completeAllTools('agent3');
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
    initToolStatus('agent1');
    var anim1 = animateTools('agent1', 120);
        wbState.results.cleaned_metadata = await API.getDemoData('cleaned_metadata', wbState.cleaningMode);
    try { wbState.results.image_validation = await API.getDemoData('image_validation'); } catch(e) {}
    completeAllTools('agent1');
    setStageStatus('agent1', 'done');
        renderAgent1Result(wbState.results.cleaned_metadata, wbState.results.image_validation);
  }

  if (stages.indexOf('agent2') !== -1) {
    setStageStatus('agent2', 'running');
    initToolStatus('agent2');
    var anim2 = animateTools('agent2', 120);
        wbState.results.annotations = await API.getDemoData('annotations', wbState.cleaningMode);
    completeAllTools('agent2');
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
    initToolStatus('agent3');
    var anim3 = animateTools('agent3', 120);
    // Fire fetches in parallel with progress animation
    var qPromise = API.getDemoData('quality_report', wbState.cleaningMode);
    var cPromise = API.getDemoData('classifications', wbState.cleaningMode);
    await showStage3Progress();
    var qr = await qPromise;
    var cl = await cPromise;
    wbState.results.quality_report = qr;
    wbState.results.classifications = cl;
    completeAllTools('agent3');
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
    el.className = 'pipeline-stage-status ' + status;
  }

  // Toggle pipeline stage border class
  var card = document.getElementById('stage-' + stage);
  if (card) {
    card.classList.remove('running', 'done', 'error');
    if (status === 'running') card.classList.add('running');
    if (status === 'done') { card.classList.add('done'); }
    if (status === 'error') card.classList.add('error');
  }

  // Standards sidebar: highlight relevant layer during stage execution
  updateStandardsSidebar(stage, status);

  // Show export section when all 3 agents done
  if (status === 'done') {
    var allDone = wbState.stageStatus.agent1 === 'done' && wbState.stageStatus.agent2 === 'done' && wbState.stageStatus.agent3 === 'done';
    if (allDone) {
      var exportEl = document.getElementById('toolbar-export');
      if (exportEl) exportEl.style.display = 'flex';
    }
  }
}

function updateStandardsSidebar(stage, status) {
  var sidebar = document.getElementById('standards-sidebar');
  if (!sidebar) return;

  var layerMap = { agent1: 'so-layer1', agent2: 'so-layer3', agent3: 'so-layer2' };
  var allLayers = ['so-layer1', 'so-layer2', 'so-layer3'];

  for (var i = 0; i < allLayers.length; i++) {
    var layer = document.getElementById(allLayers[i]);
    if (!layer) continue;
    var highlight = status === 'running' && allLayers[i] === layerMap[stage];
    layer.classList.toggle('highlight', highlight);
    var badges = layer.querySelectorAll('.so-badge');
    for (var j = 0; j < badges.length; j++) {
      badges[j].classList.toggle('on', highlight);
    }
  }
}

function updateStandardsSidebarFormat(fmt) {
  // Highlight the selected format badge in Layer 1, dim the other
  var layer1 = document.getElementById('so-layer1');
  if (!layer1) return;
  var badges = layer1.querySelectorAll('.so-badge');
  for (var j = 0; j < badges.length; j++) {
    var badgeFmt = '';
    if (badges[j].classList.contains('dicom')) badgeFmt = 'dicom';
    else if (badges[j].classList.contains('nifti')) badgeFmt = 'nifti';
    badges[j].classList.toggle('on', badgeFmt === fmt);
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
  document.getElementById('agent1-actions').innerHTML =
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
  var totalChecked = 0, totalCompliant = 0, totalViolations = 0;
  var fieldOrder = ['PatientAge','PatientSex','Manufacturer','RescaleIntercept','RescaleSlope'];
  var fieldLabel = { PatientAge:'年龄',PatientSex:'性别',Manufacturer:'厂商',RescaleIntercept:'截距(HU)',RescaleSlope:'斜率' };
  for (var i = 0; i < meta.length; i++) {
    var rec = meta[i];
    var acc = rec._accession_no || '';
    if (!acc || seen[acc]) continue;
    seen[acc] = true;
    var vr = rec._dicom_vr || {};
    var cells = '';
    for (var f = 0; f < fieldOrder.length; f++) {
      var fn = fieldOrder[f];
      var check = vr[fn] || {};
      var compliant = check.compliant !== false;
      totalChecked++;
      if (compliant) totalCompliant++; else totalViolations++;
      var badge = compliant ? '<span style="color:var(--success);font-weight:700">&#10003;</span>' : '<span style="color:var(--fail);font-weight:700">&#10007;</span>';
      cells += '<td style="text-align:center">' +
        '<div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-primary)">' + (rec[fn] || '-') + '</div>' +
        '<div style="font-size:0.62rem;color:var(--text-tertiary);margin-top:1px">' + (check.vr || '?') + '</div>' +
        '<div style="margin-top:2px">' + badge + '</div>' +
        '</td>';
    }
    metaRows += '<tr><td style="font-weight:600">' + acc + '</td>' + cells + '</tr>';
  }

  document.getElementById('body-agent1').innerHTML =
    imgSection +
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
    '<span style="font-size:0.75rem;color:var(--text-tertiary)">' + meta.length + ' 条 CT 记录 ' + String.fromCharCode(183) + ' ' + Object.keys(accSet).length + ' 个病例 ' + String.fromCharCode(183) + ' ' + withImages + ' 个影像关联</span>' +
    '</div>' +
    '<div style="overflow-x:auto">' +
    '<div style="margin-bottom:12px;padding:10px 14px;background:#EEF2FB;border:1px solid #D0DBF0;border-radius:6px;font-size:0.78rem;display:flex;align-items:center;gap:20px;flex-wrap:wrap">' +
    '<span style="font-weight:700;color:var(--accent)">DICOM VR 合规校验</span>' +
    '<span style="color:var(--text-secondary)"><span style="font-weight:700;font-family:var(--font-mono)">' + totalChecked + '</span> 字段已检查</span>' +
    '<span style="color:var(--success);font-weight:600"><span style="font-family:var(--font-mono)">' + totalCompliant + '</span> 合规</span>' +
    (totalViolations > 0 ? '<span style="color:var(--fail);font-weight:600"><span style="font-family:var(--font-mono)">' + totalViolations + '</span> 违规</span>' : '<span style="color:var(--success)">零违规</span>') +
    '</div>' +
    '<table class="compare-table"><thead><tr>' +
    '<th>检查号</th>' +
    '<th>年龄 (AS)</th><th>性别 (CS)</th><th>厂商 (LO)</th><th>截距 (DS)</th><th>斜率 (DS)</th>' +
    '</tr></thead>' +
    '<tbody>' + metaRows + '</tbody></table>' +
    '<div style="margin-top:6px;font-size:0.65rem;color:var(--text-tertiary);line-height:1.6">' +
    '依据 DICOM PS3.5 §6.2: AS=Age String(nnnX), CS=Code String(枚举), DS=Decimal String(浮点), LO=Long String(≤64字符) ' + String.fromCharCode(183) +
    ' PS3.3 §C.7.1.1: PatientSex 枚举值 M/F/O ' + String.fromCharCode(183) +
    ' PS3.3 §C.11.1.1.1: RescaleIntercept/Slope DS 型' +
    '</div></div>' +
    '<div style="margin-top:10px">' +
    '<span style="font-size:0.8rem;color:var(--text-secondary)">共校验 ' + meta.length + ' 条元数据记录，全部通过 DICOM 合规检查</span>' +
    '</div>';
}

function renderAgent2Result(anns) {
  setStageStatus('agent2', 'done');

  var hasLLM = wbState.results && wbState.results.llm_structured;
  var actionsHtml = '<button class="btn btn-outline btn-sm" data-action="download" data-download="annotations" style="font-size:0.78rem;padding:6px 14px;font-weight:500">导出 JSON</button>';
  if (hasLLM) {
    actionsHtml = '<button class="btn btn-outline btn-sm" data-action="run-llm" style="font-size:0.78rem;padding:6px 14px;font-weight:500">重新 LLM 分析</button>' + actionsHtml;
  }
  document.getElementById('agent2-actions').innerHTML = actionsHtml;
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
  document.getElementById('agent3-actions').innerHTML =
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
        var hdr2 = document.getElementById('agent2-actions');
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
  if (exportEl) exportEl.style.display = 'flex';

  // Set output stage as done
  var outStage = document.getElementById('stage-output');
  if (outStage) {
    outStage.classList.add('done');
    var outStatus = document.getElementById('status-output');
    if (outStatus) { outStatus.textContent = '✓ 完成'; outStatus.className = 'pipeline-stage-status done'; }
  }

  // Render dual-tab output into Step 4
  var outBody = document.getElementById('body-output');
  if (!outBody) return;

  outBody.innerHTML =
    '<div style="display:flex;justify-content:center;margin-bottom:24px">' +
    '<div class="mode-toggle">' +
    '<button class="mode-btn active" id="wb-out-model-btn">模型消费输出</button>' +
    '<button class="mode-btn" id="wb-out-human-btn">人工审查输出</button>' +
    '</div></div>' +
    '<div id="wb-output-model" style="min-height:200px"></div>' +
    '<div id="wb-output-human" style="display:none"></div>';

  // Render model consumption summary
  renderWBModelOutput();

  // Setup mode toggle listeners
  var btnM = document.getElementById('wb-out-model-btn');
  var btnH = document.getElementById('wb-out-human-btn');
  if (btnM) {
    btnM.addEventListener('click', function() {
      btnM.classList.add('active'); btnH.classList.remove('active');
      document.getElementById('wb-output-model').style.display = '';
      document.getElementById('wb-output-human').style.display = 'none';
    });
  }
  if (btnH) {
    btnH.addEventListener('click', function() {
      btnH.classList.add('active'); btnM.classList.remove('active');
      document.getElementById('wb-output-human').style.display = '';
      document.getElementById('wb-output-model').style.display = 'none';
      renderWBHumanOutput();
    });
  }
}

function renderWBModelOutput() {
  var el = document.getElementById('wb-output-model');
  if (!el) return;

  var pr = wbState.results || {};
  var metaCount = (pr.cleaned_metadata || []).length;
  var annCount = Object.keys(pr.annotations || {}).length;
  var clsCount = Object.keys(pr.classifications || {}).length;
  var hasLLM = pr.llm_structured && Object.keys(pr.llm_structured).length > 0;

  el.innerHTML =
    '<div class="kpi-grid" style="margin-bottom:16px">' +
    '<div class="kpi-card"><div class="data-label">元数据记录</div><div class="data-value">' + metaCount + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">报告结构化</div><div class="data-value">' + annCount + '</div></div>' +
    '<div class="kpi-card"><div class="data-label">疾病分类</div><div class="data-value">' + clsCount + '</div></div>' +
    '<div class="kpi-card ' + (hasLLM ? 'pass' : '') + '"><div class="data-label">LLM 增强</div><div class="data-value">' + (hasLLM ? '已启用' : '未启用') + '</div></div>' +
    '</div>' +
    '<div class="output-cards" style="margin-top:16px">' +
    '<div class="output-card model"><h4>模型消费输出</h4>' +
    '<p style="font-size:0.72rem;color:var(--text-tertiary);margin-bottom:8px">机器可直接读取的结构化数据格式</p>' +
    '<div class="output-items">' +
    '<span class="output-item">NIfTI 图像 (.nii.gz)</span>' +
    '<span class="output-item">结构化发现 JSON</span>' +
    '<span class="output-item">术语映射 RadLex+SNOMED</span>' +
    '<span class="output-item">元数据语义映射</span>' +
    '<span class="output-item">核类型标准化</span>' +
    '<span class="output-item">患者索引 CSV</span>' +
    '</div></div>' +
    '<div class="output-card human"><h4>人工审查输出</h4>' +
    '<p style="font-size:0.72rem;color:var(--text-tertiary);margin-bottom:8px">面向质控人员的可视化质量报告</p>' +
    '<div class="output-items">' +
    '<span class="output-item">探针诊断报告</span>' +
    '<span class="output-item">字段完整性校验</span>' +
    '<span class="output-item">空间对齐校验</span>' +
    '<span class="output-item">PHI 隐私合规扫描</span>' +
    '<span class="output-item">四维质量评估</span>' +
    '</div></div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:16px">' +
    '<button class="btn btn-accent" data-nav="dashboard" style="font-size:0.85rem">查看完整治理产出 &rarr;</button>' +
    '</div>';
}

function renderWBHumanOutput() {
  var el = document.getElementById('wb-output-human');
  if (!el) return;

  // Load patient assessments for mini view
  API.getDemoData('per_patient_assessments').then(function(data) {
    if (!data) { el.innerHTML = '<p style="color:var(--text-tertiary);padding:24px;text-align:center">评估数据加载中...</p>'; return; }
    var pids = Object.keys(data).sort();
    var html = '<h4 style="font-size:0.85rem;margin-bottom:16px">患者质量评估摘要</h4><div class="assessment-grid">';

    for (var i = 0; i < pids.length; i++) {
      var a = data[pids[i]];
      var dims = a.four_dimensions || {};
      var grade = a.quality_grade || '';
      var gradeClass = 'grade-b';
      if (grade.indexOf('A') === 0) gradeClass = 'grade-a';
      else if (grade.indexOf('C') === 0) gradeClass = 'grade-c';

      html += '<div class="assessment-card">' +
        '<div class="assessment-card-header">' +
        '<span class="pid">' + pids[i] + '</span>' +
        '<span class="grade-badge ' + gradeClass + '">' + (a.overall_quality_score || '—') + ' ' + (grade || '') + '</span>' +
        '</div>' +
        '<div class="assessment-card-body">';

      var dimKeys = ['completeness', 'consistency', 'accuracy', 'usability'];
      var dimNames = ['完整性', '一致性', '准确性', '可用性'];
      for (var d = 0; d < dimKeys.length; d++) {
        var dim = dims[dimKeys[d]] || {};
        var score = dim.score || 0;
        var fillColor = score >= 85 ? 'var(--success)' : score >= 75 ? 'var(--accent)' : score >= 65 ? '#B8860B' : 'var(--fail)';
        html += '<div class="dimension-mini">' +
          '<span class="dimension-mini-label">' + dimNames[d] + '</span>' +
          '<div class="dimension-mini-bar"><div class="dimension-mini-fill" style="width:' + score + '%;background:' + fillColor + '"></div></div>' +
          '<span class="dimension-mini-score">' + score + '</span></div>';
      }

      html += '</div></div>';
    }

    html += '</div>' +
      '<div style="text-align:center;margin-top:16px">' +
      '<button class="btn btn-accent" data-nav="dashboard" style="font-size:0.85rem">查看完整人工审查报告 &rarr;</button>' +
      '</div>';

    el.innerHTML = html;
  }).catch(function() {
    el.innerHTML = '<p style="color:var(--text-tertiary);padding:24px;text-align:center">评估数据暂不可用，请前往仪表盘查看</p>';
  });
}
