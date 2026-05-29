function renderHome() {
  var page = document.getElementById('page-home');
  if (!page) return;

  page.innerHTML =
    '<div class="container">' +
    // Hero
    '<div class="hero animate-in">' +
    '<h1>RadClean</h1>' +
    '<p class="tagline">放射科 CT 数据治理平台&ensp;&mdash;&ensp;轻量化&ensp;&middot;&ensp;可解释&ensp;&middot;&ensp;医学原生</p>' +
    '<p style="font-size:0.82rem;color:var(--text-tertiary);margin-top:4px;">基于 Dify 3-Agent 协同管线 + 三层国际标准框架</p>' +
    '<div class="cta-group">' +
    '<button class="btn btn-accent" data-nav="workspace">开始治理</button>' +
    '<button class="btn btn-outline" data-nav="about">了解我们</button>' +
    '</div>' +
    '</div>' +

    // Standards Framework Band
    '<h3 style="font-size:0.85rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0;">国际标准框架</h3>' +
    '<div class="standards-band animate-in stagger-1">' +
    // Layer 1: DICOM + NIfTI (parallel)
    '<div class="standards-layer">' +
    '<div class="standards-layer-title">图像数据格式与传输层</div>' +
    '<div class="standards-items">' +
    '<span class="standard-badge dicom">DICOM<br><small>ISO 12052</small></span>' +
    '<span class="standard-badge nifti">NIfTI<br><small>.nii.gz</small></span>' +
    '</div>' +
    '<span class="relation-text parallel">两条并行路径 · 完全互补</span>' +
    '</div>' +
    // Layer 2: RadLex + SNOMED CT + LOINC + ICD-10 (complementary)
    '<div class="standards-layer">' +
    '<div class="standards-layer-title">术语与编码层</div>' +
    '<div class="standards-items">' +
    '<span class="standard-badge radlex">RadLex</span>' +
    '<span class="standard-badge snomed">SNOMED CT</span>' +
    '<span class="standard-badge loinc">LOINC</span>' +
    '<span class="standard-badge icd10">ICD-10</span>' +
    '</div>' +
    '<span class="relation-text complement">同时使用 · 相互补充</span>' +
    '</div>' +
    // Layer 3: ACR RADS + DICOM SR (complementary)
    '<div class="standards-layer">' +
    '<div class="standards-layer-title">报告规范层</div>' +
    '<div class="standards-items">' +
    '<span class="standard-badge acr">ACR RADS<br><small>Lung-RADS / LI-RADS</small></span>' +
    '<span class="standard-badge dicomsr">DICOM SR<br><small>结构化报告</small></span>' +
    '</div>' +
    '<span class="relation-text complement">内容 + 格式协同 · 相互补充</span>' +
    '</div>' +
    '</div>' +

    // Intro
    '<p class="home-intro">3-Agent Dify 协同管线，从原始 CT 数据到标准化科研数据集，全流程自动化</p>' +

    // Pipeline Architecture Diagram
    '<div class="pipeline-flow animate-in stagger-2">' +
    // Agent 1
    '<div class="pipeline-agent-box">' +
    '<h4>Agent 1</h4><div class="agent-subtitle">数据清洗与校验</div>' +
    '<div class="tool-list">' +
    '<span class="tool-mini">Tool1.1 探针扫描</span>' +
    '<span class="tool-mini">Tool1.2 macOS清理</span>' +
    '<span class="tool-mini">Tool1.3 后缀修复</span>' +
    '<span class="tool-mini">Tool1.4 字段标准化</span>' +
    '<span class="tool-mini">Tool1.5 HU还原</span>' +
    '<span class="tool-mini">Tool1.6 完整性校验</span>' +
    '<span class="tool-mini">Tool1.7 空间对齐</span>' +
    '<span class="tool-mini">Tool1.8 PHI扫描</span>' +
    '<span class="tool-mini">Tool1.10 患者索引</span>' +
    '</div>' +
    '</div>' +
    '<span class="pipeline-arrow">&rarr;</span>' +
    // Agent 2
    '<div class="pipeline-agent-box">' +
    '<h4>Agent 2</h4><div class="agent-subtitle">报告结构化提取</div>' +
    '<div class="tool-list">' +
    '<span class="tool-mini">Tool2.1 规则提取</span>' +
    '<span class="tool-mini">Tool2.2 否定检测</span>' +
    '<span class="tool-mini">Tool2.2 时序变化</span>' +
    '<span class="tool-mini">Tool2.2 隐含发现</span>' +
    '</div>' +
    '</div>' +
    '<span class="pipeline-arrow">&rarr;</span>' +
    // Agent 3
    '<div class="pipeline-agent-box">' +
    '<h4>Agent 3</h4><div class="agent-subtitle">语义层编码统一</div>' +
    '<div class="tool-list">' +
    '<span class="tool-mini">Tool3.1 术语标准化</span>' +
    '<span class="tool-mini">Tool3.3 核类型标准化</span>' +
    '</div>' +
    '</div>' +
    '<span class="pipeline-arrow">&rarr;</span>' +
    // Output branches
    '<div class="pipeline-output-branch">' +
    '<div class="pipeline-output-item model"><strong>模型消费输出</strong><br><small>JSON · NIfTI · CSV</small></div>' +
    '<div class="pipeline-output-item human"><strong>人工审查输出</strong><br><small>雷达图 · 柱状图 · 热力图</small></div>' +
    '</div>' +
    '</div>' +

    // Dual Output Cards
    '<h3 style="font-size:0.85rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.08em;">治理产出</h3>' +
    '<div class="output-cards animate-in stagger-3">' +
    '<div class="output-card model">' +
    '<h4>模型消费输出</h4>' +
    '<p style="font-size:0.72rem;color:var(--text-tertiary);margin-bottom:8px;">机器可直接读取和计算的结构化数据</p>' +
    '<div class="output-items">' +
    '<span class="output-item">NIfTI 图像 (.nii.gz)</span>' +
    '<span class="output-item">结构化发现 JSON</span>' +
    '<span class="output-item">术语映射 RadLex+SNOMED</span>' +
    '<span class="output-item">元数据语义映射</span>' +
    '<span class="output-item">核类型标准化字典</span>' +
    '<span class="output-item">患者索引 CSV</span>' +
    '</div>' +
    '</div>' +
    '<div class="output-card human">' +
    '<h4>人工审查输出</h4>' +
    '<p style="font-size:0.72rem;color:var(--text-tertiary);margin-bottom:8px;">面向质控人员的数据质量可视化报告</p>' +
    '<div class="output-items">' +
    '<span class="output-item">探针诊断报告</span>' +
    '<span class="output-item">字段完整性校验</span>' +
    '<span class="output-item">空间对齐校验</span>' +
    '<span class="output-item">PHI 隐私合规扫描</span>' +
    '<span class="output-item">标注文件校验</span>' +
    '<span class="output-item">四维质量评估</span>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // Metrics Bar
    '<div class="metrics-bar animate-in stagger-4">' +
    '<div class="metric"><div><span class="metric-before">58%</span><span class="metric-arrow">&rarr;</span><span class="metric-after">100%</span></div><div class="metric-label">有效文件占比</div></div>' +
    '<div class="metric"><div><span class="metric-before">0%</span><span class="metric-arrow">&rarr;</span><span class="metric-after">100%</span></div><div class="metric-label">报告结构化率</div></div>' +
    '<div class="metric"><div><span class="metric-before">3+ 种</span><span class="metric-arrow">&rarr;</span><span class="metric-after">10 术语</span></div><div class="metric-label">术语映射覆盖率</div></div>' +
    '<div class="metric"><div><span class="metric-before">&mdash;</span><span class="metric-arrow">&rarr;</span><span class="metric-after">82.5</span></div><div class="metric-label">综合质量评分 (B+)</div></div>' +
    '</div>' +
    '</div>';
}
