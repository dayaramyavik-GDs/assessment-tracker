(function () {
  const { ui, router, api } = window.AT;
  const { esc } = ui;
  let month = null; // first day of the month on screen (kept between visits)
  let selected = null; // 'YYYY-MM-DD'

  router.register('calendar', {
    async render($v) {
      const today = new Date();
      if (!month) month = new Date(today.getFullYear(), today.getMonth(), 1);
      if (!selected) selected = ui.toDateInput(today);

      $v.html(`<div class="cal-head">
          <button type="button" class="btn btn-ghost" id="prev" aria-label="Previous month">‹</button>
          <h1 id="month-title"></h1>
          <button type="button" class="btn btn-ghost" id="next" aria-label="Next month">›</button></div>
        <div class="cal-grid" id="grid"></div>${ui.skeleton(1)}
        <h2 id="day-title"></h2><div id="day-list"></div>`);
      $v.find('#month-title').text(month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }));
      $v.find('#prev').on('click', () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); router.reload(); });
      $v.find('#next').on('click', () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); router.reload(); });

      // 6 weeks starting on the Monday on or before the 1st
      const start = new Date(month);
      start.setDate(1 - ((month.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 42);
      const items = await api.get(`/assessments?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`);
      $v.find('.skeleton').remove();

      const byDay = {};
      items.forEach((a) => {
        const key = ui.toDateInput(new Date(a.dueAt));
        (byDay[key] = byDay[key] || []).push(a);
      });

      const paint = () => {
        let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="dow">${d}</div>`).join('');
        for (let i = 0; i < 42; i += 1) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const key = ui.toDateInput(d);
          const list = byDay[key] || [];
          const cls = ['cal-day', d.getMonth() !== month.getMonth() ? 'other' : '',
            key === ui.toDateInput(today) ? 'today' : '', key === selected ? 'selected' : ''].join(' ');
          const dots = list.slice(0, 4)
            .map((a) => `<span class="dot" style="background:${esc(a.unit ? a.unit.colour : '#94a3b8')}"></span>`).join('');
          html += `<button type="button" class="${cls}" data-day="${key}"
            aria-label="${esc(ui.fmtDate(d))}, ${list.length} due">${d.getDate()}<span class="dots">${dots}</span></button>`;
        }
        $v.find('#grid').html(html);
        $v.find('#day-title').text(ui.fmtDate(new Date(`${selected}T00:00`)));
        const dayItems = byDay[selected] || [];
        $v.find('#day-list').html(dayItems.length
          ? `<ul class="list">${dayItems.map(ui.assessmentRow).join('')}</ul>`
          : ui.empty('Nothing due on this day.'));
      };

      $v.on('click', '[data-day]', (e) => { selected = $(e.currentTarget).attr('data-day'); paint(); });
      $v.on('click', '[data-assessment]', (e) => router.go('assessmentForm', { id: $(e.currentTarget).attr('data-assessment') }));
      paint();
    },
  });
})();
