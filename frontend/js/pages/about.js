function renderAbout() {
  const page = document.getElementById('page-about');
  if (!page) return;

  page.innerHTML = `
    <div class="container">
      <div class="about-hero animate-in">
        <h1>关于 RadClean</h1>
        <p class="text-secondary">面向放射科 CT 数据的轻量化数据治理平台</p>
      </div>

      <div class="section animate-in stagger-1">
        <div class="section-header"><h3>平台定位</h3></div>
        <div class="card">
          <p style="font-size:0.9rem;line-height:1.9;color:var(--text-secondary)">
            RadClean 是一站式放射科 CT 数据治理平台，专为多中心、异构 DICOM 数据场景设计。
            无需训练、无需标注、开箱即用——从原始数据包到标准化科研数据集，全流程自动化。
            平台以<strong>规则引擎为骨干、LLM 为增强</strong>，兼顾确定性与灵活性，
            让医学数据治理变得轻量、可解释、可复现。
          </p>
        </div>
      </div>

      <div class="section animate-in stagger-2">
        <div class="section-header"><h3>治理架构</h3></div>
        <div class="arch-diagram">
          <div class="arch-node">原始数据包<br><span class="text-tertiary">.nii.gz · .xlsx · .txt</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node core">Stage 1<br>数据净化<br><span class="text-tertiary">规则引擎</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node core">Stage 2<br>报告结构化<br><span class="text-tertiary">规则引擎 + 可选 LLM</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node core">Stage 3<br>治理验证<br><span class="text-tertiary">规则校验</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node">治理后数据<br><span class="text-tertiary">JSON · CSV · 术语表</span></div>
        </div>
      </div>

      <div class="section animate-in stagger-3">
        <div class="section-header"><h3>三阶段治理流程</h3></div>
        <div class="card" style="margin-bottom:24px">
          <div style="display:flex;flex-direction:column;gap:16px;font-size:0.88rem;line-height:1.8">
            <div><strong>Stage 1 · 数据净化</strong> — 文件层与字段层治理。清理残留文件、统一命名规范、校验影像完整性；标准化年龄、性别、厂商名称、HU 参数等 DICOM 元数据字段。这是治理的基础。</div>
            <div><strong>Stage 2 · 报告结构化</strong> — 结构与语义层治理。自由文本报告本质也是"脏数据"——同一种疾病可能有几十种写法。Stage 2 将非结构化自然语言转化为结构化、可查询、可统计的标注结果，覆盖 21 类疾病、50+ 解剖部位、30+ 修饰词，并内置否定检测。</div>
            <div><strong>Stage 3 · 治理验证</strong> — 关系与标准层治理。治理完成需要验证：清洗是否完整？标注是否准确？术语是否统一？Stage 3 从完整性、准确性、一致性、可用性四个维度给出量化评分，并将术语映射至 RadLex 标准词表，形成治理闭环。</div>
          </div>
          <p style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);font-size:0.82rem;color:var(--accent);font-weight:600">Stage 1 让数据干净，Stage 2 让数据可用，Stage 3 证明治理到位。</p>
        </div>
        <div class="section-header"><h3>技术特色</h3></div>
        <div class="card">
          <p style="font-size:0.9rem;line-height:2;color:var(--text-secondary)">
            <strong>轻量化：</strong>基于 Python 规则引擎，无需 GPU 训练、无需标注数据，开箱即用。<br>
            <strong>可解释：</strong>每条清洗规则、每个实体标注均有明确的逻辑溯源，非黑箱操作。<br>
            <strong>医学原生：</strong>内置 RadLex 标准术语库（71 条），中英双语，支持模糊匹配与变体归一。<br>
            <strong>LLM 增强：</strong>可选 AI 模块提供 13 字段深度结构化与智能治理总结，规则引擎不依赖 LLM 也可独立运行。<br>
            <strong>质量闭环：</strong>四维量化评分 + 语义抽查 + 治理总结，形成从治理到验证的完整证据链。
          </p>
        </div>
      </div>
    </div>`;
}
