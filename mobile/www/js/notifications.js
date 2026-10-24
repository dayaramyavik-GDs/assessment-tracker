(function () {
  const AT = (window.AT = window.AT || {});
  const plugin = () => window.cordova && cordova.plugins && cordova.plugins.notification
    && cordova.plugins.notification.local;

  // Notification ids must be integers: build a stable one from the assessment id + reminder index
  const idFor = (assessmentId, index) => parseInt(String(assessmentId).slice(-6), 16) * 10 + index;

  function ensurePermission() {
    const p = plugin();
    if (!p) return Promise.resolve(false);
    return new Promise((resolve) => p.hasPermission((granted) => (granted ? resolve(true) : p.requestPermission(resolve))));
  }

  function cancelFor(assessmentId) {
    const p = plugin();
    if (!p) return Promise.resolve();
    return new Promise((resolve) => p.cancel([0, 1, 2, 3, 4].map((i) => idFor(assessmentId, i)), resolve));
  }

  function cancelAll() {
    const p = plugin();
    if (!p) return Promise.resolve();
    return new Promise((resolve) => p.cancelAll(resolve));
  }

  // Returns the number of reminders scheduled
  async function scheduleFor(a) {
    const p = plugin();
    if (!p) return 0; // browser platform: no notifications
    await cancelFor(a._id);
    if (AT.ui.isDone(a)) return 0;
    if (!(await ensurePermission())) return 0;
    const user = AT.auth.getUser();
    const offsets = (user && user.settings && user.settings.reminderOffsetsMinutes) || [4320, 1440];
    const due = new Date(a.dueAt).getTime();
    const code = a.unit && a.unit.code ? `${a.unit.code}: ` : '';
    const items = offsets
      .map((minutes, i) => ({
        id: idFor(a._id, i),
        title: `${code}${a.title}`,
        text: `Due ${AT.ui.fmtDateTime(a.dueAt)}`,
        trigger: { at: new Date(due - minutes * 60000) },
        foreground: true,
      }))
      .filter((n) => n.trigger.at.getTime() > Date.now());
    if (items.length) p.schedule(items);
    return items.length;
  }

  // Re-create all reminders from the server (after login, app resume, settings change)
  async function resyncAll() {
    if (!plugin()) return;
    const list = await AT.api.get(`/assessments?from=${encodeURIComponent(new Date().toISOString())}`);
    await cancelAll();
    for (const a of list) await scheduleFor(a);
  }

  AT.notifications = { scheduleFor, cancelFor, cancelAll, resyncAll, ensurePermission };
})();
