(function () {
  const AT = (window.AT = window.AT || {});

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function toast(message, type = 'info') {
    const $t = $('<div class="toast"></div>').addClass(`toast-${type}`).text(message);
    $('#toasts').append($t);
    setTimeout(() => $t.fadeOut(300, () => $t.remove()), 3000);
  }

  // Disables the button while fn runs: prevents duplicate submissions from double taps
  async function withLoading($btn, busyLabel, fn) {
    if ($btn.prop('disabled')) return undefined;
    const label = $btn.text();
    $btn.prop('disabled', true).text(busyLabel);
    try {
      return await fn();
    } finally {
      $btn.prop('disabled', false).text(label);
    }
  }

  const field = (name, label, control) =>
    `<div class="field"><label>${esc(label)}${control}</label><p class="field-error" data-error-for="${name}"></p></div>`;

  function clearErrors($form) {
    $form.find('.field-error, .form-error').text('');
    $form.find('[aria-invalid]').removeAttr('aria-invalid');
  }

  function showErrors($form, errors) {
    errors.forEach(({ field: name, message }) => {
      $form.find(`[name="${name}"]`).attr('aria-invalid', 'true');
      $form.find(`[data-error-for="${name}"]`).text(message);
    });
    $form.find('[aria-invalid="true"]').first().trigger('focus');
  }

  function handleError(err, $form) {
    if ($form && err.details && err.details.length) showErrors($form, err.details);
    if ($form) $form.find('.form-error').text(err.message);
    else toast(err.message, 'error');
  }

  const validate = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    password: (v) => v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v),
    number: (v, min, max) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max,
  };

  function confirmDialog(message, okLabel = 'OK') {
    return new Promise((resolve) => {
      const $d = $(`<div class="dialog-backdrop"><div class="dialog" role="dialog" aria-modal="true">
        <p></p><div class="dialog-actions">
        <button type="button" class="btn btn-ghost" data-act="no">Cancel</button>
        <button type="button" class="btn btn-danger" data-act="yes"></button></div></div></div>`);
      $d.find('p').text(message);
      $d.find('[data-act=yes]').text(okLabel);
      $d.on('click', 'button', (e) => {
        $d.remove();
        resolve($(e.currentTarget).data('act') === 'yes');
      });
      $('body').append($d);
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  // ---- Dates (shown in the phone's own time zone) ----
  const pad = (n) => String(n).padStart(2, '0');
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtDateTime = (d) => new Date(d).toLocaleString('en-AU',
    { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  function dueLabel(dueAt) {
    const due = new Date(dueAt);
    const days = Math.round((startOfDay(due) - startOfDay(new Date())) / 86400000);
    if (due < new Date()) return { text: days === 0 ? 'Overdue today' : `Overdue ${Math.abs(days)}d`, cls: 'badge-overdue' };
    if (days === 0) return { text: 'Due today', cls: 'badge-soon' };
    if (days === 1) return { text: 'Tomorrow', cls: 'badge-soon' };
    return { text: `In ${days} days`, cls: days <= 3 ? 'badge-soon' : '' };
  }

  // ---- Shared list rendering ----
  const isDone = (a) => a.status === 'submitted' || a.status === 'graded';

  function assessmentRow(a) {
    const unit = a.unit || {};
    const badge = isDone(a)
      ? { text: a.status === 'graded' ? `${a.markReceived}/${a.maxMark}` : 'Submitted', cls: 'badge-done' }
      : dueLabel(a.dueAt);
    return `<li class="item" data-assessment="${esc(a._id)}">
      <span class="strip" style="background:${esc(unit.colour || '#94a3b8')}"></span>
      <div class="main"><div class="title">${esc(a.title)}</div>
        <div class="meta">${esc(unit.code || '')} · ${esc(fmtDateTime(a.dueAt))} · ${esc(a.weighting)}%</div></div>
      <span class="badge ${badge.cls}">${esc(badge.text)}</span></li>`;
  }

  const skeleton = (n = 3) => '<div class="skeleton"></div>'.repeat(n);
  const empty = (message, buttonLabel, buttonId) => `<div class="empty"><p>${esc(message)}</p>${
    buttonLabel ? `<button type="button" class="btn btn-primary" id="${buttonId}">${esc(buttonLabel)}</button>` : ''}</div>`;

  function errorState($el, err, retry) {
    $el.html('<div class="empty"><p></p><button type="button" class="btn btn-primary">Try again</button></div>');
    $el.find('p').text(err.message || 'Something went wrong.');
    $el.find('button').on('click', retry);
  }

  AT.ui = {
    esc, toast, withLoading, field, clearErrors, showErrors, handleError, validate, confirmDialog, uuid,
    startOfDay, toDateInput, toTimeInput, fmtDate, fmtDateTime, dueLabel, isDone, assessmentRow, skeleton, empty, errorState,
  };
})();
