/* ===========================
   GLOBAL: Footer year (supports #year and .js-year)
=========================== */
(function () {
  const nowYear = String(new Date().getFullYear());
  const y1 = document.getElementById('year');
  if (y1) y1.textContent = nowYear;
  document.querySelectorAll('.js-year').forEach(n => (n.textContent = nowYear));
})();

/* ===========================
   GLOBAL: Mobile Nav (white header)
   Requires:
     <button id="navToggle" class="nav__toggle" aria-expanded="false" aria-controls="navMenu">Menu</button>
     <ul id="navMenu" class="nav__menu">...</ul>
=========================== */
(function () {
  const btn = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!btn || !menu) return;

  const setExpanded = open => btn.setAttribute('aria-expanded', String(open));

  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    setExpanded(open);
  });

  // Close on link click (useful on mobile)
  menu.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    if (menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      setExpanded(false);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      setExpanded(false);
      btn.focus();
    }
  });
})();

/* ===========================
   GLOBAL: Smooth Scroll for in-page #anchors
=========================== */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const dest = document.getElementById(id);
  if (!dest) return;
  e.preventDefault();
  dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ===========================
   GLOBAL: Panels / Drawers accordion (only one <details> open)
   Structure:
     <section class="panels">
       <div class="panels__list">
         <details> <summary>...</summary> ... </details>
         ...
       </div>
     </section>
=========================== */
document.querySelectorAll('.panels').forEach(section => {
  section.addEventListener('click', e => {
    if (e.target.nodeName.toLowerCase() !== 'summary') return;
    const current = e.target.parentElement; // the <details> clicked
    section.querySelectorAll('details[open]').forEach(d => {
      if (d !== current) d.removeAttribute('open');
    });
  });
});

/* ===========================
   CONTACT PAGE LOGIC
   Expects IDs:
     contactForm, phone, captchaLabel, captchaExpected, errorSummary, birthdate
     firstName, lastName, street, city, state, zip, email, message, captcha
=========================== */
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return; // only run on contact page

  const $ = id => document.getElementById(id);
  const phoneEl        = $('phone');
  const captchaLabel   = $('captchaLabel');
  const captchaExpected= $('captchaExpected');
  const errorSummary   = $('errorSummary');
  const birthdateEl    = $('birthdate');

  // Center the main container if needed (safety: only if a main.wrap exists)
  const mainWrap = document.querySelector('main .wrap, .container');
  if (mainWrap) {
    mainWrap.style.marginInline = 'auto';
    mainWrap.style.maxWidth = getComputedStyle(document.documentElement)
      .getPropertyValue('--wrap').trim() || '1400px';
  }

  // Phone input mask -> (000)000-0000
  if (phoneEl){
    phoneEl.addEventListener('input', () => {
      const d = phoneEl.value.replace(/\D/g,'').slice(0,10);
      let out = '';
      if (d.length > 0) out = '(' + d.slice(0,3);
      if (d.length >= 4) out += ')' + d.slice(3,6);
      if (d.length >= 7) out += '-' + d.slice(6,10);
      phoneEl.value = out;
    });
  }

  // CAPTCHA (simple math)
  const a = Math.floor(Math.random()*8)+2; // 2..9
  const b = Math.floor(Math.random()*8)+1; // 1..8
  if (captchaLabel) captchaLabel.textContent = `What is ${a}+${b}?`;
  if (captchaExpected) captchaExpected.value = a + b;

  // Birthdate limits: not in future, not older than 120 years
  if (birthdateEl){
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    birthdateEl.max = `${yyyy}-${mm}-${dd}`;
    birthdateEl.min = `${yyyy-120}-${mm}-${dd}`;
  }

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
  } catch { /* ignore */ }

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
      captchaExpected: (captchaExpected && captchaExpected.value) || ''
    };

    const errors = [];
    const nameRe  = /^[A-Za-z][A-Za-z\-'\s]{1,}$/;
    const zipRe   = /^\d{5}(?:-\d{4})?$/;
    const phoneRe = /^\(\d{3}\)\d{3}-\d{4}$/;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // Require all fields
    function req(id, label) {
      const el = $(id);
      if (!el || !el.value.trim()) {
        errors.push(`${label} is required.`);
        el && el.classList.add('error-input');
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

    // Format checks
    if (data.firstName && !nameRe.test(data.firstName)) {
      errors.push('First name looks invalid.'); $('firstName').classList.add('error-input');
    }
    if (data.lastName && !nameRe.test(data.lastName)) {
      errors.push('Last name looks invalid.'); $('lastName').classList.add('error-input');
    }
    if (data.zip && !zipRe.test(data.zip)) {
      errors.push('ZIP must be 5 digits (optionally +4).'); $('zip').classList.add('error-input');
    }
    if (data.phone && !phoneRe.test(data.phone)) {
      errors.push('Phone format must be (000)000-0000.'); $('phone').classList.add('error-input');
    }
    if (data.email && !emailRe.test(data.email)) {
      errors.push('Please enter a valid email address.'); $('email').classList.add('error-input');
    }

    // Birthdate not in future
    if (data.birthdate) {
      const today = new Date();
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
        errorSummary.innerHTML =
          '<strong>Please fix the following:</strong><ul><li>' +
          errors.join('</li><li>') + '</li></ul>';
        errorSummary.scrollIntoView({ behavior:'smooth', block:'start' });
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
})();

/* ===========================
   CONFIRM PAGE LOGIC
   Expects #review plus #editBtn, #sendBtn
=========================== */
(function () {
  const review = document.getElementById('review');
  if (!review) return;

  const raw = sessionStorage.getItem('contactFormData');
  if (!raw) { window.location.replace('contact.html'); return; }
  const d = JSON.parse(raw || '{}');

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
})();

/* ===========================
   (Optional) Calculator & Plot block
   Safe no-op if elements don’t exist
=========================== */
(function(){
  const canvas  = document.getElementById("plot");
  if (!canvas) return; // only on that page

  const Vmax = document.getElementById("Vmax");
  const Km   = document.getElementById("Km");
  const I    = document.getElementById("I");
  const Ki   = document.getElementById("Ki");
  const Smax = document.getElementById("Smax");
  const Speed= document.getElementById("Speed");

  const outVmax = document.getElementById("outVmax");
  const outKm   = document.getElementById("outKm");
  const outI    = document.getElementById("outI");
  const outKi   = document.getElementById("outKi");
  const outSmax = document.getElementById("outSmax");
  const outSpeed= document.getElementById("outSpeed");

  const halfMax = document.getElementById("halfMax");
  const live    = document.getElementById("liveReadout");
  const ctx     = canvas.getContext("2d");
  const btnPlay = document.getElementById("btnPlay");
  const btnReset= document.getElementById("btnReset");

  const f1 = n => (+n).toFixed(1);
  const f2 = n => (+n).toFixed(2);
  const alpha = () => 1 + (parseFloat(I.value)/parseFloat(Ki.value));

  function syncOutputs(){
    if (outVmax) outVmax.textContent = Vmax.value;
    if (outKm)   outKm.textContent   = Km.value;
    if (outI)    outI.textContent    = I.value;
    if (outKi)   outKi.textContent   = Ki.value;
    if (outSmax) outSmax.textContent = Smax.value;
    if (outSpeed)outSpeed.textContent= f1(Speed.value) + "×";
  }
  function series(){
    const vmax = +Vmax.value, km = +Km.value, smax = +Smax.value, a = alpha();
    const step = smax/240; const pts = [];
    for(let s=0; s<=smax; s+=step){ pts.push({ s, v:(vmax*s)/(a*km + s) }); }
    return pts;
  }
  function fitCanvas(){
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(320, Math.floor(w*dpr));
    canvas.height= Math.max(240, Math.floor(h*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function drawAll(sMarker){
    syncOutputs(); fitCanvas();
    const vmax = +Vmax.value, km = +Km.value, smax = +Smax.value, a = alpha();
    const pts = series();
    const ymin = 0, ymax = vmax * 1.15;
    const padL=56, padB=40, padR=16, padT=16;
    const plot = { x:padL, y:padT, w:canvas.clientWidth-padL-padR, h:canvas.clientHeight-padT-padB };

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = "#888"; ctx.lineWidth = 1; ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);

    ctx.font = "12px system-ui, sans-serif"; ctx.fillStyle = "#000";
    ctx.textAlign="center"; ctx.textBaseline="top";
    const xticks = 6, yticks = 5;
    for(let i=0;i<=xticks;i++){
      const t=i/xticks, s=t*smax, px=plot.x + t*plot.w;
      ctx.strokeStyle="rgba(0,0,0,.08)"; ctx.beginPath(); ctx.moveTo(px, plot.y); ctx.lineTo(px, plot.y+plot.h); ctx.stroke();
      ctx.strokeStyle="#888"; ctx.beginPath(); ctx.moveTo(px, plot.y+plot.h); ctx.lineTo(px, plot.y+plot.h+4); ctx.stroke();
      ctx.fillText(f1(s), px, plot.y+plot.h+6);
    }
    ctx.textAlign="right"; ctx.textBaseline="middle";
    for(let j=0;j<=yticks;j++){
      const t=j/yticks, v=ymax - t*(ymax-ymin), py=plot.y + t*plot.h;
      ctx.strokeStyle="rgba(0,0,0,.08)"; ctx.beginPath(); ctx.moveTo(plot.x, py); ctx.lineTo(plot.x+plot.w, py); ctx.stroke();
      ctx.strokeStyle="#888"; ctx.beginPath(); ctx.moveTo(plot.x-4, py); ctx.lineTo(plot.x, py); ctx.stroke();
      ctx.fillText(f1(v), plot.x-6, py);
    }
    ctx.save();
    ctx.textAlign="center"; ctx.textBaseline="bottom";
    ctx.fillText("S (substrate concentration)", plot.x + plot.w/2, plot.y + plot.h + 28);
    ctx.translate(plot.x - 36, plot.y + plot.h/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText("v (rate)", 0, 0);
    ctx.restore();

    const X = s => plot.x + (s/smax)*plot.w;
    const Y = v => plot.y + plot.h - ((v-ymin)/(ymax-ymin))*plot.h;

    ctx.strokeStyle = "#0b65d1"; ctx.lineWidth = 2; ctx.beginPath();
    pts.forEach((p,i)=>{ const x=X(p.s), y=Y(p.v); i?ctx.lineTo(x,y):ctx.moveTo(x,y); });
    ctx.stroke();

    const sHalf = a*km, vHalf = vmax/2;
    ctx.setLineDash([5,5]); ctx.strokeStyle = "#cc5500"; ctx.lineWidth=1.25;
    ctx.beginPath(); ctx.moveTo(X(sHalf), Y(ymin)); ctx.lineTo(X(sHalf), Y(vHalf)); ctx.lineTo(X(0), Y(vHalf)); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle="#cc5500"; ctx.beginPath(); ctx.arc(X(sHalf), Y(vHalf), 3, 0, Math.PI*2); ctx.fill();
    if (halfMax) halfMax.innerHTML = `Half-max at S = ${f1(sHalf)} (α = ${f2(a)}) → v = ${f1(vHalf)}`;

    const sm = Math.max(0, Math.min(smax, sMarker==null?0:sMarker));
    const vm = ( vmax * sm ) / ( a * km + sm );
    ctx.fillStyle="#2a9d8f"; ctx.beginPath(); ctx.arc(X(sm), Y(vm), 4, 0, Math.PI*2); ctx.fill();
    ctx.setLineDash([3,3]); ctx.strokeStyle="#2a9d8f";
    ctx.beginPath(); ctx.moveTo(X(sm), Y(0)); ctx.lineTo(X(sm), Y(vm)); ctx.lineTo(X(0), Y(vm)); ctx.stroke();
    ctx.setLineDash([]);
    if (live) live.textContent = `S = ${f2(sm)}, v(S) = ${f2(vm)}, α = ${f2(a)}`;
  }

  let playing = false, dir = 1, sAnim = 0, lastT = 0;
  function step(ts){
    if (!playing){ lastT = ts; return; }
    const dt = (ts - lastT) / 1000; lastT = ts;
    const smax = +Smax.value; const speed = +Speed.value;
    sAnim += dir * (speed * smax * dt);
    if (sAnim > smax){ sAnim = smax; dir = -1; }
    if (sAnim < 0){ sAnim = 0; dir = +1; }
    drawAll(sAnim);
    requestAnimationFrame(step);
  }
  function playPause(){
    playing = !playing;
    if (btnPlay) btnPlay.textContent = playing ? "⏸ Pause" : "▶ Play";
    if (playing) requestAnimationFrame((t)=>{ lastT=t; requestAnimationFrame(step); });
  }
  function reset(){
    playing = false; if (btnPlay) btnPlay.textContent = "▶ Play";
    dir = 1; sAnim = 0; drawAll(sAnim);
  }

  [Vmax,Km,I,Ki,Smax,Speed].forEach(el => el && el.addEventListener("input", ()=> drawAll(sAnim)));
  btnPlay && btnPlay.addEventListener("click", playPause);
  btnReset && btnReset.addEventListener("click", reset);
  window.addEventListener("resize", ()=> drawAll(sAnim));

  drawAll(0);
})();
