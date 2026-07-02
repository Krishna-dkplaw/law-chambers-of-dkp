/* ============================================
   LAW CHAMBERS OF DKP — Main JS
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  initNavigation();
  initScrollEffects();
  initRevealAnimations();
  initDisclaimer();
  initFormSubmission();
  initSmoothScroll();
  initFooterAccordion();
});

/* ---------- Footer accordion (tablet + mobile) ---------- */
function initFooterAccordion() {
  const compact = window.matchMedia('(max-width: 1024px)');
  const cols = Array.from(document.querySelectorAll('.footer-col'));
  if (!cols.length) return;

  // Animate to the list's real height so open/close are smooth and the
  // content below moves gradually (no snap).
  function setOpen(col, open) {
    const list = col.querySelector('.footer-list');
    col.classList.toggle('open', open);
    if (!list) return;
    list.style.maxHeight = open ? list.scrollHeight + 'px' : '0px';
  }

  // Apply the right state for the current viewport.
  function sync() {
    cols.forEach((col, i) => {
      const list = col.querySelector('.footer-list');
      if (!list) return;
      if (compact.matches) {
        // First section open by default; keep any user-toggled state otherwise.
        const open = col.classList.contains('open') || i === 0;
        setOpen(col, open);
      } else {
        // Desktop: clear inline height so the full footer shows.
        col.classList.remove('open');
        list.style.maxHeight = '';
      }
    });
  }

  cols.forEach(col => {
    const heading = col.querySelector('h5');
    if (!heading) return;
    heading.addEventListener('click', () => {
      if (!compact.matches) return;
      setOpen(col, !col.classList.contains('open'));
    });
  });

  sync();
  compact.addEventListener('change', sync);
}

/* ---------- Navigation ---------- */
function initNavigation() {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navMenu.classList.toggle('open');
      document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
    });

    // Close menu when a link is clicked
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('open');
        navMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Dropdown toggle (click — primarily for mobile / touch)
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  dropdowns.forEach(dd => {
    const toggle = dd.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = dd.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // Close any open dropdown when clicking outside it
  document.addEventListener('click', (e) => {
    dropdowns.forEach(dd => {
      if (!dd.contains(e.target)) {
        dd.classList.remove('open');
        const t = dd.querySelector('.nav-dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Scroll effect on header
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  });

  // Highlight active nav link based on current page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Highlight dropdown when one of its child pages is active
  document.querySelectorAll('.nav-dropdown').forEach(dd => {
    const links = dd.querySelectorAll('.nav-dropdown-link');
    links.forEach(link => {
      if (link.getAttribute('href') === currentPath) {
        link.classList.add('active');
        const toggle = dd.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.classList.add('active');
      }
    });
  });
}

/* ---------- Scroll Effects ---------- */
function initScrollEffects() {
  // Parallax for hero background
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      if (scrolled < window.innerHeight) {
        heroBg.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    });
  }
}

/* ---------- Reveal Animations ---------- */
function initRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}

/* ---------- Disclaimer Modal ---------- */
function initDisclaimer() {
  const overlay = document.querySelector('.disclaimer-overlay');
  if (!overlay) return;

  const accepted = sessionStorage.getItem('dkp_disclaimer_accepted');
  if (accepted === 'true') {
    overlay.style.display = 'none';
    return;
  }

  // Show on load + lock background scroll
  setTimeout(() => {
    overlay.classList.add('visible');
    document.body.classList.add('disclaimer-open');
  }, 600);

  const acceptBtn = document.querySelector('.disclaimer-accept');
  const declineBtn = document.querySelector('.disclaimer-decline');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      sessionStorage.setItem('dkp_disclaimer_accepted', 'true');
      overlay.classList.remove('visible');
      document.body.classList.remove('disclaimer-open');
      setTimeout(() => { overlay.style.display = 'none'; }, 400);
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      window.location.href = 'https://www.google.com';
    });
  }
}

/* ---------- Form Submission ---------- */
function initFormSubmission() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.textContent = 'Message Sent';
      form.reset();
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, 2400);
    }, 1200);
  });
}

/* ---------- Smooth Scroll for anchors ---------- */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = document.querySelector('.site-header').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });
}
