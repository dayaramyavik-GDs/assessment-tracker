(function () {
  const { ui, router, api, notifications } = window.AT;
  const { esc, field, withLoading, clearErrors, showErrors, handleError, validate, toast } = ui;

  function unitCard(u) {
    const s = u.summary;
    const current = s.currentAverage === null ? 'No marks yet' : `${s.currentAverage}% (${s.currentBand})`;
    let risk = '';
    if (!s.targetReachable) risk = '<span class="badge badge-risk">Unreachable</span>';
    else if (s.requiredOnRemaining !== null && s.requiredOnRemaining > 85) risk = '<span class="badge badge-risk">At risk</span>';
    return `<li class="item" data-unit="${esc(u._id)}">
      <span class="strip" style="background:${esc(u.colour)}"></span>
      <div class="main"><div class="title">${esc(u.code)} · ${esc(u.name)}</div>
        <div class="meta">${esc(u.semester)} · Current ${esc(current)} · Target ${esc(u.targetGrade)}%</div>
        <div class="progress" aria-label="Weight marked"><div style="width:${Number(s.completedWeight) || 0}%"></div></div></div>
      ${risk}</li>`;
  }

  function semesterOptions(selected) {
    const y = new Date().getFullYear();
    const fallback = `${y}-${new Date().getMonth() < 6 ? 'S1' : 'S2'}`;
    const options = [];
    [y - 1, y, y + 1].forEach((year) => ['S1', 'S2', 'T1', 'T2', 'T3', 'SUM', 'WIN']
      .forEach((p) => options.push(`${year}-${p}`)));
    return options.map((o) => `<option value="${o}"${o === (selected || fallback) ? ' selected' : ''}>${o}</option>`).join('');
  }

  // ---------- Units list ----------
  router.register('units', {
    async render($v) {
      $v.html(`<header class="screen-header"><h1>Units</h1>
        <button type="button" class="btn btn-primary" id="add-unit">+ Unit</button></header>
        <div id="list">${ui.skeleton(3)}</div>`);
      $v.find('#add-unit').on('click', () => router.go('unitForm'));
      $v.on('click', '[data-unit]', (e) => router.go('unitDetail', { id: $(e.currentTarget).attr('data-unit') }));
      const units = await api.get('/units');
      $v.find('#list').html(units.length
        ? `<ul class="list">${units.map(unitCard).join('')}</ul>`
        : ui.empty('No units yet. Add your first unit to get started.'));
    },
  });

  // ---------- Unit form (new + edit) ----------
  router.register('unitForm', {
    async render($v, { id }) {
      const unit = id ? (await api.get(`/units/${id}`)).unit : null;
      const clientId = ui.uuid(); // same id for every retry of this form = no duplicates
      $v.html(`<form class="card form" novalidate>
        <h1>${unit ? 'Edit unit' : 'New unit'}</h1>
        ${field('code', 'Unit code', '<input name="code" maxlength="12" placeholder="ICT301" autocapitalize="characters">')}
        ${field('name', 'Unit name', '<input name="name" maxlength="100">')}
        <div class="row">
          ${field('semester', 'Semester', `<select name="semester">${semesterOptions(unit && unit.semester)}</select>`)}
          ${field('creditPoints', 'Credit points', '<input name="creditPoints" type="number" inputmode="numeric" min="0" max="50" step="1">')}
        </div>
        <div class="row">
          ${field('targetGrade', 'Target grade (%)', '<input name="targetGrade" type="number" inputmode="decimal" min="0" max="100" step="0.1">')}
          ${field('colour', 'Colour', '<input name="colour" type="color">')}
        </div>
        <p class="form-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block">Save</button>
        ${unit ? '<button type="button" class="btn btn-ghost btn-block" id="delete">Delete unit</button>' : ''}
        <button type="button" class="btn btn-ghost btn-block" id="cancel">Cancel</button>
      </form>`);
      const $f = $v.find('form');
      const $in = (n) => $f.find(`[name="${n}"]`);
      $in('code').val(unit ? unit.code : '');
      $in('name').val(unit ? unit.name : '');
      $in('creditPoints').val(unit && unit.creditPoints ? unit.creditPoints : '');
      $in('targetGrade').val(unit ? unit.targetGrade : 65);
      $in('colour').val(unit ? unit.colour : '#2563eb');

      $f.on('submit', (e) => {
        e.preventDefault();
        clearErrors($f);
        const v = (n) => String($in(n).val()).trim();
        const data = {
          code: v('code').toUpperCase(), name: v('name'), semester: v('semester'),
          targetGrade: Number(v('targetGrade')), colour: v('colour'),
        };
        if (v('creditPoints') !== '') data.creditPoints = Number(v('creditPoints'));
        const errors = [];
        if (!/^[A-Z0-9]{3,12}$/.test(data.code)) errors.push({ field: 'code', message: 'Unit code is required (e.g. ICT301).' });
        if (!data.name) errors.push({ field: 'name', message: 'Unit name is required.' });
        if (!validate.number(v('targetGrade'), 0, 100)) errors.push({ field: 'targetGrade', message: 'Target must be between 0 and 100.' });
        if ('creditPoints' in data && !(Number.isInteger(data.creditPoints) && data.creditPoints >= 0 && data.creditPoints <= 50)) {
          errors.push({ field: 'creditPoints', message: 'Credit points must be a whole number from 0 to 50.' });
        }
        if (errors.length) return showErrors($f, errors);
        return withLoading($f.find('[type=submit]'), 'Saving…', async () => {
          try {
            const res = unit ? await api.patch(`/units/${unit._id}`, data) : await api.post('/units', { ...data, clientId });
            toast(unit ? 'Unit updated' : 'Unit added', 'success');
            router.go('unitDetail', { id: res.unit._id }, { replace: true });
          } catch (err) {
            handleError(err, $f);
          }
        });
      });

      $f.find('#cancel').on('click', () => router.back());
      $f.find('#delete').on('click', async () => {
        if (!(await ui.confirmDialog(`Delete ${unit.code} and all its assessments and study sessions?`, 'Delete'))) return;
        try {
          const { assessments } = await api.get(`/units/${unit._id}`);
          await api.del(`/units/${unit._id}`);
          await Promise.all(assessments.map((a) => notifications.cancelFor(a._id)));
          toast('Unit deleted', 'success');
          router.go('units', {}, { root: true });
        } catch (err) {
          handleError(err, $f);
        }
      });
    },
  });

  // ---------- Unit detail ----------
  router.register('unitDetail', {
    async render($v, { id }) {
      const { unit, assessments, summary: s } = await api.get(`/units/${id}`);
      let needed = { value: `${s.requiredOnRemaining}%`, label: `Needed on remaining ${s.remainingWeight}%` };
      if (s.remainingWeight === 0) needed = { value: '—', label: 'All marks are in' };
      else if (!s.targetReachable) needed = { value: 'N/A', label: `Target not reachable (max ${s.maxPossible}%)` };
      else if (s.targetSecured) needed = { value: '0%', label: 'Target already secured' };

      $v.html(`<header class="screen-header">
          <div><p class="muted">${esc(unit.semester)}</p><h1>${esc(unit.code)}</h1><p>${esc(unit.name)}</p></div>
          <button type="button" class="btn btn-ghost" id="edit">Edit</button></header>
        <div class="card"><div class="summary-grid">
          <div><b>${s.currentAverage === null ? '—' : `${s.currentAverage}%`}</b>Current average ${s.currentBand ? `(${s.currentBand})` : ''}</div>
          <div><b>${Number(s.targetGrade)}%</b>Target</div>
          <div><b>${Number(s.completedWeight)}%</b>Of unit marked</div>
          <div><b>${esc(needed.value)}</b>${esc(needed.label)}</div></div>
          ${s.weightingComplete ? '' : `<p class="warning">Weightings add up to ${Number(s.totalWeight)}%, not 100%. Add the missing assessments for accurate predictions.</p>`}
        </div>
        <div class="screen-header"><h2>Assessments</h2>
          <button type="button" class="btn btn-primary" id="add">+ Assessment</button></div>
        ${assessments.length
          ? `<ul class="list">${assessments.map((a) => ui.assessmentRow({ ...a, unit })).join('')}</ul>`
          : ui.empty('No assessments yet. Add each one with its weighting from the unit outline.')}`);

      $v.find('#edit').on('click', () => router.go('unitForm', { id: unit._id }));
      $v.find('#add').on('click', () => router.go('assessmentForm', { unitId: unit._id }));
      $v.on('click', '[data-assessment]', (e) => router.go('assessmentForm', { id: $(e.currentTarget).attr('data-assessment') }));
    },
  });
})();
