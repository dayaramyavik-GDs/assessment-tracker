(function () {
  const { ui, router, api } = window.AT;
  const { esc, toast } = ui;
  const KEY = 'at_timer';
  const PENDING = 'at_pending_session';
  const POMODORO_MS = 25 * 60 * 1000;
  const POMODORO_NOTIFICATION_ID = 2000000000; // outside the range used for deadline reminders
  let tick = null;

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => (v ? localStorage.setItem(k, JSON.stringify(v)) : localStorage.removeItem(k));
  const elapsed = (s) => s.accumulatedMs + (s.runningSince ? Date.now() - s.runningSince : 0);
  const two = (n) => String(n).padStart(2, '0');
  const fmt = (ms) => {
    const t = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(t / 3600);
    return `${h ? `${h}:` : ''}${two(Math.floor((t % 3600) / 60))}:${two(t % 60)}`;
  };
  const local = () => window.cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local;
  const schedulePomodoroEnd = (msLeft) => local() && local().schedule({
    id: POMODORO_NOTIFICATION_ID, title: 'Pomodoro complete', text: 'Nice work. Take a 5-minute break.',
    trigger: { at: new Date(Date.now() + msLeft) }, foreground: true,
  });
  const cancelPomodoroEnd = () => local() && local().cancel([POMODORO_NOTIFICATION_ID]);

  router.register('timer', {
    leave() { clearInterval(tick); },

    async render($v) {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [units, recent] = await Promise.all([api.get('/units'), api.get(`/assessments?from=${encodeURIComponent(weekAgo)}`)]);
      if (!units.length) {
        $v.html(ui.empty('Add a unit first so study time can be linked to it.', 'Add a unit', 'add-unit'));
        $v.find('#add-unit').on('click', () => router.go('unitForm'));
        return;
      }

      $v.html(`<h1>Study timer</h1>
        <form class="card form" id="setup" novalidate>
          ${ui.field('unitId', 'Unit', `<select name="unitId">${units.map((u) =>
            `<option value="${esc(u._id)}">${esc(u.code)} · ${esc(u.name)}</option>`).join('')}</select>`)}
          ${ui.field('assessmentId', 'Assessment (optional)', '<select name="assessmentId"></select>')}
          ${ui.field('mode', 'Mode', '<select name="mode"><option value="stopwatch">Stopwatch</option><option value="pomodoro">Pomodoro (25 min)</option></select>')}
        </form>
        <div class="timer-display" id="display" role="timer">00:00</div>
        <div class="row">
          <button type="button" class="btn btn-primary" id="start">Start</button>
          <button type="button" class="btn btn-ghost" id="stop">Stop &amp; save</button></div>
        <h2>Today's sessions</h2><div id="today">${ui.skeleton(1)}</div>`);

      const $setup = $v.find('#setup');
      const $sel = (n) => $setup.find(`[name="${n}"]`);
      const fillAssessments = () => {
        const open = recent.filter((a) => a.unitId === $sel('unitId').val() && !ui.isDone(a));
        $sel('assessmentId').html(`<option value="">None</option>${open
          .map((a) => `<option value="${esc(a._id)}">${esc(a.title)}</option>`).join('')}`);
      };
      $setup.on('change', '[name="unitId"]', fillAssessments);

      let state = read(KEY);
      if (state) $sel('unitId').val(state.unitId);
      fillAssessments();
      if (state) { $sel('assessmentId').val(state.assessmentId || ''); $sel('mode').val(state.mode); }

      const unitById = Object.fromEntries(units.map((u) => [u._id, u]));

      async function loadToday() {
        const pending = read(PENDING);
        const pendingHtml = pending
          ? `<div class="warning">Unsaved session: ${Number(pending.durationMinutes)} min. <button type="button" class="link" id="retry">Retry save</button></div>`
          : '';
        const $t = $v.find('#today');
        try {
          const from = new Date();
          from.setHours(0, 0, 0, 0);
          const list = await api.get(`/study-sessions?from=${encodeURIComponent(from.toISOString())}`);
          const total = list.reduce((m, s) => m + s.durationMinutes, 0);
          $t.html(pendingHtml + (list.length
            ? `<p class="muted">${total} min today</p><ul class="list">${list.map((s) => {
              const u = unitById[s.unitId] || {};
              const time = new Date(s.startedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
              return `<li class="item"><span class="strip" style="background:${esc(u.colour || '#94a3b8')}"></span>
                <div class="main"><div class="title">${esc(u.code || 'Unit')}</div><div class="meta">${esc(time)} · ${esc(s.mode)}</div></div>
                <span class="badge">${Number(s.durationMinutes)} min</span></li>`;
            }).join('')}</ul>`
            : ui.empty('No study sessions yet today.')));
        } catch (err) {
          $t.html(`${pendingHtml}<p class="muted"></p>`);
          $t.find('p.muted').text(err.message);
        }
      }

      async function save(body, auto) {
        write(PENDING, body); // kept until the server confirms
        try {
          await api.post('/study-sessions', body);
          write(PENDING, null);
          toast(auto ? `Pomodoro done: ${body.durationMinutes} min saved. Take a 5-minute break.`
            : `Study session saved (${body.durationMinutes} min)`, 'success');
        } catch (err) {
          toast(`${err.message} Your session is kept; tap Retry save.`, 'error');
        }
        loadToday();
      }

      let finishing = false;
      async function finish(auto) {
        if (!state || finishing) return;
        finishing = true;
        const s = state;
        const ms = Math.min(elapsed(s), s.mode === 'pomodoro' ? POMODORO_MS : Infinity);
        state = null;
        write(KEY, null);
        cancelPomodoroEnd();
        paint();
        const minutes = Math.min(720, Math.round(ms / 60000));
        if (minutes < 1) toast("Sessions under 1 minute aren't saved.");
        else {
          await save({
            unitId: s.unitId, assessmentId: s.assessmentId, startedAt: s.startedAt, endedAt: new Date().toISOString(),
            durationMinutes: minutes, mode: s.mode, clientId: s.clientId,
          }, auto);
        }
        finishing = false;
      }

      function paint() {
        const ms = state ? elapsed(state) : 0;
        const pomodoro = (state ? state.mode : $sel('mode').val()) === 'pomodoro';
        $v.find('#display').text(pomodoro ? fmt(POMODORO_MS - ms) : fmt(ms));
        $v.find('#start').text(state && state.runningSince ? 'Pause' : state ? 'Resume' : 'Start');
        $v.find('#stop').prop('disabled', !state);
        $setup.find('select').prop('disabled', Boolean(state));
        if (state && pomodoro && ms >= POMODORO_MS) finish(true);
      }

      $v.find('#start').on('click', () => {
        if (!state) {
          state = {
            unitId: $sel('unitId').val(), assessmentId: $sel('assessmentId').val() || null, mode: $sel('mode').val(),
            startedAt: new Date().toISOString(), runningSince: Date.now(), accumulatedMs: 0, clientId: ui.uuid(),
          };
          if (state.mode === 'pomodoro') schedulePomodoroEnd(POMODORO_MS);
        } else if (state.runningSince) {
          state.accumulatedMs = elapsed(state); // pause
          state.runningSince = null;
          cancelPomodoroEnd();
        } else {
          state.runningSince = Date.now(); // resume
          if (state.mode === 'pomodoro') schedulePomodoroEnd(POMODORO_MS - state.accumulatedMs);
        }
        write(KEY, state);
        paint();
      });
      $v.find('#stop').on('click', () => finish(false));
      $setup.on('change', '[name="mode"]', paint);
      $v.on('click', '#retry', () => { const p = read(PENDING); if (p) save(p, false); });

      paint();
      loadToday();
      clearInterval(tick);
      tick = setInterval(paint, 1000);
    },
  });
})();
