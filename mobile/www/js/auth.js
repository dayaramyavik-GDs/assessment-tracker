(function () {
  const AT = (window.AT = window.AT || {});
  const TOKEN = 'at_token';
  const USER = 'at_user';

  AT.auth = {
    getToken: () => localStorage.getItem(TOKEN),
    getUser() {
      try { return JSON.parse(localStorage.getItem(USER)); } catch { return null; }
    },
    save(token, user) {
      localStorage.setItem(TOKEN, token);
      localStorage.setItem(USER, JSON.stringify(user));
    },
    saveUser: (user) => localStorage.setItem(USER, JSON.stringify(user)),
    clear() {
      [TOKEN, USER, 'at_timer', 'at_pending_session'].forEach((k) => localStorage.removeItem(k));
    },
  };
})();
