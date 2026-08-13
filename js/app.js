document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initActiveNavLink();
  //initNewsletterForm();   // ← esta función ya no existe, y truena aquí
  initFamilyKitForm();    // ← por eso ESTA LÍNEA NUNCA SE EJECUTA
});

// ============ Mobile nav toggle ============
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.classList.toggle('is-active', isOpen);
  });

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-active');
    });
  });
}

// ============ Highlight nav link for section in view ============
function initActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          const matches = link.getAttribute('href') === `#${id}`;
          link.classList.toggle('is-active', matches);
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}

// ============ Newsletter form ============
function initFamilyKitForm() {
  const form = document.getElementById('resource-form-kit');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const note = document.getElementById('kitNote');
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Sending...';
    note.textContent = '';

    const payload = {
      name: form.name.value,
      email: form.email.value,
      book: form.book.value // "family_kit"
    };

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Swap to success state instead of leaving the page
        document.getElementById('kitFormWrap').style.display = 'none';
        document.getElementById('kitSuccess').style.display = 'block';

        gtag('event', 'email_signup', { resource: 'book_en_04', source_page: 'book_en_04_hero' });
        gtag('event', 'free_resource_download', { resource: 'book_en_04' });
        gtag('event', 'email_signup', { resource: 'family_kit', source_page: 'index_newsletter' });
        gtag('event', 'free_resource_download', { resource: 'family_kit' });
        gtag('event', 'email_signup', { resource: 'book_en_04', source_page: 'seeds_of_wealth_landing' });
        gtag('event', 'free_resource_download', { resource: 'book_en_04' });

        // Dispara la descarga sin sacar al usuario de la página
        const dl = document.createElement('iframe');
        dl.style.display = 'none';
        dl.src = data.downloadUrl;
        document.body.appendChild(dl);
      } else {
        note.textContent = data.error || 'Something went wrong, please try again.';
        note.style.color = '#fff';
        note.style.fontWeight = '700';
        btn.disabled = false;
        btn.textContent = originalText;
      }
    } catch (err) {
      note.textContent = 'Connection error, please try again.';
      note.style.color = '#fff';
      note.style.fontWeight = '700';
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
