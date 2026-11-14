// Inline form validation for every TAG Safari form (see assets/ts-forms.css).
// Uses the browser's own constraint validation (required, type="email", min...), so forms still submit exactly as
// before; this only replaces the browser's popup bubbles with a message under each field, linked with aria.
(function() {
  var FORMS = '.ts-form, .affiliate-form, [data-section-type="page-contact"] #ContactForm, .content.customers-page form';

  var messageFor = function(field) {
    var v = field.validity;
    var label = (field.labels && field.labels[0] ? field.labels[0].textContent : field.name || 'This field').replace(/\*/g, '').trim();
    if (v.valueMissing && (field.type === 'checkbox' || field.type === 'radio' || field.tagName === 'SELECT')) return 'Please choose an option.';
    if (v.valueMissing) return 'Please enter your ' + label.toLowerCase() + '.';
    if (v.typeMismatch && field.type === 'email') return 'Please enter a valid email address, like name@example.com.';
    if (v.typeMismatch) return 'Please check the format of ' + label.toLowerCase() + '.';
    if (v.rangeUnderflow) return 'Please enter ' + field.min + ' or more.';
    if (v.rangeOverflow) return 'Please enter ' + field.max + ' or less.';
    if (v.stepMismatch) return 'Please enter a whole number.';
    if (v.tooShort) return 'Please use at least ' + field.minLength + ' characters.';
    return field.validationMessage;
  };

  // Radios in one group share a single message, placed after the group.
  var anchorFor = function(field) {
    if (field.type === 'radio') {
      var group = field.closest('.radio-options, fieldset') || field.parentNode;
      return group;
    }
    return field;
  };

  var show = function(field) {
    var anchor = anchorFor(field);
    var id = (field.id || field.name.replace(/\W+/g, '-')) + '-error';
    var error = document.getElementById(id);
    if (!error) {
      error = document.createElement('p');
      error.className = 'ts-field-error';
      error.id = id;
      anchor.insertAdjacentElement('afterend', error);
    }
    error.textContent = messageFor(field);
    field.setAttribute('aria-invalid', 'true');
    var described = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (described.indexOf(id) === -1) field.setAttribute('aria-describedby', described.concat(id).join(' '));
  };

  var clear = function(field) {
    var id = (field.id || field.name.replace(/\W+/g, '-')) + '-error';
    var error = document.getElementById(id);
    if (error) error.remove();
    field.removeAttribute('aria-invalid');
    var described = (field.getAttribute('aria-describedby') || '').split(' ').filter(function(d) { return d && d !== id; });
    if (described.length) field.setAttribute('aria-describedby', described.join(' '));
    else field.removeAttribute('aria-describedby');
  };

  var focused = null;
  document.addEventListener('invalid', function(event) {
    var field = event.target;
    if (!field.form || !field.form.matches(FORMS)) return;
    event.preventDefault(); // hide the browser bubble; the inline message replaces it
    show(field);
    // Focus the first invalid field of this submit attempt only.
    if (!focused) {
      focused = field;
      field.focus();
      setTimeout(function() { focused = null; }, 0);
    }
  }, true);

  var revalidate = function(event) {
    var field = event.target;
    if (!field.form || !field.form.matches(FORMS) || field.getAttribute('aria-invalid') !== 'true') return;
    if (field.type === 'radio') {
      var group = field.form.querySelectorAll('input[type="radio"][name="' + field.name + '"]');
      if (field.checkValidity()) group.forEach(clear);
      return;
    }
    if (field.checkValidity()) clear(field);
    else show(field);
  };
  document.addEventListener('input', revalidate);
  document.addEventListener('change', revalidate);
})();
