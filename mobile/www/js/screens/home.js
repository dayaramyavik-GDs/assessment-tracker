(function () {
  const { ui, router, api, auth } = window.AT;
  const { esc } = ui;

  router.register('home', {
    async render($v) {
      const user = auth.getUser() || {};
      $v.html(`<header class="screen-header">
          <div><p class="muted">Hi ${esc(user.name)}</p><h1>Upcoming</h1></div>
          <button type="button" class="btn btn-ghost" id="open-settings">Settings</button></header>
        <div class="stats" id="stats"></div>
        <h2 id="overdue-title" hidden>Overdue</h2><ul class="list" id="overdue"></ul>
        <h2>Next 14 days</h2><div id="upcoming">${ui.skeleton(3)}</div>
        <button type="button" class="fab" id="add" aria-label="Add assessment">+</button>`);

      $v.find('#open-settings').on('click', () => router.go('settings'));
      $v.find('#add').on('click', () => router.go('assessmentForm'));
      $v.on('click', '[data-assessment]', (e) => router.go('assessmentForm', { id: $(e.currentTarget).attr('data-assessment') }));
      $v.on('click', '#add-first-unit', () => router.go('unitForm'));

      try {
        const d = await api.get('/dashboard');
        $v.find('#stats').html(`<div class="stat"><b>${Number(d.dueThisWeek)}</b><span>Due this week</span></div>
          <div class="stat"><b>${Number(d.overdueCount)}</b><span>Overdue</span></div>
          <div class="stat"><b>${Number(d.atRiskCount)}</b><span>At risk</span></div>`);
        if (d.overdue.length) {
          $v.find('#overdue-title').prop('hidden', false);
          $v.find('#overdue').html(d.overdue.map(ui.assessmentRow).join(''));
        }
        $v.find('#upcoming').html(d.upcoming.length
          ? `<ul class="list">${d.upcoming.map(ui.assessmentRow).join('')}</ul>`
          : ui.empty('Nothing due in the next 14 days. Add your units and assessments to get started.', 'Add a unit', 'add-first-unit'));
      } catch (err) {
        ui.errorState($v.find('#upcoming'), err, () => router.reload());
      }
    },
  });
})();
