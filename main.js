// ── WhatsApp settings ─────────────────────────────────────────────
// Phone number in international format, digits only (972 + number without the leading 0).
// e.g. 050-123-4567 → '972501234567'
const WHATSAPP_NUMBER = '972528772726';
// Optional: a scheduling link (Calendly, Google Calendar…). Empty = book via WhatsApp.
const BOOKING_URL = '';
// The "השאירו פרטים" form is emailed through Web3Forms to msddfz@gmail.com.
// The key comes from web3forms.com for that address; it's safe to publish (it can only send there).
const WEB3FORMS_KEY = 'e83a949d-8344-4833-b392-664b2e3e14f2';

const MESSAGES = {
  general: 'היי מיטל, אשמח לשמוע על שירותי המשרד',
  tender: 'היי מיטל, יש לי מכרז שאשמח לעזרה בהגשה שלו',
  book: 'היי מיטל, אשמח לתאם שיחת היכרות',
};
// ──────────────────────────────────────────────────────────────────

const phone = WHATSAPP_NUMBER.replace(/\D/g, '');
const waLink = text => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

document.querySelectorAll('[data-wa]').forEach(a => {
  const kind = a.dataset.wa;
  a.href = kind === 'book' && BOOKING_URL ? BOOKING_URL : waLink(MESSAGES[kind] || MESSAGES.general);
});

const local = phone.startsWith('972') ? '0' + phone.slice(3) : phone;
document.querySelectorAll('[data-phone-display]').forEach(el => {
  el.textContent = local.replace(/^(\d{3})(\d{3})(\d+)$/, '$1-$2-$3');
});

// Phone section bar: highlight the section being read and keep its button in view.
const quickNav = document.getElementById('quick-nav');
const quickLinks = [...quickNav.querySelectorAll('a')];
const setActive = id => {
  quickLinks.forEach(a => {
    const on = a.getAttribute('href') === '#' + id;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    if (on && quickNav.offsetParent) {
      const n = quickNav.getBoundingClientRect(), r = a.getBoundingClientRect();
      quickNav.scrollBy({ left: r.left + r.width / 2 - (n.left + n.width / 2), behavior: 'smooth' });
    }
  });
};
if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
    { rootMargin: '-45% 0px -50% 0px' });
  quickLinks.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });
  spy.observe(document.getElementById('top'));
}

// Lead form → emails the visitor's details to Meital.
const form = document.getElementById('lead-form');
const thanks = document.getElementById('thanks');
const submitBtn = form.querySelector('button[type=submit]');
const formError = document.getElementById('form-error');
document.getElementById('form-error-wa').href = waLink(MESSAGES.general);

form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(form);
  const name = data.get('name').trim();
  const email = data.get('email').trim();
  const payload = {
    access_key: WEB3FORMS_KEY,
    subject: `פנייה חדשה מהאתר: ${name}`,
    from_name: 'אתר מיטל · שירותי משרד',
    botcheck: data.get('botcheck') ? true : '',
    'שם': name,
    'טלפון': data.get('phone').trim(),
    'אימייל': email || '—',
    'במה אפשר לעזור': data.get('msg').trim() || '—',
  };
  if (email) payload.replyto = email;

  formError.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'שולחת...';
  try {
    if (!WEB3FORMS_KEY) throw new Error('WEB3FORMS_KEY is not set');
    // Give up after 20s so a hung connection falls through to the WhatsApp fallback.
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.success) throw new Error(out.message || res.status);
    document.getElementById('thanks-name').textContent = name;
    form.hidden = true;
    thanks.hidden = false;
  } catch (err) {
    console.error('Lead form failed:', err);
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'חזרו אליי';
  }
});

// Scroll reveal: fade sections up as they enter the viewport; [data-stagger] staggers its children.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  document.querySelectorAll('[data-stagger]').forEach(group => {
    [...group.children].forEach((el, i) => {
      el.classList.add('reveal');
      el.dataset.delay = i * 90;
    });
  });
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const d = +el.dataset.delay || 0;
    el.style.transitionDelay = d + 'ms';
    el.classList.add('is-in');
    setTimeout(() => { el.style.transitionDelay = ''; }, d + 1000);
    io.unobserve(el);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.documentElement.classList.add('js-reveal');
  requestAnimationFrame(() => document.querySelectorAll('.reveal').forEach(el => io.observe(el)));
}
