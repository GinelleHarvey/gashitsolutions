/* ===========================
   Global: footer year
=========================== */
document.querySelectorAll('.js-year')
  .forEach(n => n.textContent = new Date().getFullYear());

/* ===========================
   CONTACT PAGE LOGIC
=========================== */
const form = document.getElementById('contactForm');
if (form) {
  const $ = id => document.getElementById(id);
  const phoneEl        = $('phone');
  const captchaLabel   = $('captchaLabel');
  const captchaExpected= $('captchaExpected');
  const errorSummary   = $('errorSummary');
  const birthdateEl    = $('birthdate');

  // Phone input mask -> (000)000-0000
  phoneEl.addEventListener('input', () => {
    const d = phoneEl.value.replace(/\D/g,'').slice(0,10);
    let out = '';
    if (d.length > 0) out = '(' + d.slice(0,3);
    if (d.length >= 4) out += ')' + d.slice(3,6);
    if (d.length >= 7) out += '-' + d.slice(6,10);
    phoneEl.value = out;
  });

  // CAPTCHA (simple math)
  const a = Math.floor(Math.random()*8)+2; // 2..9
  const b = Math.floor(Math.random()*8)+1; // 1..8
  captchaLabel.textContent = `What is ${a}+${b}?`;
  captchaExpected.value = a + b;

  // Birthdate limits: not in future, not older than 120 years
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  birthdateEl.max = `${yyyy}-${mm}-${dd}`;
  birthdateEl.min = `${yyyy-120}-${mm}-${dd}`;

  // If returning from confirm, repopulate from sessionStorage
  try {
    const saved = JSON.parse(sessionStorage.getItem('contactFormData') || '{}');
    if (saved && saved.firstName) {
      $('firstName').value = saved.firstName || '';
      $('lastName').value  = saved.lastName  || '';
      $('street').value    = saved.street    || '';
      $('city').value      = saved.city      || '';
      $('state').value     = saved.state     || '';
      $('zip').value       = saved.zip       || '';
      $('phone').value     = saved.phone     || '';
      $('email').value     = saved.email     || '';
      $('birthdate').value = saved.birthdate || '';
      $('message').value   = saved.message   || '';
    }
  } catch {}

  // Submit handler (strict validation)
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // clear previous errors
    if (errorSummary) {
      errorSummary.style.display = 'none';
      errorSummary.innerHTML = '';
    }
    [...form.querySelectorAll('.error-input')].forEach(el => el.classList.remove('error-input'));

    const data = {
      firstName: $('firstName').value.trim(),
      lastName:  $('lastName').value.trim(),
      street:    $('street').value.trim(),
      city:      $('city').value.trim(),
      state:     $('state').value.trim(),
      zip:       $('zip').value.trim(),
      phone:     $('phone').value.trim(),
      email:     $('email').value.trim(),
      birthdate: $('birthdate').value,
      message:   $('message').value.trim(),
      captcha:   $('captcha').value.trim(),
      captchaExpected: captchaExpected.value
    };

    const errors = [];
    const nameRe  = /^[A-Za-z][A-Za-z\-'\s]{1,}$/;
    const zipRe   = /^\d{5}(?:-\d{4})?$/;
    const phoneRe = /^\(\d{3}\)\d{3}-\d{4}$/;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // Require all fields
    function req(id, label) {
      const el = $(id);
      if (!el.value.trim()) {
        errors.push(`${label} is required.`);
        el.classList.add('error-input');
        return false;
      }
      return true;
    }

    req('firstName','First name');
    req('lastName','Last name');
    req('street','Street address');
    req('city','City');
    req('state','State');
    req('zip','ZIP');
    req('phone','Phone');
    req('email','Email');
    req('birthdate','Birthdate');
    req('message','Message');
    req('captcha','Confirmation answer');

    // Format checks (only if not blank)
    if (data.firstName && !nameRe.test(data.firstName)) {
      errors.push('First name looks invalid.');
      $('firstName').classList.add('error-input');
    }
    if (data.lastName && !nameRe.test(data.lastName)) {
      errors.push('Last name looks invalid.');
      $('lastName').classList.add('error-input');
    }
    if (data.zip && !zipRe.test(data.zip)) {
      errors.push('ZIP must be 5 digits (optionally +4).');
      $('zip').classList.add('error-input');
    }
    if (data.phone && !phoneRe.test(data.phone)) {
      errors.push('Phone format must be (000)000-0000.');
      $('phone').classList.add('error-input');
    }
    if (data.email && !emailRe.test(data.email)) {
      errors.push('Please enter a valid email address.');
      $('email').classList.add('error-input');
    }

    // Birthdate not in future
    if (data.birthdate) {
      const b = new Date(data.birthdate);
      if (b > today) {
        errors.push('Birthdate cannot be in the future.');
        $('birthdate').classList.add('error-input');
      }
    }

    // Captcha must match
    if (String(data.captcha) !== String(data.captchaExpected)) {
      errors.push('Confirmation answer is incorrect.');
      $('captcha').classList.add('error-input');
    }

    // Stop if any errors
    if (errors.length) {
      if (errorSummary) {
        errorSummary.style.display = 'block';
        errorSummary.innerHTML = '<strong>Please fix the following:</strong><ul><li>' + errors.join('</li><li>') + '</li></ul>';
        errorSummary.scrollIntoView({behavior:'smooth', block:'start'});
      } else {
        alert('Please fix:\n- ' + errors.join('\n- '));
      }
      return;
    }

    // Save & go to confirmation
    sessionStorage.setItem('contactFormData', JSON.stringify({
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      city: data.city,
      state: data.state,
      zip: data.zip,
      phone: data.phone,
      email: data.email,
      birthdate: data.birthdate,
      message: data.message,
      submittedAt: new Date().toISOString()
    }));
    window.location.href = 'confirm.html';
  });
}

/* ===========================
   CONFIRM PAGE LOGIC
=========================== */
const review = document.getElementById('review');
if (review) {
  const raw = sessionStorage.getItem('contactFormData');
  if (!raw) { window.location.replace('contact.html'); }
  const d = raw ? JSON.parse(raw) : {};

  review.innerHTML = [
    ['Name', `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim()],
    ['Email', d.email ?? ''],
    ['Phone', d.phone ?? ''],
    ['Address', `${d.street ?? ''}, ${d.city ?? ''}, ${d.state ?? ''} ${d.zip ?? ''}`.replace(/, ,/g, ',')],
    ['Birth date', d.birthdate ?? ''],
    ['Message', (d.message ?? '').replace(/</g,'&lt;')]
  ].map(([k,v]) => `<div><b>${k}:</b> ${v}</div>`).join('');

  document.getElementById('editBtn')?.addEventListener('click', () => {
    window.location.href = 'contact.html';
  });

  document.getElementById('sendBtn')?.addEventListener('click', () => {
    const subject = encodeURIComponent('New contact form submission (GASH IT Solutions)');
    const body = encodeURIComponent(
      `Name: ${d.firstName} ${d.lastName}\n` +
      `Email: ${d.email}\n` +
      `Phone: ${d.phone}\n` +
      `Address: ${d.street}, ${d.city}, ${d.state} ${d.zip}\n` +
      `Birth date: ${d.birthdate}\n\n` +
      `Message:\n${d.message}\n` +
      `Submitted: ${new Date(d.submittedAt || Date.now()).toLocaleString()}`
    );
    window.location.href = `mailto:info@gashitsolutions.com?subject=${subject}&body=${body}`;
  });
}

/* === Assignment 4 – Michaelis–Menten plotting module ===================== */
(function () {
  function init() {
    const form = document.getElementById('mmForm');
    if (!form) return; // only run on the A4 page

    const els = {
      err: document.getElementById('mmError'),
      vmax: document.getElementById('mmVmax'),
      km: document.getElementById('mmKm'),
      smin: document.getElementById('mmSmin'),
      smax: document.getElementById('mmSmax'),
      step: document.getElementById('mmStep'),
      mode: document.getElementById('mmMode'),
      inhibWrap: document.getElementById('mmInhibWrap'),
      I: document.getElementById('mmI'),
      Ki: document.getElementById('mmKi'),
      summary: document.getElementById('mmSummary'),
      plot: document.getElementById('mmPlot'),
      tableBody: document.getElementById('mmTableBody'),
      download: document.getElementById('mmDownload'),
      seed: document.getElementById('mmSeed')
    };

    // UI helpers
    function updateSummary() {
      const competitive = els.mode.value === 'competitive';
      if (els.inhibWrap) els.inhibWrap.hidden = !competitive;
      if (els.summary) {
        els.summary.innerHTML = competitive
          ? 'Competitive inhibition: α = 1 + I/K<sub>i</sub>. Half-max at S = α·K<sub>m</sub>, v = V<sub>max</sub>/2.'
          : 'Half-max at S = K<sub>m</sub> (α=1). v = V<sub>max</sub>/2 there.';
      }
    }

    function readParams() {
      const vmax = +els.vmax.value;
      const km = +els.km.value;
      const smin = +els.smin.value;
      const smax = +els.smax.value;
      const step = +els.step.value;
      const mode = els.mode.value;
      const I = +els.I.value;
      const Ki = +els.Ki.value;

      const errors = [];
      if (!(vmax > 0)) errors.push('Vmax must be > 0');
      if (!(km > 0)) errors.push('Km must be > 0');
      if (!(smax > smin)) errors.push('Smax must be greater than Smin');
      if (!(step > 0)) errors.push('Step must be > 0');
      if (mode === 'competitive') {
        if (!(Ki > 0)) errors.push('Ki must be > 0 for competitive inhibition');
        if (I < 0) errors.push('Inhibitor concentration I must be ≥ 0');
      }

      if (errors.length) {
        els.err.textContent = 'Please fix: ' + errors.join('; ');
        els.err.hidden = false;
        return null;
      }
      els.err.hidden = true;

      const alpha = mode === 'competitive' ? 1 + (I / Ki) : 1;
      return { vmax, km, smin, smax, step, alpha };
    }

    function computeSeries({ vmax, km, smin, smax, step, alpha }) {
      const out = [];
      const nSteps = Math.min(20000, Math.floor((smax - smin) / step) + 1);
      for (let i = 0; i < nSteps; i++) {
        const S = smin + i * step;
        const v = (vmax * S) / (alpha * km + S);
        out.push({ S: +S.toFixed(6), v: +v.toFixed(6) });
      }
      return out;
    }

    function renderTable(data) {
      if (!els.tableBody) return;
      els.tableBody.innerHTML = data.map(d => `<tr><td>${d.S}</td><td>${d.v}</td></tr>`).join('');
    }

    function renderPlot(data, { vmax, km, alpha }) {
      if (typeof Plotly === 'undefined') {
        console.error('Plotly not loaded. Check the CDN script tag order.');
        return;
      }
      const x = data.map(d => d.S);
      const y = data.map(d => d.v);
      const sHalf = alpha * km;
      const vHalf = vmax / 2;

      const curve = { x, y, mode: 'lines', name: 'v(S)', line: { width: 3 } };
      const halfPoint = {
        x: [sHalf], y: [vHalf], mode: 'markers+text', name: 'Half-max',
        text: [`S=${round(sHalf)}, v=${round(vHalf)}`], textposition: 'top center',
        marker: { size: 10 }
      };

      const layout = {
        margin: { l: 60, r: 20, t: 20, b: 50 },
        xaxis: { title: 'S (substrate concentration)' },
        yaxis: { title: 'v (rate)' },
        shapes: [
          { type: 'line', x0: sHalf, x1: sHalf, y0: 0, y1: vHalf, line: { dash: 'dot' } },
          { type: 'line', x0: 0, x1: sHalf, y0: vHalf, y1: vHalf, line: { dash: 'dot' } }
        ],
        legend: { orientation: 'h', y: -0.2 }
      };

      Plotly.newPlot(els.plot, [curve, halfPoint], layout, { displayModeBar: true, responsive: true });
    }

    function round(n) { return Math.abs(n) < 1e-6 ? 0 : +n.toFixed(4); }

    // Events
    els.mode.addEventListener('change', updateSummary);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = readParams();
      if (!p) return;
      const data = computeSeries(p);
      renderTable(data);
      renderPlot(data, p);
    });

    els.download.addEventListener('click', () => {
      const p = readParams();
      if (!p) return;
      const data = computeSeries(p);
      const rows = [['S', 'v'], ...data.map(d => [d.S, d.v])];
      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'michaelis_menten.csv'; a.click();
      URL.revokeObjectURL(url);
    });

    els.seed.addEventListener('click', () => {
      els.vmax.value = 100; els.km.value = 30;
      els.smin.value = 0;   els.smax.value = 200; els.step.value = 1;
      els.mode.value = 'none'; els.I.value = 0; els.Ki.value = 50;
      updateSummary();
      // also replot right away after reset
      const p = readParams(); if (!p) return;
      const data = computeSeries(p);
      renderTable(data);
      renderPlot(data, p);
    });

    // Initial render on page load
    updateSummary();
    const p = readParams();
    if (p) {
      const data = computeSeries(p);
      renderTable(data);
      renderPlot(data, p);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
