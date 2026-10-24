(function () {
  const AT = window.AT;

  function bindGlobalEvents() {
    document.addEventListener('offline', () => $('#offline-banner').prop('hidden', false));
    document.addEventListener('online', () => $('#offline-banner').prop('hidden', true));
    document.addEventListener('backbutton', (e) => { e.preventDefault(); AT.router.back(); }, false);
    document.addEventListener('resume', () => {
      if (AT.auth.getToken()) AT.notifications.resyncAll().catch(() => {});
    });
    $('#tabbar').on('click', '[data-tab]', (e) => AT.router.go($(e.currentTarget).data('tab'), {}, { root: true }));
  }

  async function boot() {
    bindGlobalEvents();
    if (navigator.connection && navigator.connection.type === 'none') $('#offline-banner').prop('hidden', false);
    if (!AT.auth.getToken()) return AT.router.go('welcome', {}, { root: true });

    $('#view').html('<div class="spinner" role="status" aria-label="Loading"></div>');
    try {
      const { user } = await AT.api.get('/auth/me');
      AT.auth.saveUser(user);
      AT.notifications.resyncAll().catch(() => {});
    } catch (err) {
      if (err.status === 401) return undefined; // api.js already went to Login
      AT.ui.toast(err.message, 'error'); // offline or server asleep: continue with the cached user
    }
    return AT.router.go('home', {}, { root: true });
  }

  document.addEventListener('deviceready', boot, false);
})();
