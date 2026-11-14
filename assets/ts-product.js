// Product page: "Read more / Read less" for the description (sections/product-template.liquid).
// A short description shows in full with no toggle; a long one is clamped to about five lines.
(function() {
  document.querySelectorAll('[data-ts-desc]').forEach(function(box) {
    var body = box.querySelector('.ts-desc__body');
    var button = box.querySelector('.ts-desc__toggle');
    if (!body || !button) return;
    var collapsed = 0;

    var measure = function() {
      if (box.classList.contains('is-open')) return;
      box.classList.remove('is-collapsible');
      var full = body.scrollHeight;
      box.classList.add('is-collapsible');
      collapsed = body.clientHeight;
      // Not worth collapsing if it would hide less than about a line.
      var needed = full - collapsed > 24;
      box.classList.toggle('is-collapsible', needed);
      button.hidden = !needed;
    };

    var set = function(open) {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      button.setAttribute('aria-expanded', open);
      button.textContent = open ? button.getAttribute('data-less') : button.getAttribute('data-more');
      if (reduce) {
        body.style.maxHeight = '';
        box.classList.toggle('is-open', open);
        return;
      }
      // Animate between the collapsed height and the real height, then release the fixed value.
      if (open) {
        body.style.maxHeight = body.clientHeight + 'px';
        box.classList.add('is-open');
        body.offsetHeight; // eslint-disable-line no-unused-expressions
        body.style.maxHeight = body.scrollHeight + 'px';
        var done = function() { body.style.maxHeight = 'none'; body.removeEventListener('transitionend', done); };
        body.addEventListener('transitionend', done);
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        body.offsetHeight; // eslint-disable-line no-unused-expressions
        box.classList.remove('is-open');
        body.style.maxHeight = collapsed + 'px';
        var back = function() { body.style.maxHeight = ''; body.removeEventListener('transitionend', back); };
        body.addEventListener('transitionend', back);
      }
    };

    button.addEventListener('click', function() {
      set(button.getAttribute('aria-expanded') !== 'true');
    });
    measure();
    window.addEventListener('load', measure);
    window.addEventListener('resize', measure);
  });
})();
