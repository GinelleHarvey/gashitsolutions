(function(){
  const statusEl = document.getElementById('status');
  const tableWrap = document.getElementById('tableWrap');
  const srcSel = document.getElementById('dataSrc');
  const reloadBtn = document.getElementById('reloadBtn');
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const searchBox = document.getElementById('searchBox');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  let raw = [];          // original items (array)
  let view = [];         // filtered & sorted items (array)
  let sortState = { key: null, dir: 1 }; // dir: 1 asc, -1 desc

  async function load(url){
    statusEl.textContent = `Loading ${url}…`;
    tableWrap.innerHTML = '';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();

      raw = Array.isArray(data.inventory) ? data.inventory.slice() : [];
      buildFilterOptions(raw);
      applyFiltersAndRender();

      const updated = data.updated ? ` (updated ${data.updated})` : '';
      statusEl.textContent = `Loaded ${url}${updated}. ${raw.length} items.`;
    } catch (err){
      console.error(err);
      statusEl.textContent = `Failed to load ${url}. Ensure the file is on your server (not file://) and not blocked by CORS.`;
      tableWrap.innerHTML = `<p role="alert">Error: ${escapeHtml(err.message)}</p>`;
    }
  }

  function buildFilterOptions(items){
    // Build unique Category and Status options from data
    const cats = new Set();
    const stats = new Set();
    items.forEach(i => {
      if (i.category) cats.add(String(i.category));
      if (i.status) stats.add(String(i.status));
    });

    setOptions(filterCategory, ['All', ...[...cats].sort()]);
    setOptions(filterStatus, ['All', ...[...stats].sort()]);
  }

  function setOptions(select, values){
    const current = select.value;
    select.innerHTML = '';
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = (v === 'All' ? '' : v);
      opt.textContent = v;
      select.appendChild(opt);
    });
    // preserve previous selection if possible
    const match = [...select.options].some(o => o.value === current);
    if (match) select.value = current;
  }

  function applyFiltersAndRender(){
    const q = searchBox.value.trim().toLowerCase();
    const cat = filterCategory.value;
    const stat = filterStatus.value;

    view = raw.filter(i => {
      if (cat && String(i.category) !== cat) return false;
      if (stat && String(i.status) !== stat) return false;
      if (q){
        const hay = [
          i.sku, i.name, i.category, i.status, i.supplier,
          ...(Array.isArray(i.tags) ? i.tags : [])
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Apply sort if any
    if (sortState.key){
      const { key, dir } = sortState;
      const colType = columnTypes[key] || 'string';
      view.sort((a,b) => compare(a[key], b[key], colType) * dir);
    }

    renderTable(view);
  }

  const columnMap = [
    { key: 'sku', label: 'SKU', type: 'string' },
    { key: 'name', label: 'Product', type: 'string' },
    { key: 'category', label: 'Category', type: 'string' },
    { key: 'price', label: 'Price', type: 'number' },
    { key: 'cost', label: 'Cost', type: 'number' },
    { key: 'margin', label: 'Margin', type: 'number' }, // computed
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'reorderLevel', label: 'Reorder', type: 'number' },
    { key: 'status', label: 'Status', type: 'string' },
    { key: 'supplier', label: 'Supplier', type: 'string' },
    { key: 'addedDate', label: 'Added', type: 'string' },
    { key: 'lastUpdated', label: 'Updated', type: 'string' },
    { key: 'tags', label: 'Tags', type: 'string' } // array displayed as chips
  ];
  const columnTypes = Object.fromEntries(columnMap.map(c => [c.key, c.type]));

  function renderTable(items){
    tableWrap.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'a6-table';
    table.setAttribute('aria-describedby', 'dataTitle');

    // Header
    const thead = document.createElement('thead');
    const hdrRow = document.createElement('tr');
    columnMap.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      th.scope = 'col';
      th.tabIndex = 0;
      th.dataset.key = col.key;
      th.setAttribute('role', 'columnheader');
      th.setAttribute('aria-sort', sortState.key === col.key ? (sortState.dir === 1 ? 'ascending' : 'descending') : 'none');

      // Click & keyboard to sort
      th.addEventListener('click', () => toggleSort(col.key));
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort(col.key); }
      });

      hdrRow.appendChild(th);
    });
    thead.appendChild(hdrRow);

    // Body
    const tbody = document.createElement('tbody');
    items.forEach(i => {
      const tr = document.createElement('tr');
      const margin = num(i.price) - num(i.cost);
      const stockClass = i.stock <= 0 ? 'bad' : (i.stock <= i.reorderLevel ? 'warn' : 'ok');
      const stockLabel = i.stock <= 0 ? 'Out' : (i.stock <= i.reorderLevel ? 'Low' : 'In Stock');

      const cells = {
        sku: escapeHtml(i.sku ?? ''),
        name: escapeHtml(i.name ?? ''),
        category: escapeHtml(i.category ?? ''),
        price: fmtCurrency(num(i.price)),
        cost: fmtCurrency(num(i.cost)),
        margin: fmtCurrency(margin),
        stock: `<span class="pill ${stockClass}">${int(i.stock)} • ${stockLabel}</span>`,
        reorderLevel: int(i.reorderLevel),
        status: escapeHtml(i.status ?? ''),
        supplier: escapeHtml(i.supplier ?? ''),
        addedDate: escapeHtml(i.addedDate ?? ''),
        lastUpdated: escapeHtml(i.lastUpdated ?? ''),
        tags: (Array.isArray(i.tags) ? i.tags : []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')
      };

      columnMap.forEach(col => {
        const td = document.createElement('td');
        td.innerHTML = cells[col.key] ?? '';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);
  }

  function toggleSort(key){
    if (sortState.key === key){
      // toggle dir or clear if already descending
      sortState.dir = sortState.dir === 1 ? -1 : 1;
    } else {
      sortState.key = key;
      sortState.dir = 1;
    }
    applyFiltersAndRender();
  }

  function compare(a,b,type){
    if (type === 'number'){
      const na = Number(a) || 0;
      const nb = Number(b) || 0;
      return na === nb ? 0 : na < nb ? -1 : 1;
    }
    // string/other
    const sa = (a ?? '').toString().toLowerCase();
    const sb = (b ?? '').toString().toLowerCase();
    return sa === sb ? 0 : sa < sb ? -1 : 1;
  }

  function exportCSV(){
    // Export the *currently viewed* rows
    const rows = view.map(i => ({
      SKU: i.sku ?? '',
      Product: i.name ?? '',
      Category: i.category ?? '',
      Price: num(i.price),
      Cost: num(i.cost),
      Margin: num(i.price) - num(i.cost),
      Stock: int(i.stock),
      Reorder: int(i.reorderLevel),
      Status: i.status ?? '',
      Supplier: i.supplier ?? '',
      Added: i.addedDate ?? '',
      Updated: i.lastUpdated ?? '',
      Tags: Array.isArray(i.tags) ? i.tags.join('|') : ''
    }));

    const headers = Object.keys(rows[0] || {
      SKU:'', Product:'', Category:'', Price:'', Cost:'', Margin:'', Stock:'', Reorder:'', Status:'', Supplier:'', Added:'', Updated:'', Tags:''
    });

    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function csvEscape(val){
    const s = String(val ?? '');
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
    return s;
  }

  function fmtCurrency(n){
    if (!isFinite(n)) return '';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
  }
  function num(v){ const n = Number(v); return isFinite(n) ? n : 0; }
  function int(v){ const n = parseInt(v, 10); return isFinite(n) ? n : 0; }

  function escapeHtml(str){
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  // Events
  reloadBtn.addEventListener('click', () => load(srcSel.value));
  [filterCategory, filterStatus].forEach(el => el.addEventListener('change', applyFiltersAndRender));
  clearFiltersBtn.addEventListener('click', () => {
    filterCategory.value = '';
    filterStatus.value = '';
    searchBox.value = '';
    sortState = { key: null, dir: 1 };
    applyFiltersAndRender();
  });
  searchBox.addEventListener('input', debounce(applyFiltersAndRender, 120));
  exportCsvBtn.addEventListener('click', exportCSV);

  function debounce(fn, ms){
    let t; return function(){ clearTimeout(t); t = setTimeout(fn, ms); };
  }

  // Initial load
  load(srcSel.value);
})();
