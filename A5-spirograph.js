/* A5 — Spirograph (HTML5 Canvas) — COP 4813 */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('c'); const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  // UI
  const curveType = $('curveType');
  const RIn = $('R'), rIn = $('r'), OIn = $('O');
  const startBtn = $('startBtn'), clearBtn = $('clearBtn'), saveBtn = $('saveBtn');
  const randomize = $('randomize'), drunk = $('drunk');
  const dtIn = $('dt'), lwIn = $('lw');
  const colorMode = $('colorMode'), theme = $('theme');
  const solidColor = $('solidColor'), solidWrap = $('solidColorWrap');

  // state
  let t = 0, reqId = null, tLimit = 0;
  let params = { R: 180, r: 75, O: 40, type: 'epitrochoid' };
  let dt = parseFloat(dtIn.value);
  let hue = 0;

  // --- utilities ---
  function gcd(a,b){ return b ? gcd(b, a % b) : Math.abs(a); }

  function resizeCanvas(){
    // keep CSS height ~520px but render crisp using DPR
    const cssW = canvas.clientWidth || 980;
    const cssH = 520;
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBackground();
  }

  function center(x,y){ return [canvas.width/dpr/2 + x, canvas.height/dpr/2 + y]; }

  function paintBackground(){
    const light = theme.value === 'light';
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0); // fill in device pixels
    ctx.fillStyle = light ? '#ffffff' : '#050a16';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  function newPulseColor() {
    ctx.strokeStyle = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
  }

  function setStrokeByMode(progress){
    ctx.lineWidth = parseFloat(lwIn.value);
    switch(colorMode.value){
      case 'solid':
        ctx.strokeStyle = solidColor.value;
        break;
      case 'rainbow':
        // progress 0..1 → hue sweep
        ctx.strokeStyle = `hsl(${(progress*360)|0}, 100%, 50%)`;
        break;
      case 'pulses':
        if (Math.random() < 0.08) newPulseColor();
        break;
    }
  }

  function pos(type, t, R, r, O){
    if (type === 'hypotrochoid'){
      const k = (R - r) / r;
      const x = (R - r) * Math.cos(t) + O * Math.cos(k * t);
      const y = (R - r) * Math.sin(t) - O * Math.sin(k * t);
      return center(x, y);
    } else {
      const k = (R + r) / r;
      const x = (R + r) * Math.cos(t) - (r + O) * Math.cos(k * t);
      const y = (R + r) * Math.sin(t) - (r + O) * Math.sin(k * t);
      return center(x, y);
    }
  }

  function validateAndGet() {
    let R = Number(RIn.value), r = Number(rIn.value), O = Number(OIn.value);
    const type = curveType.value;

    if (randomize.checked) {
      R = Math.floor(60 + Math.random()*180);   // 60–240
      r = Math.floor(10 + Math.random()*150);   // 10–160
      O = Math.floor(Math.random()*120);        // 0–120
      if (r > R) [R, r] = [r, R];
      RIn.value = R; rIn.value = r; OIn.value = O;
      randomize.checked = false; // one-shot
    }

    if (!(R >= 60 && R <= 240)) { alert('R must be between 60 and 240.'); return null; }
    if (!(r >= 10 && r <= 160)) { alert('r must be between 10 and 160.'); return null; }
    if (r > R) { alert('Requirement: r cannot be greater than R.'); return null; }
    if (!(O >= 0 && O <= 160)) { alert('O must be between 0 and 160.'); return null; }

    return { R, r, O, type };
  }

  function periodFor(type, R, r){
    // exact closure
    if (type === 'hypotrochoid') return (2*Math.PI * r) / gcd(R, r);
    return (2*Math.PI * r) / gcd(R + r, r); // epitrochoid
  }

  function clearCanvas(){
    cancelAnimationFrame(reqId); reqId = null;
    t = 0; paintBackground();
  }

  // --- main draw loop ---
  function draw() {
    const { R, r, O, type } = params;

    // drunk wobble (small random walk)
    let Rw = R, rw = r;
    if (drunk.checked){ Rw += 2*Math.random()-1; rw += 2*Math.random()-1; }

    const p = t / tLimit; // 0..1 progress for color ramp
    setStrokeByMode(p);

    const [x1, y1] = pos(type, t, Rw, rw, O);
    const [x2, y2] = pos(type, t + dt, Rw, rw, O);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    t += dt;
    if (t >= tLimit){
      startBtn.disabled = false;
      startBtn.setAttribute('aria-pressed','false');
      startBtn.textContent = 'Start Spirograph';
      reqId = null;
      return;
    }
    reqId = requestAnimationFrame(draw);
  }

  // --- events ---
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  colorMode.addEventListener('change', () => {
    solidWrap.classList.toggle('hidden', colorMode.value !== 'solid');
  });

  dtIn.addEventListener('input', () => dt = parseFloat(dtIn.value));

  startBtn.addEventListener('click', () => {
    if (reqId) return; // single start button behavior
    const v = validateAndGet(); if (!v) return;
    params = v; dt = parseFloat(dtIn.value);
    clearCanvas();
    // initial color seed
    if (colorMode.value === 'pulses') newPulseColor();
    // compute exact closure limit for selected type
    tLimit = periodFor(params.type, params.R, params.r);
    startBtn.disabled = true;
    startBtn.setAttribute('aria-pressed','true');
    startBtn.textContent = 'Drawing…';
    reqId = requestAnimationFrame(draw);
  });

  clearBtn.addEventListener('click', clearCanvas);

  saveBtn.addEventListener('click', () => {
    // export CSS-sized bitmap
    const a = document.createElement('a');
    a.download = 'spirograph.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  theme.addEventListener('change', paintBackground);

  // Presets inspired by gallery styles
  document.querySelectorAll('.presets button').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      // defaults that look good
      theme.value = (p === 'sunburst' || p === 'gear') ? 'dark' : 'light';
      colorMode.value = (p === 'sunburst' || p === 'flower') ? 'rainbow' : 'pulses';
      solidWrap.classList.toggle('hidden', colorMode.value !== 'solid');

      switch(p){
        case 'daisy':       curveType.value='hypotrochoid'; RIn.value=210; rIn.value=70;  OIn.value=60; break;
        case 'star':        curveType.value='epitrochoid';  RIn.value=170; rIn.value=68;  OIn.value=25; break;
        case 'sunburst':    curveType.value='epitrochoid';  RIn.value=200; rIn.value=40;  OIn.value=95; break;
        case 'flower':      curveType.value='hypotrochoid'; RIn.value=180; rIn.value=54;  OIn.value=36; break;
        case 'gear':        curveType.value='hypotrochoid'; RIn.value=200; rIn.value=50;  OIn.value=10; break;
        case 'ring':        curveType.value='epitrochoid';  RIn.value=180; rIn.value=120; OIn.value=8;  break;
      }
      // don’t auto-start; keeps the “single start button” requirement
    });
  });

})();
