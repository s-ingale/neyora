/* ============================================================
   NEYORA — storefront behaviour
   No dependencies. Front-end only: the bag lives in localStorage
   until a real backend is wired up.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: solidify once we leave the hero ---------- */
  var head = $('#siteHead');
  var onScroll = function () {
    head.classList.toggle('stuck', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  var revealables = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('seen'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Mobile menu ---------- */
  var burger = $('#burger');
  var menu   = $('#mobileMenu');

  function setMenu(open) {
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('in'); });
      document.body.classList.add('locked');
    } else {
      menu.classList.remove('in');
      document.body.classList.remove('locked');
      window.setTimeout(function () {
        if (!menu.classList.contains('in')) menu.hidden = true;
      }, 320);
    }
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  $$('#mobileMenu a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  /* ---------- Toast ---------- */
  var toast = $('#toast');
  var toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('in');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove('in'); }, 2600);
  }

  /* ---------- Bag ---------- */
  /* v2: prices moved from USD to INR, so any bag saved under v1 holds
     numbers that are meaningless in the new currency. Bump this key
     whenever prices change in a way that old saved bags can't survive. */
  var KEY   = 'neyora.bag.v2';
  var bag   = $('#bag');
  var scrim = $('#scrim');
  var body  = $('#bagBody');
  var countEl = $('#cartCount');
  var totalEl = $('#bagTotal');
  var items = [];

  try {
    var saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) items = saved;
  } catch (err) { items = []; }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) { /* private mode */ }
  }

  /* Indian grouping: ₹1,199 not ₹1199, and ₹1,00,000 not ₹100,000 */
  var inr;
  try {
    inr = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    });
  } catch (err) { inr = null; }

  function money(n) {
    return inr ? inr.format(n) : '₹' + Math.round(n);
  }

  function render() {
    var units = items.reduce(function (n, i) { return n + i.qty; }, 0);
    var total = items.reduce(function (n, i) { return n + i.qty * i.price; }, 0);

    countEl.textContent = String(units);
    countEl.hidden = units === 0;
    totalEl.textContent = money(total);

    if (!items.length) {
      body.innerHTML = '<p class="bag-empty">Your bag is empty — start with one small page.</p>';
      return;
    }

    body.innerHTML = '';
    items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'bag-item';

      var left = document.createElement('div');
      var h = document.createElement('h3');
      h.textContent = item.name;
      var qty = document.createElement('div');
      qty.className = 'bi-qty';

      var minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.setAttribute('aria-label', 'Decrease quantity of ' + item.name);
      var num = document.createElement('span');
      num.textContent = String(item.qty);
      var plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', 'Increase quantity of ' + item.name);

      minus.addEventListener('click', function () { bump(item.id, -1); });
      plus.addEventListener('click',  function () { bump(item.id,  1); });

      qty.appendChild(minus); qty.appendChild(num); qty.appendChild(plus);
      left.appendChild(h); left.appendChild(qty);

      var price = document.createElement('span');
      price.className = 'bi-price';
      price.textContent = money(item.qty * item.price);

      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'bi-remove';
      rm.textContent = 'Remove';
      rm.setAttribute('aria-label', 'Remove ' + item.name + ' from bag');
      rm.addEventListener('click', function () { bump(item.id, -item.qty); });

      row.appendChild(left); row.appendChild(price); row.appendChild(rm);
      body.appendChild(row);
    });
  }

  function bump(id, delta) {
    var found = items.filter(function (i) { return i.id === id; })[0];
    if (!found) return;
    found.qty += delta;
    if (found.qty <= 0) {
      items = items.filter(function (i) { return i.id !== id; });
    }
    persist();
    render();
  }

  function add(product) {
    var found = items.filter(function (i) { return i.id === product.id; })[0];
    if (found) {
      // refresh from the catalogue, never trust the stored copy — otherwise
      // a bag saved before a price change keeps the old price forever
      found.name = product.name;
      found.price = product.price;
      found.qty += 1;
    } else {
      items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    persist();
    render();
  }

  /* Same reasoning on load: wherever the catalogue is on the page, it wins
     over whatever localStorage is holding. */
  (function reconcile() {
    var catalogue = {};
    $$('.card[data-id]').forEach(function (card) {
      catalogue[card.dataset.id] = {
        name: card.dataset.name,
        price: parseFloat(card.dataset.price)
      };
    });
    if (!Object.keys(catalogue).length) return;

    var changed = false;
    items.forEach(function (item) {
      var live = catalogue[item.id];
      if (!live) return;
      if (item.price !== live.price || item.name !== live.name) {
        item.price = live.price;
        item.name = live.name;
        changed = true;
      }
    });
    if (changed) persist();
  })();

  var lastFocus = null;
  function setBag(open) {
    bag.classList.toggle('in', open);
    bag.setAttribute('aria-hidden', String(!open));
    $('#cartBtn').setAttribute('aria-expanded', String(open));
    if (open) {
      lastFocus = document.activeElement;
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('in'); });
      document.body.classList.add('locked');
      $('#bagClose').focus();
    } else {
      scrim.classList.remove('in');
      document.body.classList.remove('locked');
      window.setTimeout(function () {
        if (!scrim.classList.contains('in')) scrim.hidden = true;
      }, 350);
      if (lastFocus) lastFocus.focus();
    }
  }

  $('#cartBtn').addEventListener('click', function () { setBag(!bag.classList.contains('in')); });
  $('#bagClose').addEventListener('click', function () { setBag(false); });
  scrim.addEventListener('click', function () { setBag(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (bag.classList.contains('in')) setBag(false);
    if (menu.classList.contains('in')) setMenu(false);
  });

  $$('.card .btn-add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.card');
      add({
        id: card.dataset.id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price)
      });
      btn.textContent = 'Added ✓';
      btn.classList.add('done');
      say(card.dataset.name + ' added to your bag');
      window.setTimeout(function () {
        btn.textContent = 'Add to bag';
        btn.classList.remove('done');
      }, 1600);
    });
  });

  $('#checkoutBtn').addEventListener('click', function () {
    say(items.length ? 'Checkout arrives with the backend — soon.' : 'Your bag is still empty.');
  });

  render();

})();
