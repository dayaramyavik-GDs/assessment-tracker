(function () {
  const { ui, router, api, notifications } = window.AT;
  const { esc, field, withLoading, clearErrors, showErrors, handleError, validate, toast } = ui;

  const TYPES = ['assignment', 'quiz', 'exam', 'lab', 'presentation', 'participation', 'other'];
  const STATUSES = [['todo', 'To do'], ['in-progress', 'In progress'], ['submitted', 'Submitted'], ['graded', 'Graded']];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  router.register('assessmentForm', {
    async render($v, { id, unitId }) {
      const [units, a] = await Promise.all([
        api.get('/units'),
        id ? api.get(`/assessments/${id}`).then((r) => r.assessment) : null,
      ]);
      if (!units.length) {
        $v.html(ui.empty('Add a unit first, then add its assessments.', 'Add a unit', 'add-unit'));
        $v.find('#add-unit').on('click', () => router.go('unitForm', {}, { replace: true }));
        return;
      }
      const clientId = ui.uuid();

      $v.html(`<form class="card form" novalidate>
        <h1>${a ? 'Edit assessment' : 'New assessment'}</h1>
        ${field('unitId', 'Unit', `<select name="unitId">${units.map((u) =>
          `<option value="${esc(u._id)}">${esc(u.code)} · ${esc(u.name)}</option>`).join('')}</select>`)}
        ${field('title', 'Title', '<input name="title" maxlength="100" placeholder="Assignment 1">')}
        ${field('type', 'Type', `<select name="type">${TYPES.map((t) => `<option value="${t}">${cap(t)}</option>`).join('')}</select>`)}
        <div class="row">
          ${field('dueDate', 'Due date', '<input name="dueDate" type="date">')}
          ${field('dueTime', 'Due time', '<input name="dueTime" type="time">')}
        </div>
        <div class="row">
          ${field('weighting', 'Weighting (%)', '<input name="weighting" type="number" inputmode="decimal" min="0.1" max="100" step="0.1">')}
          ${field('maxMark', 'Max mark', '<input name="maxMark" type="number" inputmode="decimal" min="0.1" step="0.1">')}
        </div>
        <div class="row">
          ${field('markReceived', 'Mark received', '<input name="markReceived" type="number" inputmode="decimal" min="0" step="0.1" placeholder="Not marked">')}
          ${field('status', 'Status', `<select name="status">${STATUSES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`)}
        </div>
        ${field('notes', 'Notes', '<textarea name="notes" rows="3" maxlength="1000"></textarea>')}
        <p class="form-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block">Save</button>
        ${a ? '<button type="button" class="btn btn-ghost btn-block" id="delete">Delete assessment</button>' : ''}
        <button type="button" class="btn btn-ghost btn-block" id="cancel">Cancel</button>
      </form>`);

      const $f = $v.find('form');
      const $in = (n) => $f.find(`[name="${n}"]`);
      const due = a ? new Date(a.dueAt) : null;
      $in('unitId').val(a ? a.unitId : unitId || units[0]._id);
      $in('title').val(a ? a.title : '');
      $in('type').val(a ? a.type : 'assignment');
      $in('dueDate').val(due ? ui.toDateInput(due) : '');
      $in('dueTime').val(due ? ui.toTimeInput(due) : '23:59');
      $in('weighting').val(a ? a.weighting : '');
      $in('maxMark').val(a ? a.maxMark : 100);
      $in('markReceived').val(a && a.markReceived !== null ? a.markReceived : '');
      $in('status').val(a ? a.status : 'todo');
      $in('notes').val(a ? a.notes : '');

      $f.on('submit', (e) => {
        e.preventDefault();
        clearErrors($f);
        const v = (n) => String($in(n).val()).trim();
        const errors = [];
        if (!v('title')) errors.push({ field: 'title', message: 'Assessment title is required.' });
        const dueAt = new Date(`${v('dueDate')}T${v('dueTime') || '23:59'}`); // local time on the phone
        if (!v('dueDate') || Number.isNaN(dueAt.getTime())) errors.push({ field: 'dueDate', message: 'Choose a due date.' });
        if (!validate.number(v('weighting'), 0.1, 100)) errors.push({ field: 'weighting', message: 'Weighting must be between 0.1 and 100.' });
        const maxMark = v('maxMark') === '' ? 100 : Number(v('maxMark'));
        if (!(maxMark > 0)) errors.push({ field: 'maxMark', message: 'Max mark must be greater than 0.' });
        const mark = v('markReceived');
        if (mark !== '' && !validate.number(mark, 0, maxMark)) {
          errors.push({ field: 'markReceived', message: 'Mark must be between 0 and the max mark.' });
        }
        if (errors.length) return showErrors($f, errors);

        const data = {
          unitId: v('unitId'), title: v('title'), type: v('type'), dueAt: dueAt.toISOString(),
          weighting: Number(v('weighting')), maxMark, markReceived: mark === '' ? null : Number(mark),
          status: v('status'), notes: v('notes'),
        };
        if (data.markReceived !== null && (data.status === 'todo' || data.status === 'in-progress')) data.status = 'graded';

        return withLoading($f.find('[type=submit]'), 'Saving…', async () => {
          try {
            const res = a ? await api.patch(`/assessments/${a._id}`, data) : await api.post('/assessments', { ...data, clientId });
            const saved = { ...res.assessment, unit: units.find((u) => u._id === res.assessment.unitId) };
            const reminders = await notifications.scheduleFor(saved).catch(() => 0);
            toast(reminders ? `Assessment saved. ${reminders} reminder${reminders > 1 ? 's' : ''} set.` : 'Assessment saved', 'success');
            router.back();
          } catch (err) {
            if (err.details) err.details = err.details.map((d) => (d.field === 'dueAt' ? { ...d, field: 'dueDate' } : d));
            handleError(err, $f);
          }
        });
      });

      $f.find('#cancel').on('click', () => router.back());
      $f.find('#delete').on('click', async () => {
        if (!(await ui.confirmDialog(`Delete "${a.title}"?`, 'Delete'))) return;
        try {
          await api.del(`/assessments/${a._id}`);
          await notifications.cancelFor(a._id);
          toast('Assessment deleted', 'success');
          router.back();
        } catch (err) {
          handleError(err, $f);
        }
      });
    },
  });
})();
