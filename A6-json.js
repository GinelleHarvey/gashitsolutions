(function(){
  const statusEl = document.getElementById('status');
  const tableWrap = document.getElementById('tableWrap');
  const srcSel = document.getElementById('dataSrc');
  const reloadBtn = document.getElementById('reloadBtn');

  async function load(url){
    statusEl.textContent = `Loading ${url}…`;
    tableWrap.innerHTML = '';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      renderTable(data);
      const updated = data.updated ? ` (updated ${data.updated})` : '';
      statusEl.textContent = `Loaded ${url}${updated}.`;
    } catch (err){
      console.error(err);
      statusEl.textContent = `Failed to load ${url}. Ensure the file is on your server (not file://) and not blocked by CORS.`;
      tableWrap.innerHTML = `<p role="alert">Error: ${escapeHtml(err.message)}</p>`;
    }
  }

  function renderTable(data){
    const items = Array.isArray(data.inventory) ? data.inventory : [];
    const rows = items.map(p => ({
      sku: p.sku ?? '',
      name: p.name ?? '',
      category: p.category ?? '',
      price: num(p.price),
      cost: num(p.cost),
      stock: int(p.stock),
      reorderLevel: int(p.reorderLevel),
      status: p.status ?? '',
      supplier: p.supplier ?? '',
      addedDate: p.addedDate ?? '',
      lastUpdated: p.lastUpdated ?? '',
      tags: Array.isArray(p.tags) ? p.tags : []
    }));

    const table = document.createElement('table');
    table.className = 'a6-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">SKU</th>
          <th scope="col">Product</th>
          <th scope="col">Category</th>
          <th scope="col">Price</th>
          <th scope="col">Cost</th>
          <th scope="col">Margin</th>
          <th scope="col">Stock</th>
          <th scope="col">Reorder</th>
          <th scope="col">Status</th>
          <th scope="col">Supplier</th>
          <th scope="col">Added</th>
          <th scope="col">Updated</th>
          <th scope="col">Tags</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const margin = (r.price - r.cost);
      const stockClass = r.stock <= 0 ? 'bad' : (r.stock <= r.reorderLevel ? 'warn' : 'ok');
      const stockLabel = r.stock <= 0 ? 'Out' : (r.stock <= r.reorderLevel ? 'Low' : 'In Stock');

      tr.innerHTML = `
        <td>${escapeHtml(r.sku)}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.category)}</td>
        <td>${fmtCurrency(r.price)}</td>
        <td>${fmtCurrency(r.cost)}</td>
        <td>${fmtCurrency(margin)}</td>
        <td><span class="pill ${stockClass}">${r.stock} • ${stockLabel}</span></td>
        <td>${r.reorderLevel}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${escapeHtml(r.supplier)}</td>
        <td>${escapeHtml(r.addedDate)}</td>
        <td>${escapeHtml(r.lastUpdated)}</td>
        <td>${r.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</td>
      `;
      tbody.appendChild(tr);
    });

    tableWrap.appendChild(table);
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
  srcSel.addEventListener('change', () => load(srcSel.value));

  // Initial load
  load(srcSel.value);
})();
