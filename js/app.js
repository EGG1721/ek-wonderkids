document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initActiveNavLink();
  initNewsletterForm();
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
function initNewsletterForm() {
  const form = document.getElementById('subscribeForm');
  const emailInput = document.getElementById('email');
  const note = document.getElementById('newsletterNote');
  if (!form || !emailInput || !note) return;

  const defaultNote = note.textContent;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      note.textContent = 'Please enter a valid email address.';
      note.style.color = '#fff';
      note.style.fontWeight = '700';
      return;
    }

    note.textContent = 'Sending...';
    note.style.color = '';
    note.style.fontWeight = '';

    try {
      const response = await fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong.');
      }

      note.textContent = "Thank you! You're now subscribed.";
      note.style.color = '#fff';
      note.style.fontWeight = '700';
      form.reset();

      setTimeout(() => {
        note.textContent = defaultNote;
        note.style.color = '';
        note.style.fontWeight = '';
      }, 5000);

    } catch (error) {
      note.textContent = error.message;
      note.style.color = '#fff';
      note.style.fontWeight = '700';
    }
  });
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
