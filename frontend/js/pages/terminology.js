var termData = [];
var termFilter = 'all';
var standardsView = 'radlex'; // radlex | kernel | crossref

async function renderTerminology() {
  var page = document.getElementById('page-terminology');
  if (!page) return;

  // Three-layer standards framework + search/filter + table
  var html =
    '<div class="container">' +
    '<div class="section-header"><h2>标准体系参考</h2><p class="text-secondary" style="font-size:0.85rem">三大层级国际标准 — 图像格式层 · 术语编码层 · 报告规范层</p></div>' +

    // === Three-layer standards cards ===
    '<div class="standards-layer-grid" style="margin-top:var(--space-lg)">' +

    // Layer 1
    '<div class="standards-layer-card">' +
    '<div class="standards-layer-card-header">图像数据格式与传输层</div>' +
    '<div class="standards-layer-card-body">' +
    '<div class="standard-row"><span class="std-name">DICOM</span><span class="std-desc">ISO 12052，面向临床 PACS 存储传输，定义 Tag 字典、HU 校准参数</span></div>' +
    '<div class="standard-row"><span class="std-name">NIfTI</span><span class="std-desc">科研 AI 主流格式，内置 4×4 仿射矩阵，dcm2niix 转换获得</span></div>' +
    '<p style="margin-top:8px;font-size:0.72rem;color:var(--success);font-weight:600">无功能重叠，完全互补 — 可做并行的两条路</p>' +
    '</div></div>' +

    // Layer 2
    '<div class="standards-layer-card">' +
    '<div class="standards-layer-card-header">术语与编码层</div>' +
    '<div class="standards-layer-card-body">' +
    '<div class="standard-row"><span class="std-name">RadLex</span><span class="std-desc">放射影像专属征象术语，RID 编码，统一磨玻璃影、分叶征等描述</span></div>' +
    '<div class="standard-row"><span class="std-name">SNOMED CT</span><span class="std-desc">全临床通用概念，与 RadLex 双向映射，双编码并行</span></div>' +
    '<div class="standard-row"><span class="std-name">LOINC</span><span class="std-desc">检查项目/生理指标编码，回答"测了什么"</span></div>' +
    '<div class="standard-row"><span class="std-name">ICD-10</span><span class="std-desc">疾病大类分类，与精细征象互补</span></div>' +
    '<p style="margin-top:8px;font-size:0.72rem;color:var(--accent);font-weight:600">都要同时使用，相互补充</p>' +
    '</div></div>' +

    // Layer 3
    '<div class="standards-layer-card">' +
    '<div class="standards-layer-card-header">报告规范层</div>' +
    '<div class="standards-layer-card-body">' +
    '<div class="standard-row"><span class="std-name">ACR RADS</span><span class="std-desc">报告内容规范 — Lung-RADS/LI-RADS 分级模板，规定"写什么"</span></div>' +
    '<div class="standard-row"><span class="std-name">DICOM SR</span><span class="std-desc">结构化报告格式 — 关联影像+编码，规定"怎么存"</span></div>' +
    '<p style="margin-top:8px;font-size:0.72rem;color:var(--accent);font-weight:600">内容 + 格式协同 — 都要同时使用，相互补充</p>' +
    '</div></div>' +

    '</div>' + // end standards-layer-grid

    // === Terminology search/filter ===
    '<div class="section-header" style="margin-top:var(--space-xl)"><h3>术语检索</h3></div>' +
    '<div class="term-controls">' +
    '<input class="term-search" id="term-search" placeholder="搜索术语（中文 / English / 变体）...">' +
    '<div class="filter-group" id="term-filters">' +
    '<button class="filter-btn active" data-type="all">全部</button>' +
    '<button class="filter-btn" data-type="disease">疾病</button>' +
    '<button class="filter-btn" data-type="anatomy">解剖部位</button>' +
    '<button class="filter-btn" data-type="modifier">修饰词</button>' +
    '</div>' +
    '<div class="filter-group" id="view-filters" style="margin-left:8px">' +
    '<button class="filter-btn active" data-view="radlex">RadLex</button>' +
    '<button class="filter-btn" data-view="kernel">核类型映射</button>' +
    '<button class="filter-btn" data-view="crossref">交叉引用</button>' +
    '</div>' +
    '<button class="btn btn-outline btn-sm" id="btn-add-term" style="margin-left:auto">+ 添加术语</button>' +
    '</div>' +

    // Add term form
    '<div id="add-term-form" class="card" style="display:none;margin-bottom:16px;padding:16px">' +
    '<div style="font-weight:600;margin-bottom:12px;color:var(--text-primary)">添加自定义术语</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    '<div><label style="font-size:0.75rem;color:var(--text-secondary)">类型</label>' +
    '<select id="new-term-type" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px">' +
    '<option value="disease">疾病</option><option value="anatomy">解剖部位</option><option value="modifier">修饰词</option></select></div>' +
    '<div><label style="font-size:0.75rem;color:var(--text-secondary)">标准英文</label>' +
    '<input id="new-term-en" placeholder="e.g. Pneumothorax" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px;box-sizing:border-box"></div>' +
    '<div><label style="font-size:0.75rem;color:var(--text-secondary)">标准中文</label>' +
    '<input id="new-term-cn" placeholder="e.g. 气胸" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px;box-sizing:border-box"></div>' +
    '<div><label style="font-size:0.75rem;color:var(--text-secondary)">变体（英文逗号分隔）</label>' +
    '<input id="new-term-variants" placeholder="e.g. pneumothorax, ptx" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px;box-sizing:border-box"></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px">' +
    '<button class="btn btn-primary btn-sm" id="btn-submit-term">确认添加</button>' +
    '<button class="btn btn-outline btn-sm" id="btn-cancel-term">取消</button>' +
    '</div>' +
    '<div id="add-term-msg" style="margin-top:8px;font-size:0.75rem"></div>' +
    '</div>' +

    // Table container
    '<div class="card" style="padding:0;overflow-x:auto">' +
    '<div id="term-table-container"></div>' +
    '</div>' +
    '<div class="term-count" id="term-count"></div>' +

    // Cross-reference matrix (shown in crossref view)
    '<div id="crossref-section" style="display:none;margin-top:var(--space-xl)">' +
    '<div class="section-header"><h3>标准交叉引用矩阵</h3></div>' +
    '<div class="card" style="padding:0;overflow-x:auto">' +
    '<table class="cross-ref-table">' +
    '<thead><tr><th>影像征象</th><th>RadLex RID</th><th>SNOMED CT</th><th>LOINC</th><th>ICD-10</th></tr></thead>' +
    '<tbody>' +
    '<tr><td>磨玻璃影</td><td>RID5592</td><td>253219004</td><td>&mdash;</td><td>&mdash;</td></tr>' +
    '<tr><td>肺实性结节</td><td>RID28814</td><td>233709007</td><td>&mdash;</td><td>R91.1</td></tr>' +
    '<tr><td>肺微小结节</td><td>RID28880</td><td>233703005</td><td>&mdash;</td><td>R91.1</td></tr>' +
    '<tr><td>胸腔积液</td><td>RID3452</td><td>60046008</td><td>&mdash;</td><td>J90</td></tr>' +
    '<tr><td>肺大疱</td><td>RID4784</td><td>24859001</td><td>&mdash;</td><td>J43.9</td></tr>' +
    '<tr><td>淋巴结肿大</td><td>RID28808</td><td>307460006</td><td>&mdash;</td><td>R59.1</td></tr>' +
    '<tr><td>冠状动脉钙化</td><td>RID5188</td><td>233876005</td><td>&mdash;</td><td>I25.1</td></tr>' +
    '<tr><td>动脉粥样硬化</td><td>RID4876</td><td>266574000</td><td>&mdash;</td><td>I70</td></tr>' +
    '<tr><td>血管钙化</td><td>RID5190</td><td>74968002</td><td>&mdash;</td><td>I70</td></tr>' +
    '<tr><td>陈旧性骨折</td><td>RID5166</td><td>399963005</td><td>&mdash;</td><td>&mdash;</td></tr>' +
    '<tr><td>肺气肿</td><td>RID4788</td><td>19947006</td><td>&mdash;</td><td>J43.9</td></tr>' +
    '<tr><td>软组织肿块</td><td>RID3872</td><td>860490009</td><td>&mdash;</td><td>&mdash;</td></tr>' +
    '<tr><td>心脏扩大</td><td>RID5631</td><td>8186001</td><td>&mdash;</td><td>I51.7</td></tr>' +
    '<tr><td>胸膜增厚</td><td>RID3462</td><td>233721001</td><td>&mdash;</td><td>J92</td></tr>' +
    '<tr><td>胸部 CT 平扫</td><td>&mdash;</td><td>&mdash;</td><td>24627-2</td><td>&mdash;</td></tr>' +
    '<tr><td>年龄</td><td>&mdash;</td><td>255410008</td><td>30525-0</td><td>&mdash;</td></tr>' +
    '</tbody></table></div></div>' +

    '</div>'; // end container

  page.innerHTML = html;

  // Attach event listeners
  var searchInput = document.getElementById('term-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() { renderTermTable(); });
  }

  var filterGroup = document.getElementById('term-filters');
  if (filterGroup) {
    filterGroup.addEventListener('click', function(e) {
      var el = e.target;
      while (el && el !== filterGroup) {
        var type = el.getAttribute('data-type');
        if (type) { e.preventDefault(); setTermFilter(type, el); return; }
        el = el.parentElement;
      }
    });
  }

  var viewGroup = document.getElementById('view-filters');
  if (viewGroup) {
    viewGroup.addEventListener('click', function(e) {
      var el = e.target;
      while (el && el !== viewGroup) {
        var view = el.getAttribute('data-view');
        if (view) { e.preventDefault(); switchView(view, el); return; }
        el = el.parentElement;
      }
    });
  }

  var btnAdd = document.getElementById('btn-add-term');
  if (btnAdd) {
    btnAdd.addEventListener('click', function() {
      var form = document.getElementById('add-term-form');
      if (form) form.style.display = 'block';
      btnAdd.style.display = 'none';
    });
  }

  var btnCancel = document.getElementById('btn-cancel-term');
  if (btnCancel) {
    btnCancel.addEventListener('click', function() {
      var form = document.getElementById('add-term-form');
      if (form) form.style.display = 'none';
      var btnAdd2 = document.getElementById('btn-add-term');
      if (btnAdd2) btnAdd2.style.display = '';
      var msg = document.getElementById('add-term-msg');
      if (msg) msg.textContent = '';
    });
  }

  var btnSubmit = document.getElementById('btn-submit-term');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', function() { submitNewTerm(); });
  }

  // Load data
  try {
    var data = await API.getTerminology();
    termData = data.terms;
    renderTermTable();
  } catch (e) {
    var tbody = document.getElementById('term-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="no-data">术语加载失败</td></tr>';
  }

  // Load kernel mapping for kernel view
  try {
    var kernelData = await API.get('/demo/kernel_mapping');
    window._kernelData = kernelData;
  } catch(e) {}
}

function switchView(view, btn) {
  standardsView = view;
  var buttons = document.querySelectorAll('#view-filters .filter-btn');
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
  if (btn) btn.classList.add('active');

  var xref = document.getElementById('crossref-section');
  var container = document.getElementById('term-table-container');
  var count = document.getElementById('term-count');
  var addBtn = document.getElementById('btn-add-term');
  var typeFilters = document.getElementById('term-filters');

  if (view === 'crossref') {
    if (xref) xref.style.display = '';
    if (container) container.innerHTML = '';
    if (count) count.textContent = '';
    if (addBtn) addBtn.style.display = 'none';
    if (typeFilters) typeFilters.style.display = 'none';
  } else if (view === 'kernel') {
    if (xref) xref.style.display = 'none';
    if (addBtn) addBtn.style.display = 'none';
    if (typeFilters) typeFilters.style.display = 'none';
    if (count) count.textContent = '';
    renderKernelTable();
  } else {
    if (xref) xref.style.display = 'none';
    if (addBtn) addBtn.style.display = '';
    if (typeFilters) typeFilters.style.display = '';
    renderTermTable();
  }
}

function renderKernelTable() {
  var data = window._kernelData;
  if (!data || !data.mappings) {
    document.getElementById('term-table-container').innerHTML = '<p style="padding:24px;color:var(--text-tertiary)">核类型映射数据加载中...</p>';
    return;
  }

  var cross = data.cross_vendor_equivalents || {};
  var rows = '<table class="term-table"><thead><tr>' +
    '<th>原始编码</th><th>标准编码</th><th>核家族</th><th>锐利度</th><th>适用部位</th><th>临床用途</th>' +
    '<th>GE 等效</th><th>Philips 等效</th><th>Canon 等效</th>' +
    '</tr></thead><tbody>';

  for (var i = 0; i < data.mappings.length; i++) {
    var m = data.mappings[i];
    var eq = cross[m.original] || {};
    rows += '<tr>' +
      '<td><strong>' + m.original + '</strong></td>' +
      '<td><span class="mono">' + m.standard_code + '</span></td>' +
      '<td>' + m.kernel_family + '</td>' +
      '<td>' + m.sharpness_level + '</td>' +
      '<td>' + m.body_region + '</td>' +
      '<td style="font-size:0.72rem">' + m.clinical_use + '</td>' +
      '<td><span class="standard-badge nifti" style="font-size:0.65rem">' + (eq.GE || '—') + '</span></td>' +
      '<td><span class="standard-badge nifti" style="font-size:0.65rem">' + (eq.Philips || '—') + '</span></td>' +
      '<td><span class="standard-badge nifti" style="font-size:0.65rem">' + (eq.Canon || '—') + '</span></td>' +
      '</tr>';
  }
  rows += '</tbody></table>';
  rows += '<p style="padding:12px 16px;font-size:0.68rem;color:var(--text-tertiary)">' + (data.note || '') + '</p>';

  document.getElementById('term-table-container').innerHTML = rows;
}

// === Existing functions (unchanged logic) ===

async function submitNewTerm() {
  var msgEl = document.getElementById('add-term-msg');
  var type = document.getElementById('new-term-type');
  var en = document.getElementById('new-term-en');
  var cn = document.getElementById('new-term-cn');
  var variantsInput = document.getElementById('new-term-variants');

  if (!en || !cn || !en.value.trim() || !cn.value.trim()) {
    if (msgEl) { msgEl.textContent = '请填写标准英文和标准中文'; msgEl.style.color = 'var(--fail)'; }
    return;
  }

  var typeMap = { disease: '疾病', anatomy: '解剖部位', modifier: '修饰词' };
  var variants = variantsInput && variantsInput.value.trim()
    ? variantsInput.value.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v; })
    : [];

  var term = {
    type: type ? type.value : 'disease',
    type_cn: typeMap[type ? type.value : 'disease'],
    standard_en: en.value.trim(),
    standard_cn: cn.value.trim(),
    variants: variants
  };

  try {
    var res = await API.post('/terminology/add', term);
    if (res.status === 'done') {
      if (msgEl) { msgEl.textContent = '添加成功'; msgEl.style.color = 'var(--success)'; }
      en.value = ''; cn.value = ''; variantsInput.value = '';
      var data = await API.getTerminology();
      termData = data.terms;
      renderTermTable();
      setTimeout(function() {
        var form = document.getElementById('add-term-form');
        if (form) form.style.display = 'none';
        var btnAdd = document.getElementById('btn-add-term');
        if (btnAdd) btnAdd.style.display = '';
        if (msgEl) msgEl.textContent = '';
      }, 1500);
    }
  } catch (err) {
    if (msgEl) { msgEl.textContent = '添加失败: ' + err.message; msgEl.style.color = 'var(--fail)'; }
  }
}

function setTermFilter(type, btn) {
  termFilter = type;
  var buttons = document.querySelectorAll('#term-filters .filter-btn');
  for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  renderTermTable();
}

function renderTermTable() {
  var searchInput = document.getElementById('term-search');
  var query = (searchInput ? searchInput.value : '').toLowerCase();
  var filtered = termData;

  if (termFilter !== 'all') {
    filtered = filtered.filter(function(t) { return t.type === termFilter; });
  }
  if (query) {
    filtered = filtered.filter(function(t) {
      return t.standard_en.toLowerCase().indexOf(query) !== -1 ||
        t.standard_cn.indexOf(query) !== -1 ||
        t.variants.some(function(v) { return v.toLowerCase().indexOf(query) !== -1; });
    });
  }

  var container = document.getElementById('term-table-container');
  var countEl = document.getElementById('term-count');

  if (container) {
    var rows = '<table class="term-table"><thead><tr>' +
      '<th style="width:60px">类型</th>' +
      '<th style="width:140px">标准中文</th>' +
      '<th style="width:160px">标准英文</th>' +
      '<th>变体</th>' +
      '<th style="width:50px">来源</th>' +
      '<th style="width:60px"></th>' +
      '</tr></thead><tbody id="term-tbody">';

    for (var i = 0; i < filtered.length; i++) {
      var t = filtered[i];
      var variantTags = '';
      var limit = Math.min(t.variants.length, 8);
      for (var j = 0; j < limit; j++) variantTags += '<span class="variant-tag">' + t.variants[j] + '</span> ';
      if (t.variants.length > 8) variantTags += ' ...';
      var sourceTag = t._custom
        ? '<span style="font-size:0.65rem;color:var(--accent);background:#EEF0FF;padding:1px 5px;border-radius:3px">自定义</span>'
        : '<span style="font-size:0.65rem;color:var(--text-tertiary)">预置</span>';
      var rowId = 'term-row-' + i;
      var editId = 'term-edit-' + i;

      rows += '<tr id="' + rowId + '">' +
        '<td><span class="term-type">' + t.type_cn + '</span></td>' +
        '<td>' + t.standard_cn + '</td>' +
        '<td><span class="mono">' + t.standard_en + '</span></td>' +
        '<td class="variants-cell">' + variantTags + '</td>' +
        '<td>' + sourceTag + '</td>' +
        '<td><button class="btn-edit-variants" data-edit-id="' + editId + '" style="font-size:0.7rem;padding:2px 8px;border:1px solid var(--border);border-radius:3px;background:#fff;color:var(--accent);cursor:pointer">+变体</button></td>' +
        '</tr>' +
        '<tr id="' + editId + '" style="display:none"><td colspan="6" style="padding:8px 16px;background:#F8F9FA;border-bottom:1px solid var(--border)">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<input class="edit-variants-input" data-term-en="' + t.standard_en + '" placeholder="输入新增变体，英文逗号分隔..." style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.8rem">' +
        '<button class="btn-submit-variants btn btn-primary" style="font-size:0.7rem;padding:4px 12px" data-term-en="' + t.standard_en + '" data-edit-id="' + editId + '">确认</button>' +
        '<button class="btn-cancel-variants" style="font-size:0.7rem;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:#fff;cursor:pointer" data-edit-id="' + editId + '">取消</button>' +
        '</div>' +
        '<div class="edit-variants-msg" style="font-size:0.7rem;margin-top:4px;color:var(--text-tertiary)"></div>' +
        '</td></tr>';
    }
    rows += '</tbody></table>';
    container.innerHTML = rows;

    // Attach event listeners to dynamically created elements
    var tbody = document.getElementById('term-tbody');
    if (tbody) {
      tbody.addEventListener('click', function(e) {
        var el = e.target;
        // Edit variants button
        if (el.classList.contains('btn-edit-variants')) {
          e.preventDefault();
          var editId = el.getAttribute('data-edit-id');
          var editRow = document.getElementById(editId);
          if (editRow) { editRow.style.display = ''; var inp = editRow.querySelector('.edit-variants-input'); if (inp) inp.focus(); }
        }
        // Cancel button
        if (el.classList.contains('btn-cancel-variants')) {
          e.preventDefault();
          var editId = el.getAttribute('data-edit-id');
          var editRow = document.getElementById(editId);
          if (editRow) editRow.style.display = 'none';
          var msg = editRow ? editRow.querySelector('.edit-variants-msg') : null;
          if (msg) msg.textContent = '';
        }
        // Submit button
        if (el.classList.contains('btn-submit-variants')) {
          e.preventDefault();
          var standardEn = el.getAttribute('data-term-en');
          var editId = el.getAttribute('data-edit-id');
          submitVariants(standardEn, editId);
        }
      });
    }
  }

  if (countEl) countEl.textContent = '共 ' + filtered.length + ' 条术语';
}

async function submitVariants(standardEn, editId) {
  var editRow = document.getElementById(editId);
  if (!editRow) return;
  var input = editRow.querySelector('.edit-variants-input');
  var msgEl = editRow.querySelector('.edit-variants-msg');
  if (!input || !input.value.trim()) return;

  var variants = input.value.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v; });
  if (variants.length === 0) return;

  try {
    var res = await API.post('/terminology/' + encodeURIComponent(standardEn) + '/variants', { variants: variants });
    if (res.status === 'done') {
      if (msgEl) { msgEl.textContent = '已添加 ' + variants.length + ' 个变体'; msgEl.style.color = 'var(--success)'; }
      input.value = '';
      var data = await API.getTerminology();
      termData = data.terms;
      renderTermTable();
    }
  } catch (err) {
    if (msgEl) { msgEl.textContent = '添加失败: ' + err.message; msgEl.style.color = 'var(--fail)'; }
  }
}
