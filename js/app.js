(function () {
  'use strict';

  // ---- Payment settings: fill these in before going live ----
  // upiId: the shop's UPI ID (e.g. sesco@okhdfcbank). While empty, the Pay button stays off so nobody pays a wrong account.
  var PAY = { upiId: '', payeeName: 'SESCO Solar', upiLimit: 100000 };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile menu
  var header = document.querySelector('.site-header');
  var menuBtn = document.querySelector('.menu-btn');
  function setMenu(open) {
    header.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (menuBtn && header) {
    menuBtn.addEventListener('click', function () { setMenu(!header.classList.contains('open')); });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
  }

  // Header gets a background once you scroll past the top
  var isScrolled = null;
  function onScroll() {
    var now = window.scrollY > 40;
    if (now !== isScrolled) {
      isScrolled = now;
      if (header) header.classList.toggle('scrolled', now);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Pause the looping hero animations while the hero is off screen
  var hero = document.querySelector('.hero');
  if (hasIO && hero) {
    new IntersectionObserver(function (entries) {
      hero.classList.toggle('paused', !entries[0].isIntersecting);
    }).observe(hero);
  }

  // Reveal "Why Sesco" rows as they scroll into view (runs once each)
  var features = document.querySelectorAll('.feature');
  if (!hasIO || reduceMotion) {
    features.forEach(function (f) { f.classList.add('in'); });
  } else {
    var revealIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
    features.forEach(function (f) { revealIO.observe(f); });
  }

  // Count-up numbers (the real numbers are already in the HTML, so search engines and no-JS visitors see them)
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var start = null, duration = 1600;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  if (hasIO && !reduceMotion) {
    var countIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          runCounter(e.target);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { countIO.observe(c); });
  }

  // Order dialog + UPI payment (opens Google Pay / PhonePe / Paytm / any UPI app on phones)
  var dlg = document.getElementById('order-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    var form = document.getElementById('order-form');
    var qtyEl = document.getElementById('order-qty');
    var totalEl = document.getElementById('order-total');
    var noteEl = document.getElementById('order-note');
    var payBtn = document.getElementById('order-pay');
    var fallback = document.getElementById('order-fallback');
    var product = null;
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var money = function (n) { return '\u20B9' + n.toLocaleString('en-IN'); };
    var getQty = function () {
      var q = parseInt(qtyEl.value, 10);
      return isNaN(q) ? 1 : Math.min(99, Math.max(1, q));
    };
    var refresh = function () {
      var total = product.price * getQty();
      totalEl.textContent = money(total);
      var msg = '';
      if (!PAY.upiId) msg = 'Online payment is not switched on yet. Please call us to order.';
      else if (total > PAY.upiLimit) msg = 'UPI allows up to ' + money(PAY.upiLimit) + ' per payment. For larger orders please call us.';
      noteEl.textContent = msg;
      payBtn.disabled = !!msg;
    };
    var showFallback = function () {
      document.getElementById('upi-id').textContent = PAY.upiId;
      fallback.hidden = false;
    };
    document.querySelectorAll('.buy-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        product = { id: b.dataset.id, name: b.dataset.name, price: parseInt(b.dataset.price, 10) };
        document.getElementById('order-product').textContent = product.name + ' \u00B7 ' + money(product.price) + ' each';
        qtyEl.value = 1;
        fallback.hidden = true;
        refresh();
        dlg.showModal();
      });
    });
    document.getElementById('qty-minus').addEventListener('click', function () { qtyEl.value = Math.max(1, getQty() - 1); refresh(); });
    document.getElementById('qty-plus').addEventListener('click', function () { qtyEl.value = Math.min(99, getQty() + 1); refresh(); });
    qtyEl.addEventListener('input', refresh);
    qtyEl.addEventListener('change', function () { qtyEl.value = getQty(); refresh(); });
    dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // click on the backdrop
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.querySelectorAll('input').forEach(function (i) { i.classList.add('touched'); });
      if (!form.reportValidity() || !PAY.upiId) return;
      var total = product.price * getQty();
      var note = 'SESCO ' + product.name + ' x' + getQty();
      var url = 'upi://pay?pa=' + encodeURIComponent(PAY.upiId) + '&pn=' + encodeURIComponent(PAY.payeeName) +
        '&am=' + total.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent(note);
      if (isMobile) {
        window.location.href = url;
        // If no UPI app took over, show the manual option
        setTimeout(function () { if (!document.hidden) showFallback(); }, 1800);
      } else {
        showFallback();
      }
    });
    document.getElementById('upi-copy').addEventListener('click', function () {
      var btn = this;
      if (navigator.clipboard) navigator.clipboard.writeText(PAY.upiId).then(function () { btn.textContent = 'Copied'; });
    });
  }
})();
