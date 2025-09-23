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

/* === A4 – Michaelis–Menten (no libraries; Canvas + MathML) =============== */
(function () {
  function init() {
    const form = document.getElementById('mmForm');
    if (!form) return;

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
      meta: document.getElementById('mmMeta'),
      tableBody: document.getElementById('mmTableBody'),
      download: document.getElementById('mmDownload'),
      seed: document.getElementById('mmSeed'),
      canvas: document.getElementById('mmCanvas')
    };
    const ctx = els.canvas.getContext('2d');

    /* ---------- helpers ---------- */
    function updateSummary(alpha, km, vmax) {
      els.meta.innerHTML = `Half-max at <em>S</em> = ${round(alpha * km)} (α=${round(alpha)}) ⇒ v = ${round(vmax/2)}.`;
    }
    function showInhibFields() {
      const comp = els.mode.value === 'competitive';
      els.inhibWrap.hidden = !comp;
    }
    function readParams() {
      const vmax = +els.vmax.value, km = +els.km.value;
      const smin = +els.smin.value, smax = +els.smax.value, step = +els.step.value;
      const I = +els.I.value, Ki = +els.Ki.value;
      const comp = els.mode.value === 'competitive';
      const errors = [];
      if (!(vmax > 0)) errors.push('Vmax must be > 0');
      if (!(km > 0)) errors.push('Km must be > 0');
      if (!(smax > smin)) errors.push('Smax must be greater than Smin');
      if (!(step > 0)) errors.push('Step must be > 0');
      if (comp) { if (!(Ki > 0)) errors.push('Ki must be > 0'); if (I < 0) errors.push('I must be ≥ 0'); }
      if (errors.length) {
        els.err.textContent = 'Please fix: ' + errors.join('; ');
        els.err.hidden = false; return null;
      }
      els.err.hidden = true;
      const alpha = comp ? 1 + (I / Ki) : 1;
      return { vmax, km, smin, smax, step, alpha };
    }
    function computeSeries({vmax, km, smin, smax, step, alpha}) {
      const data = [];
      const n = Math.min(20000, Math.floor((smax - smin) / step) + 1);
      for (let i = 0; i < n; i++) {
        const S = smin + i * step;
        const v = (vmax * S) / (alpha * km + S);
        data.push({S, v});
      }
      return data;
    }
    function round(n) { return Math.abs(n) < 1e-6 ? 0 : +n.toFixed(4); }

    /* ---------- drawing ---------- */
    function fitCanvasToCSS() {
      const dpr = window.devicePixelRatio || 1;
      const rect = els.canvas.getBoundingClientRect();
      els.canvas.width  = Math.max(320, Math.floor(rect.width * dpr));
      els.canvas.height = Math.max(260, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing commands
    }
    function drawAxes(rect, xMin, xMax, yMin, yMax) {
      const {x, y, w, h} = rect;
      ctx.fillStyle = '#000';
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;

      // border
      ctx.strokeRect(x, y, w, h);

      // ticks/grid
      const xticks = 6, yticks = 5;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';

      for (let i=0;i<=xticks;i++){
        const t = i/xticks, xv = xMin + t*(xMax-xMin);
        const px = x + t*w;
        // grid line
        ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.beginPath();
        ctx.moveTo(px, y); ctx.lineTo(px, y+h); ctx.stroke();
        ctx.strokeStyle = '#888';
        ctx.beginPath(); ctx.moveTo(px, y+h); ctx.lineTo(px, y+h+4); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.fillText(round(xv), px, y+h+6);
      }

      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let j=0;j<=yticks;j++){
        const t = j/yticks, yv = yMax - t*(yMax-yMin);
        const py = y + t*h;
        ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.beginPath();
        ctx.moveTo(x, py); ctx.lineTo(x+w, py); ctx.stroke();
        ctx.strokeStyle = '#888';
        ctx.beginPath(); ctx.moveTo(x-4, py); ctx.lineTo(x, py); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.fillText(round(yv), x-6, py);
      }

      // axis labels
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('S (substrate concentration)', x + w/2, y + h + 28);
      ctx.translate(x - 36, y + h/2); ctx.rotate(-Math.PI/2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('v (rate)', 0, 0);
      ctx.restore();
    }
    function worldToScreen(rect, xMin, xMax, yMin, yMax, S, v) {
      const {x, y, w, h} = rect;
      const px = x + ((S - xMin) / (xMax - xMin)) * w;
      const py = y + h - ((v - yMin) / (yMax - yMin)) * h;
      return [px, py];
    }
    function drawCurve(rect, xMin, xMax, yMin, yMax, series, color='#0b65d1') {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      for (let i=0;i<series.length;i++){
        const [px, py] = worldToScreen(rect, xMin, xMax, yMin, yMax, series[i].S, series[i].v);
        if (i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    function drawHalfMax(rect, xMin, xMax, yMin, yMax, sHalf, vHalf) {
      ctx.strokeStyle = '#cc5500'; ctx.setLineDash([5,5]); ctx.lineWidth = 1.25;
      // vertical
      let p1 = worldToScreen(rect, xMin, xMax, yMin, yMax, sHalf, yMin);
      let p2 = worldToScreen(rect, xMin, xMax, yMin, yMax, sHalf, vHalf);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      // horizontal
      p1 = worldToScreen(rect, xMin, xMax, yMin, yMax, xMin, vHalf);
      p2 = worldToScreen(rect, xMin, xMax, yMin, yMax, sHalf, vHalf);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      ctx.setLineDash([]);
      // marker + label
      const [mx,my] = worldToScreen(rect, xMin, xMax, yMin, yMax, sHalf, vHalf);
      ctx.fillStyle = '#cc5500'; ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI*2); ctx.fill();
      ctx.font = '12px system-ui, sans-serif'; ctx.textAlign='left'; ctx.textBaseline='bottom';
      ctx.fillText(`Half-max: S=${round(sHalf)}, v=${round(vHalf)}`, mx+6, my-6);
    }

    /* ---------- render pipeline ---------- */
    let lastParams = null, lastSeries = null, lastY = null;
    function render() {
      const p = readParams(); if (!p) return;
      lastParams = p;
      const series = computeSeries(p);
      lastSeries = series;
      // determine y-range with padding
      let ymin = Infinity, ymax = -Infinity;
      for (const d of series){ if (d.v < ymin) ymin = d.v; if (d.v > ymax) ymax = d.v; }
      if (!isFinite(ymin) || !isFinite(ymax)) { ymin=0; ymax=1; }
      if (ymax === ymin) ymax = ymin + 1;
      const pad = (ymax - ymin) * 0.15;
      ymin -= pad; ymax += pad;
      lastY = {ymin, ymax};

      // canvas sizing + clear
      fitCanvasToCSS();
      ctx.clearRect(0,0,els.canvas.width,els.canvas.height);

      // plot rect
      const rect = { x: 56, y: 16, w: els.canvas.clientWidth - 80, h: els.canvas.clientHeight - 70 };
      // axes
      drawAxes(rect, p.smin, p.smax, ymin, ymax);
      // curve
      drawCurve(rect, p.smin, p.smax, ymin, ymax, series);
      // half-max marker
      const sHalf = p.alpha * p.km, vHalf = p.vmax/2;
      drawHalfMax(rect, p.smin, p.smax, ymin, ymax, sHalf, vHalf);
      updateSummary(p.alpha, p.km, p.vmax);

      // table
      els.tableBody.innerHTML = series.map(d => `<tr><td>${round(d.S)}</td><td>${round(d.v)}</td></tr>`).join('');
    }

    /* ---------- events ---------- */
    form.addEventListener('submit', (e)=>{ e.preventDefault(); render(); });
    els.mode.addEventListener('change', ()=>{ showInhibFields(); render(); });
    els.seed.addEventListener('click', ()=>{
      els.vmax.value=100; els.km.value=30; els.smin.value=0; els.smax.value=200; els.step.value=1;
      els.mode.value='none'; els.I.value=0; els.Ki.value=50; showInhibFields(); render();
    });
    els.download.addEventListener('click', ()=>{
      const p = lastParams || readParams(); if (!p) return;
      const data = lastSeries || computeSeries(p);
      const rows = [['S','v'], ...data.map(d=>[round(d.S), round(d.v)])];
      const csv = rows.map(r=>r.join(',')).join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'michaelis_menten.csv'; a.click();
      URL.revokeObjectURL(url);
    });
    window.addEventListener('resize', ()=>{
      if (!lastParams || !lastSeries || !lastY) return;
      // redraw with cached results on resize
      fitCanvasToCSS();
      ctx.clearRect(0,0,els.canvas.width,els.canvas.height);
      const rect = { x: 56, y: 16, w: els.canvas.clientWidth - 80, h: els.canvas.clientHeight - 70 };
      drawAxes(rect, lastParams.smin, lastParams.smax, lastY.ymin, lastY.ymax);
      drawCurve(rect, lastParams.smin, lastParams.smax, lastY.ymin, lastY.ymax, lastSeries);
      const sHalf = lastParams.alpha * lastParams.km, vHalf = lastParams.vmax/2;
      drawHalfMax(rect, lastParams.smin, lastParams.smax, lastY.ymin, lastY.ymax, sHalf, vHalf);
    });

    // initial
    showInhibFields();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
