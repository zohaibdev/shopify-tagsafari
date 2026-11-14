// Cart drawer and cart page behaviour (sections/ts-cart-drawer.liquid, sections/ts-cart.liquid).
// - Every add-to-cart form posts to /cart/add.js and opens the drawer (no redirect to /cart).
// - Quantity / remove changes use /cart/change.js and re-render the drawer and cart page through the
//   Section Rendering API (the "sections" parameter), so prices, discounts and totals come from Shopify.
// Sticky site header height as --ts-header-h, used by sticky page elements (policy contents, product gallery).
(function() {
  var header = document.getElementById('shopify-section-header');
  var set = function() {
    var h = header && getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0;
    document.documentElement.style.setProperty('--ts-header-h', h + 'px');
  };
  set();
  window.addEventListener('resize', set);
})();

(function() {
  var drawer = document.querySelector('[data-cart-drawer]');
  if (!drawer) return;
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var panel = drawer.querySelector('.ts-drawer__panel');
  var lastTrigger = null;
  var SECTIONS = ['ts-cart-drawer'];
  if (document.querySelector('[data-cart-page]')) SECTIONS.push('ts-cart');

  // ---------- open / close ----------
  var focusables = function() {
    return [].slice.call(panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])'))
      .filter(function(el) { return el.offsetParent !== null; });
  };
  var open = function(trigger) {
    lastTrigger = trigger || document.activeElement;
    drawer.removeAttribute('inert');
    drawer.setAttribute('aria-hidden', 'false');
    var wasOpen = drawer.classList.contains('is-open');
    drawer.classList.add('is-open');
    // Item fade-in plays on opening only, not when the cart re-renders while open.
    if (!wasOpen) {
      drawer.classList.add('is-animating');
      clearTimeout(drawer._animTimer);
      drawer._animTimer = setTimeout(function() { drawer.classList.remove('is-animating'); }, 800);
    }
    document.documentElement.classList.add('ts-scroll-lock');
    var first = panel.querySelector('.ts-drawer__close');
    (first || panel).focus();
  };
  var close = function() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    document.documentElement.classList.remove('ts-scroll-lock');
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  };
  window.tsCartDrawer = { open: open, close: close };

  drawer.addEventListener('click', function(e) {
    if (e.target.closest('[data-cart-close]')) close();
  });
  document.addEventListener('keydown', function(e) {
    if (!drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // Header cart icons open the drawer instead of going to /cart (except on the cart page itself).
  document.addEventListener('click', function(e) {
    var link = e.target.closest('#cart-count-desktop > a, a.cart-count, .header-navigation a[href$="/cart"], #shopify-section-header a[href$="/cart"]');
    if (!link || document.querySelector('[data-cart-page]') || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    open(link);
  });

  // ---------- rendering ----------
  var updateCount = function(count) {
    document.querySelectorAll('.cartCountSelector').forEach(function(el) {
      el.textContent = count;
      el.classList.toggle('hidden', count < 1);
    });
  };
  var renderSections = function(sections) {
    if (!sections) return;
    if (sections['ts-cart-drawer']) {
      var fresh = new DOMParser().parseFromString(sections['ts-cart-drawer'], 'text/html').querySelector('[data-cart-drawer-inner]');
      var current = drawer.querySelector('[data-cart-drawer-inner]');
      if (fresh && current) {
        current.replaceWith(fresh);
        updateCount(parseInt(fresh.getAttribute('data-cart-count'), 10) || 0);
      }
    }
    if (sections['ts-cart']) {
      var page = document.querySelector('[data-cart-page]');
      var freshPage = new DOMParser().parseFromString(sections['ts-cart'], 'text/html').querySelector('[data-cart-page]');
      if (page && freshPage) page.replaceWith(freshPage);
    }
  };
  var announce = function(message, scope) {
    var status = (scope || document).querySelector('[data-cart-status]') || drawer.querySelector('[data-cart-status]');
    if (status) status.textContent = message;
  };

  // ---------- add to cart ----------
  var showFormError = function(form, message) {
    var box = form.querySelector('.ts-cart-error');
    if (!box) {
      box = document.createElement('p');
      box.className = 'ts-cart-error';
      box.setAttribute('role', 'alert');
      var button = form.querySelector('[type="submit"], [name="add"]');
      (button ? button.parentNode : form).appendChild(box);
    }
    box.textContent = message;
  };

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form.matches || !form.matches('form[action*="/cart/add"]') || form.hasAttribute('data-no-drawer')) return;
    // Capture phase: stop the theme's own AJAX handler and the normal redirect to /cart.
    e.preventDefault();
    e.stopImmediatePropagation();
    var button = e.submitter || form.querySelector('[type="submit"], [name="add"]');
    if (button && button.disabled) return;
    var oldError = form.querySelector('.ts-cart-error');
    if (oldError) oldError.remove();
    if (button) { button.classList.add('is-loading'); button.setAttribute('aria-busy', 'true'); button.disabled = true; }

    var body = new FormData(form);
    body.append('sections', SECTIONS.join(','));
    body.append('sections_url', window.location.pathname);
    fetch(root + 'cart/add.js', { method: 'POST', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: body })
      .then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); })
      .then(function(res) {
        if (!res.ok) {
          // e.g. 422: sold out, or more than the available quantity.
          showFormError(form, res.data.description || res.data.message || 'Sorry, this item could not be added.');
          return;
        }
        renderSections(res.data.sections);
        if (window.jQuery && jQuery.fancybox && jQuery.fancybox.getInstance()) jQuery.fancybox.close();
        open(button);
        announce((res.data.product_title || 'Item') + ' added to your cart.');
      })
      .catch(function() { showFormError(form, 'Sorry, something went wrong. Please try again.'); })
      .then(function() {
        if (button) { button.classList.remove('is-loading'); button.removeAttribute('aria-busy'); button.disabled = false; }
      });
  }, true);

  // ---------- quantity / remove (drawer and cart page) ----------
  var busy = false;
  var change = function(line, quantity, scope) {
    if (busy) return;
    busy = true;
    var container = scope.closest('[data-cart-drawer-inner], [data-cart-page]');
    if (container) container.classList.add('is-updating');
    fetch(root + 'cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: line, quantity: Math.max(0, quantity), sections: SECTIONS, sections_url: window.location.pathname })
    })
      .then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); })
      .then(function(res) {
        if (!res.ok) { announce(res.data.description || res.data.message || 'Sorry, that quantity is not available.', container); return; }
        renderSections(res.data.sections);
        var focusTarget = document.querySelector((container && container.matches('[data-cart-page]') ? '[data-cart-page]' : '[data-cart-drawer-inner]') + ' [data-cart-line="' + line + '"] [data-cart-qty-input]');
        if (focusTarget) focusTarget.focus();
        announce(quantity > 0 ? 'Cart updated.' : 'Item removed from your cart.');
      })
      .catch(function() { announce('Sorry, the cart could not be updated. Please try again.', container); })
      .then(function() {
        busy = false;
        var stale = document.querySelector('.is-updating');
        if (stale) stale.classList.remove('is-updating');
      });
  };

  document.addEventListener('click', function(e) {
    var target = e.target.closest('[data-cart-qty], [data-cart-remove]');
    if (!target) return;
    var lineEl = target.closest('[data-cart-line]');
    if (!lineEl) return;
    e.preventDefault();
    var qty = target.hasAttribute('data-cart-remove') ? 0 : parseInt(target.getAttribute('data-cart-qty'), 10);
    change(parseInt(lineEl.getAttribute('data-cart-line'), 10), qty, target);
  });
  document.addEventListener('change', function(e) {
    var input = e.target.closest('[data-cart-qty-input]');
    if (!input) return;
    var lineEl = input.closest('[data-cart-line]');
    var value = parseInt(input.value, 10);
    if (lineEl && !isNaN(value)) change(parseInt(lineEl.getAttribute('data-cart-line'), 10), value, input);
  });

  // ---------- cart page: note autosave, discount code at checkout ----------
  var noteTimer;
  document.addEventListener('input', function(e) {
    if (!e.target.matches('[data-cart-note]')) return;
    clearTimeout(noteTimer);
    var note = e.target.value;
    noteTimer = setTimeout(function() {
      fetch(root + 'cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: note }) });
    }, 500);
  });
  document.addEventListener('click', function(e) {
    var checkout = e.target.closest('[data-cart-checkout]');
    if (!checkout) return;
    var code = document.querySelector('[data-cart-discount]');
    if (code && code.value.trim()) {
      e.preventDefault();
      var go = function() { window.location.href = root + 'checkout?discount=' + encodeURIComponent(code.value.trim()); };
      // Save a just-typed note first; the normal form submit would have sent it.
      var note = document.querySelector('[data-cart-note]');
      clearTimeout(noteTimer);
      if (note) {
        fetch(root + 'cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: note.value }) }).then(go, go);
      } else {
        go();
      }
    }
  });
})();
