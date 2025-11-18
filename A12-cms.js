// A12-cms.js
// Load CMS data from external JSON and render table

document.addEventListener('DOMContentLoaded', () => {
  loadCmsTable();
});

async function loadCmsTable() {
  const statusEl = document.getElementById('cmsStatus');
  const wrap = document.getElementById('cmsTableWrap');

  if (!wrap) return;

  try {
    if (statusEl) {
      statusEl.textContent = 'Loading CMS data…';
    }

    const response = await fetch('A12-cms.json', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const systems = Array.isArray(data.systems) ? data.systems : [];

    if (!systems.length) {
      wrap.innerHTML = '<p>No CMS records found in A12-cms.json.</p>';
      if (statusEl) statusEl.textContent = '';
      return;
    }

    const table = buildCmsTable(systems);
    wrap.innerHTML = '';
    wrap.appendChild(table);
    if (statusEl) {
      statusEl.textContent = `Loaded ${systems.length} content management systems.`;
    }
  } catch (err) {
    console.error('Error loading CMS data:', err);
    wrap.innerHTML = '<p>Sorry, there was a problem loading A12-cms.json.</p>';
    if (statusEl) {
      statusEl.textContent = 'Error loading CMS data.';
    }
  }
}

function buildCmsTable(systems) {
  const table = document.createElement('table');
  table.className = 'cms-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  const headers = [
    'Name',
    'Support',
    'Technology',
    'Capabilities',
    'Limitations',
    'Examples'
  ];

  headers.forEach(text => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  systems.forEach(sys => {
    const tr = document.createElement('tr');

    addCell(tr, sys.name || '', 'Name');
    addCell(tr, sys.support || '', 'Support');
    addCell(tr, sys.technology || '', 'Technology');
    addListCell(tr, sys.capabilities || '', 'Capabilities');
    addListCell(tr, sys.limitations || '', 'Limitations');
    addLinkCell(tr, sys.examples || [], 'Examples');

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

function addCell(row, text, label) {
  const td = document.createElement('td');
  td.textContent = text;
  td.setAttribute('data-label', label);
  row.appendChild(td);
}

function addListCell(row, text, label) {
  const td = document.createElement('td');
  td.setAttribute('data-label', label);

  // Split on semicolons for nicer bullets
  const parts = text.split(';').map(p => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    const ul = document.createElement('ul');
    parts.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    td.appendChild(ul);
  } else {
    td.textContent = text;
  }

  row.appendChild(td);
}

function addLinkCell(row, examples, label) {
  const td = document.createElement('td');
  td.setAttribute('data-label', label);

  const list = Array.isArray(examples) ? examples : [];

  if (!list.length) {
    td.textContent = '';
    row.appendChild(td);
    return;
  }

  const ul = document.createElement('ul');

  list.forEach(ex => {
    if (!ex.url) return;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = ex.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = ex.label || ex.url;
    li.appendChild(a);
    ul.appendChild(li);
  });

  td.appendChild(ul);
  row.appendChild(td);
}
