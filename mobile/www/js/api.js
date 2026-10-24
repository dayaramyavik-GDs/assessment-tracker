(function () {
  const AT = (window.AT = window.AT || {});
  const TIMEOUT_MS = 15000;

  const fail = (status, code, message, details = []) => ({ status, code, message, details });

  async function request(method, path, body) {
    if (navigator.connection && navigator.connection.type === 'none') {
      throw fail(0, 'OFFLINE', "You're offline. Changes can't be saved right now.");
    }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = AT.auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(AT_CONFIG.API_BASE_URL + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw fail(0, 'NETWORK', "Can't reach the server. If it was asleep, it may need a minute; please try again.");
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 204) return null;
    let data = null;
    try { data = await res.json(); } catch { /* not JSON */ }
    if (res.ok) return data;

    const e = (data && data.error) || {};
    if (res.status === 401 && token) {
      // Token expired or revoked: sign out locally and go to Login
      AT.auth.clear();
      AT.notifications.cancelAll();
      AT.router.go('login', {}, { root: true });
      AT.ui.toast('Your session expired. Please log in again.', 'error');
    }
    const message = res.status >= 500
      ? 'Something went wrong on our side. Please try again.'
      : e.message || 'Request failed. Please try again.';
    throw fail(res.status, e.code || 'ERROR', message, e.details || []);
  }

  AT.api = {
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b ?? {}),
    patch: (p, b) => request('PATCH', p, b ?? {}),
    put: (p, b) => request('PUT', p, b ?? {}),
    del: (p, b) => request('DELETE', p, b),
  };
})();
