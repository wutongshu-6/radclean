function renderAbout() {
  const page = document.getElementById('page-about');
  if (!page) return;

  page.innerHTML = `
    <div class="container">
      <div class="about-hero animate-in">
        <h1>关于 RadClean</h1>
        <p class="text-secondary">面向放射科 CT 数据的轻量化数据治理平台 · 基于 Dify 3-Agent 协同管线</p>
      </div>

      <div class="section animate-in stagger-1">
        <div class="section-header"><h3>平台定位</h3></div>
        <div class="card">
          <p style="font-size:0.9rem;line-height:1.9;color:var(--text-secondary)">
            RadClean 是一站式放射科 CT 数据治理平台。原始 CT 数据包经过
            <strong>文件层预处理</strong>、<strong>元数据标准化</strong>、<strong>报告结构化提取</strong>和
            <strong>语义层编码统一</strong>四道工序，最终产出两份数据：面向 AI 模型的
            <strong>结构化数据集</strong>，以及面向质控人员的<strong>可视化质量报告</strong>。
            平台基于 Dify Chatflow 编排，3 个 Agent 串联 14 个 Tool，LLM 通过 Function Calling
            机制自主决策调用，兼顾确定性与灵活性。
          </p>
        </div>
      </div>

      <div class="section animate-in stagger-2">
        <div class="section-header"><h3>技术架构</h3></div>
        <div class="arch-diagram">
          <div class="arch-node">原始数据包<br><span class="text-tertiary">压缩包上传</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node core">Agent 1<br>数据清洗与校验<br><span class="text-tertiary">9 个 Tool</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node core">Agent 2<br>报告结构化提取<br><span class="text-tertiary">2 个 Tool</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node core">Agent 3<br>语义层编码统一<br><span class="text-tertiary">2 个 Tool</span></div>
          <div class="arch-arrow">&rarr;</div>
          <div class="arch-node">双输出<br><span class="text-tertiary">模型消费 · 人工审查</span></div>
        </div>
      </div>

      <div class="section animate-in stagger-3">
        <div class="section-header"><h3>3-Agent 协同管线</h3></div>
        <div class="card" style="margin-bottom:24px">
          <div style="display:flex;flex-direction:column;gap:16px;font-size:0.88rem;line-height:1.8">

            <div><strong>Agent 1 · 数据清洗与校验</strong> — 文件层 + 字段层 + 校验层三重治理。
            探针扫描获取全局状态后，依次执行 macOS 残留文件清理、双重后缀修复、零字节检测、
            五字段格式标准化（年龄/性别/厂商/Rescale 参数）、HU 值还原、
            完整性校验、空间对齐校验、PHI 隐私扫描、患者索引构建。
            此阶段全部由确定性规则引擎执行，LLM 仅负责阅读诊断报告并决策 Tool 调用顺序。</div>

            <div><strong>Agent 2 · 报告结构化提取</strong> — 规则引擎 + LLM 双层提取。
            第一层规则引擎以零推理成本完成高覆盖率确定性提取（患者 ID、核类型、解剖部位、病灶尺寸）；
            第二层 LLM 执行否定语义检测（纠正规则误提取的假阳性）、时序变化提取
            （跨时间维度变化类型、参考日期、既往尺寸）和隐含发现推理（结合临床知识推断可疑诊断）。
            输出为四级结构化 JSON，包含 anatomy、finding、characteristics、severity、negation、temporal 等字段。</div>

            <div><strong>Agent 3 · 语义层编码统一</strong> — 术语标准化 + 核类型标准化。
            术语标准化将自由文本 anatomy 和 finding 字段映射到 RadLex + SNOMED CT 双编码体系，
            支持中文同义表达识别、跨语言直接对齐、否定语义保留、置信度分级；
            核类型标准化将异构厂商核编码统一为标准核描述
            （标准编码/核家族/锐利度等级/适用部位），并自动推断跨厂商临床等价关系。</div>

          </div>
          <p style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);font-size:0.82rem;color:var(--accent);font-weight:600">
            Agent 1 让数据干净，Agent 2 让报告可用，Agent 3 让语义统一 —— 三者串行协同，形成完整治理闭环。
          </p>
        </div>

        <div class="section-header"><h3>Dify Chatflow 编排</h3></div>
        <div class="card" style="margin-bottom:24px">
          <p style="font-size:0.88rem;line-height:2;color:var(--text-secondary)">
            Agent1 &rarr; Agent2 &rarr; Agent3 严格串行执行，中间数据由 Dify 自动传递。用户上传压缩包后，
            Agent1 执行探针扫描，诊断报告数秒内返回前端展示数据全貌；用户确认后依次执行清洗+校验步骤，
            状态通过 WebSocket 实时推送。Agent1 完成后自动触发 Agent2（规则引擎 &rarr; LLM 语义增强），
            再自动触发 Agent3（术语标准化 &rarr; 质量评估），最终输出可视化综合评估报告。
            <br><br>
            <strong>五种异常处理：</strong>Tool 执行失败自动重试三次、输出格式异常容错修复、
            API 超时限流指数退避重试、用户取消优雅终止、任务中断后可从数据库持久化状态恢复。
          </p>
        </div>

        <div class="section-header"><h3>技术特色</h3></div>
        <div class="card">
          <p style="font-size:0.9rem;line-height:2;color:var(--text-secondary)">
            <strong>轻量化：</strong>基于 Python 规则引擎 + Dify Tool 函数，无需 GPU 训练、无需标注数据，开箱即用。<br>
            <strong>可解释：</strong>每条清洗规则、每个实体标注均有明确的 Tool 溯源，探针报告可视化呈现全链路决策依据。<br>
            <strong>标准驱动：</strong>内置三层国际标准体系 — DICOM/NIfTI（格式层）、RadLex+SNOMED CT+LOINC+ICD-10（编码层）、ACR RADS+DICOM SR（报告层），中英双语，双编码并行。<br>
            <strong>LLM 增强：</strong>LLM 通过 Function Calling 自主决策 Tool 调用，不做硬编码 if-else，规则引擎不依赖 LLM 也可独立运行。<br>
            <strong>质量闭环：</strong>四维量化评分（完整性/一致性/准确性/可用性）+ 语义抽查 + 治理总结，形成从治理到验证的完整证据链。<br>
            <strong>双输出设计：</strong>模型消费输出（JSON/NIfTI/CSV）直接对接 AI 训练管线；人工审查输出（雷达图/热力图/对比表）辅助数据质控决策。
          </p>
        </div>
      </div>
    </div>`;
}
