/* A5 — Spirograph (HTML5 Canvas) — COP 4813 */
(function () {
  const $ = (id) => document.getElementById(id);
  const canvas = $('c');
  const ctx = canvas.getContext('2d');

  const RIn = $('R'), rIn = $('r'), OIn = $('O');
  const startBtn = $('startBtn'), clearBtn = $('clearBtn');
  const randomize = $('randomize'), drunk = $('drunk'), colorShift = $('colorShift');

  let t = 0, reqId = null, params = { R: 180, r: 75, O: 40 };
  const dt = 0.035;

  function gcd(a,b){ return b ? gcd(b,a%b) : Math.abs(a); }

  function center(x,y){
    return [canvas.width/2 + x, canvas.height/2 + y];
  }

  function newColor(){
    const c = '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
    ctx.strokeStyle = c;
  }

  function pos(t,R,r,O){
    const k = (R + r) / r;
    const x = (R + r) * Math.cos(t) - (r + O) * Math.cos(k*t);
    const y = (R + r) * Math.sin(t) - (r + O) * Math.sin(k*t);
    return center(x,y);
  }

  function validate(){
    let R = +RIn.value, r = +rIn.value, O = +OIn.value;
    if (randomize.checked){
      R = Math.floor(60 + Math.random()*180);
      r = Math.floor(10 + Math.random()*150);
      O = Math.floor(Math.random()*120);
      if (r > R) [R,r] = [r,R];
      RIn.value = R; rIn.value = r; OIn.value = O;
    }
    if (!(R>=60 && R<=240)) return alert('R must be 60–240'), null;
    if (!(r>=10 && r<=160)) return alert('r must be 10–160'), null;
    if (r > R)           return alert('Requirement: r cannot be greater than R.'), null;
    if (!(O>=0 && O<=160)) return alert('O must be 0–160'), null;
    return {R,r,O};
  }

  function clearCanvas(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ffffff';      // match A4 (white canvas)
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  clearCanvas();

  function stepsToClose(R,r){
    const period = (2*Math.PI*r)/gcd(R+r,r); // epitrochoid
    return Math.ceil(period/dt);
  }

  let tLimit = 0;

  function draw(){
    let {R,r,O} = params;
    if (drunk.checked){ R += 2*Math.random()-1; r += 2*Math.random()-1; }

    const [x1,y1] = pos(t,R,r,O);
    const [x2,y2] = pos(t+dt,R,r,O);

    ctx.lineWidth = 1.5;
    if (colorShift.checked && Math.random() < 0.08) newColor();
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();

    t += dt;
    if (t >= tLimit){
      startBtn.disabled = false; startBtn.setAttribute('aria-pressed','false');
      startBtn.textContent = 'Start Spirograph';
      cancelAnimationFrame(reqId); reqId = null; return;
    }
    reqId = requestAnimationFrame(draw);
  }

  startBtn.addEventListener('click', () => {
    if (reqId) return;                 // single start button behavior
    const v = validate(); if (!v) return;
    params = v; t = 0; clearCanvas(); newColor();
    tLimit = stepsToClose(params.R, params.r);
    startBtn.disabled = true; startBtn.setAttribute('aria-pressed','true');
    startBtn.textContent = 'Drawing…';
    reqId = requestAnimationFrame(draw);
  });

  clearBtn.addEventListener('click', () => {
    if (reqId){ cancelAnimationFrame(reqId); reqId = null; }
    startBtn.disabled = false; startBtn.setAttribute('aria-pressed','false');
    startBtn.textContent = 'Start Spirograph';
    clearCanvas();
  });
})();
