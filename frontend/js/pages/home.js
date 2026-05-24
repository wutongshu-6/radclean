function renderHome() {
  var page = document.getElementById('page-home');
  if (!page) return;

  page.innerHTML =
    '<div class="container">' +
    '<div class="hero animate-in">' +
    '<h1>RadClean</h1>' +
    '<p class="tagline">放射科 CT 数据治理平台&ensp;&mdash;&ensp;轻量化&ensp;&middot;&ensp;可解释&ensp;&middot;&ensp;医学原生</p>' +
    '<div class="cta-group">' +
    '<button class="btn btn-accent" data-nav="workspace">开始治理</button>' +
    '<button class="btn btn-outline" data-nav="about">了解我们</button>' +
    '</div>' +
    '</div>' +

    '<p class="home-intro">三阶段治理管线，从原始 DICOM 数据到标准化科研数据集，全流程自动化</p>' +

    '<div class="agent-grid">' +
    '<div class="agent-card animate-in stagger-1">' +
    '<div class="agent-num">1</div><div class="agent-tech">规则引擎</div><h3>数据净化</h3>' +
    '<div class="agent-layers">文件层：去残留 · 统一命名 · 校验完整性<br>字段层：年龄 · 性别 · 厂商 · HU 参数</div>' +
    '</div>' +
    '<div class="agent-card animate-in stagger-2">' +
    '<div class="agent-num">2</div><div class="agent-tech">规则引擎 + 可选 LLM</div><h3>报告结构化</h3>' +
    '<div class="agent-layers">结构层：自由文本 &rarr; 结构化 JSON<br>内容层：21 疾病 · 50+ 解剖部位 · 30+ 修饰词</div>' +
    '</div>' +
    '<div class="agent-card animate-in stagger-3">' +
    '<div class="agent-num">3</div><div class="agent-tech">模糊匹配 + 规则校验</div><h3>治理验证</h3>' +
    '<div class="agent-layers">关系层：跨源一致性校验<br>标准化层：术语 &rarr; RadLex 标准词表</div>' +
    '</div>' +
    '</div>' +

    '<div class="metrics-bar animate-in stagger-4">' +
    '<div class="metric"><div><span class="metric-before">58%</span><span class="metric-arrow">&rarr;</span><span class="metric-after">100%</span></div><div class="metric-label">有效文件占比</div></div>' +
    '<div class="metric"><div><span class="metric-before">0%</span><span class="metric-arrow">&rarr;</span><span class="metric-after">100%</span></div><div class="metric-label">报告结构化率</div></div>' +
    '<div class="metric"><div><span class="metric-before">3+ 种</span><span class="metric-arrow">&rarr;</span><span class="metric-after">1 标准术语</span></div><div class="metric-label">术语一致性</div></div>' +
    '<div class="metric"><div><span class="metric-before">&mdash;</span><span class="metric-arrow">&rarr;</span><span class="metric-after">0.887</span></div><div class="metric-label">综合质量评分</div></div>' +
    '</div>' +
    '</div>';
}
