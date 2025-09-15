// ============================
// Global: Footer year
// ============================
document.querySelectorAll('.js-year')
  .forEach(n => n.textContent = new Date().getFullYear());

// ============================
// Contact form page logic
// ============================
const form = document.getElementById('contactForm');
if (form) {
  const phoneEl = document.getElementById('phone');
  const captchaLabel = document.getElementById('captchaLabel');
  const captchaExpected = document.getElementById('captchaExpected');

  // Phone input mask
  phoneEl.addEventListener('input', () => {
    const d = phoneEl.value.replace(/\D/g, '').slice(0,10);
    let out = '';
    if (d.length > 0) out = '(' + d.slice(0,3);
    if (d.length >= 4) out += ')' + d.slice(3,6);
    if (d.length >= 7) out += '-' + d.slice(6,10);
    phoneEl.value = out;
  });

  // Captcha
  const a = Math.floor(Math.random()*8)+2;
  const b = Math.floor(Math.random()*8)+1;
  captchaLabel.textContent = `What is ${a}+${b}?`;
  captchaExpected.value = a+b;

  // Submit handler
  form.addEventListener('submit', e => {
    e.preventDefault();

    const data = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName:  document.getElementById('lastName').value.trim(),
      street:    document.getElementById('street').value.trim(),
      city:      document.getElementById('city').value.trim(),
      state:     document.getElementById('state').value.trim(),
      zip:       document.getElementById('zip').value.trim(),
      phone:     document.getElementById('phone').value.trim(),
      email:     document.getElementById('email').value.trim(),
      birthdate: document.getElementById('birthdate').value,
      message:   document.getElementById('message').value.trim(),
      captcha:   document.getElementById('captcha').value.trim(),
      captchaExpected: captchaExpected.value
    };

    if (data.captcha !== data.captchaExpected) {
      alert('Captcha is incorrect.');
      return;
    }

    sessionStorage.setItem('contactFormData', JSON.stringify(data));
    window.location.href = 'confirm.html';
  });
}

// ============================
// Confirm page logic
// ============================
const review = document.getElementById('review');
if (review) {
  const dataRaw = sessionStorage.getItem('contactFormData');
  if (!dataRaw) window.location.href = 'contact.html';
  const d = JSON.parse(dataRaw);

  review.innerHTML = `
    <div><b>Name:</b> ${d.firstName} ${d.lastName}</div>
    <div><b>Email:</b> ${d.email}</div>
    <div><b>Phone:</b> ${d.phone}</div>
    <div><b>Address:</b> ${d.street}, ${d.city}, ${d.state} ${d.zip}</div>
    <div><b>Birthdate:</b> ${d.birthdate}</div>
    <div><b>Message:</b> ${d.message}</div>
  `;

  document.getElementById('editBtn').onclick = () => {
    window.location.href = 'contact.html';
  };

  document.getElementById('sendBtn').onclick = () => {
    const subject = encodeURIComponent('New contact form submission');
    const body = encodeURIComponent(
      `Name: ${d.firstName} ${d.lastName}\n` +
      `Email: ${d.email}\n` +
      `Phone: ${d.phone}\n` +
      `Address: ${d.street}, ${d.city}, ${d.state} ${d.zip}\n` +
      `Birthdate: ${d.birthdate}\n\n` +
      `Message:\n${d.message}`
    );
    window.location.href = `mailto:info@gashitsolutions.com?subject=${subject}&body=${body}`;
  };
}
