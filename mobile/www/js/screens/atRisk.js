(function () {
  const { ui, router, api } = window.AT;
  const { esc } = ui;

  const unitRow = (u, badge) => `<li class="item" data-unit="${esc(u.unitId)}">
    <span class="strip" style="background:${esc(u.colour)}"></span>
    <div class="main"><div class="title">${esc(u.code)} · ${esc(u.name)}</div><div class="meta">${esc(u.reason)}</div></div>
    <span class="badge badge-risk">${badge}</span></li>`;

  const section = (title, help, items, row) => (items.length
    ? `<h2>${title} (${items.length})</h2><p class="muted">${help}</p><ul class="list">${items.map(row).join('')}</ul>`
    : '');

  router.register('atRisk', {
    async render($v) {
      $v.html(`<h1>At risk</h1><p class="muted">Units and deadlines that need attention.</p><div id="risk">${ui.skeleton(3)}</div>`);
      $v.on('click', '[data-unit]', (e) => router.go('unitDetail', { id: $(e.currentTarget).attr('data-unit') }));
      $v.on('click', '[data-assessment]', (e) => router.go('assessmentForm', { id: $(e.currentTarget).attr('data-assessment') }));

      const r = await api.get('/at-risk');
      const html = section('Target unreachable', 'Even full marks on the remaining work cannot reach your target.',
        r.unreachable, (u) => unitRow(u, 'Unreachable'))
        + section('Target at risk', 'You need over 85% on what is left, or you are below the pass mark.',
          r.atRisk, (u) => unitRow(u, 'At risk'))
        + section('Deadline at risk', 'Due within 3 days with under 60 minutes of study logged.', r.deadlineRisk, ui.assessmentRow)
        + section('Overdue', 'Past the due date and not marked as submitted.', r.overdue, ui.assessmentRow);
      $v.find('#risk').html(html || ui.empty('Nothing at risk right now. Nice work!'));
    },
  });
})();
