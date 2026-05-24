var termData = [];
var termFilter = 'all';

async function renderTerminology() {
  var page = document.getElementById('page-terminology');
  if (!page) return;

  page.innerHTML =
    '<div class="container">' +
    '<div class="section-header"><h2>术语标准化对照表</h2></div>' +
    '<div class="term-controls">' +
    '<input class="term-search" id="term-search" placeholder="搜索术语（中文 / English / 变体）...">' +
    '<div class="filter-group" id="term-filters">' +
    '<button class="filter-btn active" data-type="all">全部</button>' +
    '<button class="filter-btn" data-type="disease">疾病</button>' +
    '<button class="filter-btn" data-type="anatomy">解剖部位</button>' +
    '<button class="filter-btn" data-type="modifier">修饰词</button>' +
    '</div>' +
    '<button class="btn btn-outline btn-sm" id="btn-add-term" style="margin-left:auto">+ 添加术语</button>' +
    '</div>' +
    '<div id="add-term-form" class="card" style="display:none;margin-bottom:16px;padding:16px">' +
    '<div style="font-weight:600;margin-bottom:12px;color:var(--text-primary)">添加自定义术语</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    '<div>' +
    '<label style="font-size:0.75rem;color:var(--text-secondary)">类型</label>' +
    '<select id="new-term-type" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px">' +
    '<option value="disease">疾病</option><option value="anatomy">解剖部位</option><option value="modifier">修饰词</option></select>' +
    '</div>' +
    '<div>' +
    '<label style="font-size:0.75rem;color:var(--text-secondary)">标准英文</label>' +
    '<input id="new-term-en" placeholder="e.g. Pneumothorax" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px;box-sizing:border-box">' +
    '</div>' +
    '<div>' +
    '<label style="font-size:0.75rem;color:var(--text-secondary)">标准中文</label>' +
    '<input id="new-term-cn" placeholder="e.g. 气胸" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px;box-sizing:border-box">' +
    '</div>' +
    '<div>' +
    '<label style="font-size:0.75rem;color:var(--text-secondary)">变体（英文逗号分隔）</label>' +
    '<input id="new-term-variants" placeholder="e.g. pneumothorax, ptx, air in pleural" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;margin-top:2px;box-sizing:border-box">' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:12px">' +
    '<button class="btn btn-primary btn-sm" id="btn-submit-term">确认添加</button>' +
    '<button class="btn btn-outline btn-sm" id="btn-cancel-term">取消</button>' +
    '</div>' +
    '<div id="add-term-msg" style="margin-top:8px;font-size:0.75rem"></div>' +
    '</div>' +
    '<div class="card" style="padding:0;overflow-x:auto">' +
    '<table class="term-table" id="term-table">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:60px">类型</th>' +
    '<th style="width:140px">标准中文</th>' +
    '<th style="width:160px">标准英文</th>' +
    '<th>变体</th>' +
    '<th style="width:50px">来源</th>' +
    '<th style="width:60px"></th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="term-tbody"></tbody>' +
    '</table>' +
    '</div>' +
    '<div class="term-count" id="term-count"></div>' +
    '</div>';

  // Attach search input event listener
  var searchInput = document.getElementById('term-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderTermTable();
    });
  }

  // Event delegation for filter buttons
  var filterGroup = document.getElementById('term-filters');
  if (filterGroup) {
    filterGroup.addEventListener('click', function(e) {
      var el = e.target;
      while (el && el !== filterGroup) {
        var type = el.getAttribute('data-type');
        if (type) {
          e.preventDefault();
          setTermFilter(type, el);
          return;
        }
        el = el.parentElement;
      }
    });
  }

  // Add term button
  var btnAdd = document.getElementById('btn-add-term');
  if (btnAdd) {
    btnAdd.addEventListener('click', function() {
      var form = document.getElementById('add-term-form');
      if (form) form.style.display = 'block';
      btnAdd.style.display = 'none';
    });
  }

  // Cancel button
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

  // Submit button
  var btnSubmit = document.getElementById('btn-submit-term');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', function() {
      submitNewTerm();
    });
  }

  try {
    var data = await API.getTerminology();
    termData = data.terms;
    renderTermTable();
  } catch (e) {
    var tbody = document.getElementById('term-tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data">术语加载失败</td></tr>';
    }
  }
}

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
      // Reset form
      en.value = ''; cn.value = ''; variantsInput.value = '';
      // Reload data
      var data = await API.getTerminology();
      termData = data.terms;
      renderTermTable();
      // Hide form after short delay
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
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('active');
  }
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

  var tbody = document.getElementById('term-tbody');
  var countEl = document.getElementById('term-count');

  if (tbody) {
    var rows = '';
    for (var i = 0; i < filtered.length; i++) {
      var t = filtered[i];
      var variantTags = '';
      var limit = Math.min(t.variants.length, 8);
      for (var j = 0; j < limit; j++) {
        variantTags += '<span class="variant-tag">' + t.variants[j] + '</span> ';
      }
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
        '<td><button class="btn-edit-variants" data-term-en="' + t.standard_en + '" data-term-row="' + rowId + '" data-edit-id="' + editId + '" style="font-size:0.7rem;padding:2px 8px;border:1px solid var(--border);border-radius:3px;background:#fff;color:var(--accent);cursor:pointer">+变体</button></td>' +
        '</tr>' +
        '<tr id="' + editId + '" style="display:none">' +
        '<td colspan="6" style="padding:8px 16px;background:#F8F9FA;border-bottom:1px solid var(--border)">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
        '<input class="edit-variants-input" data-term-en="' + t.standard_en + '" placeholder="输入新增变体，英文逗号分隔..." style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:0.8rem">' +
        '<button class="btn-submit-variants btn btn-primary" style="font-size:0.7rem;padding:4px 12px" data-term-en="' + t.standard_en + '" data-edit-id="' + editId + '">确认</button>' +
        '<button class="btn-cancel-variants" style="font-size:0.7rem;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:#fff;cursor:pointer" data-edit-id="' + editId + '">取消</button>' +
        '</div>' +
        '<div class="edit-variants-msg" style="font-size:0.7rem;margin-top:4px;color:var(--text-tertiary)"></div>' +
        '</td>' +
        '</tr>';
    }
    tbody.innerHTML = rows;

    // Attach event listeners for edit buttons
    var editBtns = tbody.querySelectorAll('.btn-edit-variants');
    for (var b = 0; b < editBtns.length; b++) {
      editBtns[b].addEventListener('click', function(e) {
        e.preventDefault();
        var editId = this.getAttribute('data-edit-id');
        var editRow = document.getElementById(editId);
        if (editRow) editRow.style.display = '';
        var input = editRow ? editRow.querySelector('.edit-variants-input') : null;
        if (input) input.focus();
      });
    }

    // Cancel buttons
    var cancelBtns = tbody.querySelectorAll('.btn-cancel-variants');
    for (var c = 0; c < cancelBtns.length; c++) {
      cancelBtns[c].addEventListener('click', function(e) {
        e.preventDefault();
        var editId = this.getAttribute('data-edit-id');
        var editRow = document.getElementById(editId);
        if (editRow) editRow.style.display = 'none';
        var msg = editRow ? editRow.querySelector('.edit-variants-msg') : null;
        if (msg) msg.textContent = '';
      });
    }

    // Submit buttons
    var submitBtns = tbody.querySelectorAll('.btn-submit-variants');
    for (var s = 0; s < submitBtns.length; s++) {
      submitBtns[s].addEventListener('click', function(e) {
        e.preventDefault();
        var standardEn = this.getAttribute('data-term-en');
        var editId = this.getAttribute('data-edit-id');
        submitVariants(standardEn, editId);
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
      // Reload
      var data = await API.getTerminology();
      termData = data.terms;
      renderTermTable();
    }
  } catch (err) {
    if (msgEl) { msgEl.textContent = '添加失败: ' + err.message; msgEl.style.color = 'var(--fail)'; }
  }
}
