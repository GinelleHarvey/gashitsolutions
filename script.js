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
