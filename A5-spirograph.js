/* A5 — Spirograph (HTML5 Canvas) — COP 4813
   Requirements covered:
   - Single Start button draws on a blank canvas
   - Uses provided equation
   - Supports either random R,r,O OR user-entered values with validation
*/

(function () {
  const $ = (id) => document.getElementById(id);

  const canvas = $('c');
  const ctx = canvas.getContext('2d');

  const RIn = $('R');
  const rIn = $('r');
  const OIn = $('O');
  const startBtn = $('startBtn');
  const clearBtn = $('clearBtn');
  const randomize = $('randomize');
  const drunk = $('drunk');
  const colorShift = $('colorShift');

  // drawing state
  let t = 0;
  let reqId = null;
  let params = { R: 180, r: 75, O: 40 };
  const dt = 0.035; // step size; smaller = smoother/slower

  function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }

  function centerAndScale(x, y) {
    // center canvas and scale to fit nicely
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    return [cx + x, cy + y];
  }

  function newColor() {
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    ctx.strokeStyle = color;
  }

  function getPosition(t, R, r, O) {
    // Given equation from assignment (epitrochoid)
    const k = (R + r) / r;
    const x = (R + r) * Math.cos(t) - (r + O) * Math.cos(k * t);
    const y = (R + r) * Math.sin(t) - (r + O) * Math.sin(k * t);
    return centerAndScale(x, y);
  }

  function validateAndGet() {
    let R = Number(RIn.value);
    let r = Number(rIn.value);
    let O = Number(OIn.value);

    // randomize if selected
    if (randomize.checked) {
      R = Math.floor(60 + Math.random() * 180);   // 60–240
      r = Math.floor(10 + Math.random() * 150);   // 10–160
      O = Math.floor(Math.random() * 120);        // 0–120
      // Ensure r ≤ R
      if (r > R) [R, r] = [r, R];
      RIn.value = R; rIn.value = r; OIn.value = O;
    }

    // hard validation with messages
    if (!(R >= 60 && R <= 240)) { alert('R must be between 60 and 240.'); return null; }
    if (!(r >= 10 && r <= 160)) { alert('r must be between 10 and 160.'); return null; }
    if (r > R) { alert('Requirement: r cannot be greater than R.'); return null; }
    if (!(O >= 0 && O <= 160)) { alert('O must be between 0 and 160.'); return null; }

    return { R, r, O };
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // dark background to match your site
    ctx.fillStyle = '#050a16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  clearCanvas();

  function stepsToClose(R, r) {
    // period for epitrochoid: 2π * r / gcd(R+r, r)
    const period = (2 * Math.PI * r) / gcd(R + r, r);
    return Math.ceil(period / dt);
  }

  function draw() {
    const { R, r, O } = params;

    // optional "drunk" wobble (professor’s suggestion)
    let Rw = R, rw = r;
    if (drunk.checked) {
      rw += 2 * Math.random() - 1;
      Rw += 2 * Math.random() - 1;
    }

    const [x1, y1] = getPosition(t, Rw, rw, O);
    const [x2, y2] = getPosition(t + dt, Rw, rw, O);

    ctx.lineWidth = 1.5;
    if (colorShift.checked && Math.random() < 0.08) newColor();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    t += dt;

    if (t >= tLimit) {
      // finished
      startBtn.disabled = false;
      startBtn.setAttribute('aria-pressed', 'false');
      startBtn.textContent = 'Start Spirograph';
      cancelAnimationFrame(reqId);
      reqId = null;
      return;
    }
    reqId = requestAnimationFrame(draw);
  }

  let tLimit = 0;

  startBtn.addEventListener('click', () => {
    if (reqId) {
      // ignore while running (single start button requirement)
      return;
    }
    const v = validateAndGet();
    if (!v) return;
    params = v;

    clearCanvas();
    t = 0;
    tLimit = stepsToClose(params.R, params.r);
    newColor(); // set initial color
    startBtn.disabled = true;
    startBtn.setAttribute('aria-pressed', 'true');
    startBtn.textContent = 'Drawing…';
    reqId = requestAnimationFrame(draw);
  });

  clearBtn.addEventListener('click', () => {
    if (reqId) {
      cancelAnimationFrame(reqId);
      reqId = null;
    }
    startBtn.disabled = false;
    startBtn.setAttribute('aria-pressed', 'false');
    startBtn.textContent = 'Start Spirograph';
    clearCanvas();
  });
})();
