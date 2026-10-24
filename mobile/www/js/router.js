(function () {
  const AT = (window.AT = window.AT || {});
  const screens = {};
  const PUBLIC = ['welcome', 'login', 'register'];
  let stack = [];
  let current = null;

  const register = (name, screen) => { screens[name] = screen; };

  async function show(name, params = {}) {
    if (!PUBLIC.includes(name) && !AT.auth.getToken()) {
      name = 'login';
      params = {};
      stack = [];
    }
    if (current && screens[current.name].leave) screens[current.name].leave();
    current = { name, params };

    $('#tabbar').prop('hidden', PUBLIC.includes(name))
      .find('[data-tab]').removeClass('active').filter(`[data-tab="${name}"]`).addClass('active');
    const $view = $('#view').empty().off().attr('data-screen', name);
    window.scrollTo(0, 0);
    try {
      await screens[name].render($view, params);
    } catch (err) {
      AT.ui.errorState($view, err, () => show(name, params));
    }
  }

  // options.root: clear history (used by tabs); options.replace: don't add to history
  function go(name, params = {}, options = {}) {
    if (options.root) stack = [];
    else if (current && !options.replace) stack.push(current);
    return show(name, params);
  }

  function back() {
    const prev = stack.pop();
    if (prev) return show(prev.name, prev.params);
    if (navigator.app && navigator.app.exitApp) navigator.app.exitApp();
    return undefined;
  }

  AT.router = { register, go, back, reload: () => current && show(current.name, current.params) };
})();
