// Size guide: category tabs, inch/cm toggle and scroll hints. Used by sections/ts-size-chart.liquid and
// the product size popup (snippets/size_popup.liquid), which calls window.tsSizeChart on loaded content.
  window.tsSizeChart = window.tsSizeChart || function(root) {
    if (!root || root.dataset.sizeReady) return;
    root.dataset.sizeReady = 'true';
    var tabs = [].slice.call(root.querySelectorAll('[data-size-tab]'));
    var select = function(tab, focus) {
      tabs.forEach(function(t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        root.querySelector('[data-size-panel="' + t.getAttribute('data-size-tab') + '"]').hidden = !on;
      });
      if (focus) tab.focus();
      updateFades();
    };
    tabs.forEach(function(tab, i) {
      tab.addEventListener('click', function() { select(tab); });
      tab.addEventListener('keydown', function(e) {
        var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (next === null) return;
        e.preventDefault();
        select(tabs[(next + tabs.length) % tabs.length], true);
      });
    });

    // Inches -> centimetres. Only values marked with an inch sign are converted; "cm" cells stay as they are.
    var cells = [].slice.call(root.querySelectorAll('[data-size-cell]'));
    cells.forEach(function(c) { c.setAttribute('data-in', c.textContent); });
    var toCm = function(text) {
      if (text.indexOf('"') === -1 && text.indexOf('”') === -1) return text;
      return text.replace(/(\d+)(?:\s+(\d+)\/(\d+))?\s*["”]/g, function(m, whole, num, den) {
        var inches = parseInt(whole, 10) + (num ? parseInt(num, 10) / parseInt(den, 10) : 0);
        return (Math.round(inches * 2.54 * 2) / 2).toString() + ' cm';
      });
    };
    var unitButtons = [].slice.call(root.querySelectorAll('[data-size-unit]'));
    var setUnit = function(unit) {
      unitButtons.forEach(function(b) { b.setAttribute('aria-pressed', b.getAttribute('data-size-unit') === unit); });
      cells.forEach(function(c) { c.textContent = unit === 'cm' ? toCm(c.getAttribute('data-in')) : c.getAttribute('data-in'); });
      try { localStorage.setItem('tsSizeUnit', unit); } catch (e) {}
    };
    unitButtons.forEach(function(b) { b.addEventListener('click', function() { setUnit(b.getAttribute('data-size-unit')); }); });
    var saved = null;
    try { saved = localStorage.getItem('tsSizeUnit'); } catch (e) {}
    setUnit(saved === 'cm' || saved === 'in' ? saved : root.getAttribute('data-default-unit') || 'in');

    // Fade hint on tables that scroll sideways.
    var wraps = [].slice.call(root.querySelectorAll('[data-size-scroll]'));
    var updateFades = function() {
      wraps.forEach(function(w) {
        var s = w.firstElementChild;
        w.classList.toggle('can-scroll-right', s.scrollLeft + s.clientWidth < s.scrollWidth - 2);
        w.classList.toggle('can-scroll-left', s.scrollLeft > 2);
      });
    };
    wraps.forEach(function(w) { w.firstElementChild.addEventListener('scroll', updateFades, { passive: true }); });
    window.addEventListener('resize', updateFades);
    updateFades();

    // Show the chart matching a product (used by the size popup): pick its tab and scroll to it.
    root.showForTags = function(tags) {
      var match = [].slice.call(root.querySelectorAll('[data-size-tags]')).filter(function(chart) {
        var list = chart.getAttribute('data-size-tags').split(',').map(function(t) { return t.trim(); }).filter(Boolean);
        return list.some(function(t) { return tags.indexOf(t) > -1; });
      })[0];
      if (!match) return false;
      var panel = match.closest('[data-size-panel]');
      var tab = root.querySelector('[data-size-tab="' + panel.getAttribute('data-size-panel') + '"]');
      if (tab) select(tab);
      match.classList.add('is-highlighted');
      match.scrollIntoView({ block: 'start' });
      return true;
    };
  };

document.querySelectorAll('[data-size-chart]').forEach(function(root) { window.tsSizeChart(root); });
