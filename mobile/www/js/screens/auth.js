(function () {
  const { ui, router, api, auth, notifications } = window.AT;
  const { field, withLoading, clearErrors, showErrors, handleError, validate, toast } = ui;

  function afterLogin(res, message) {
    auth.save(res.token, res.user);
    toast(message, 'success');
    notifications.resyncAll().catch(() => {});
    router.go('home', {}, { root: true });
  }

  router.register('welcome', {
    render($v) {
      $v.html(`<div class="welcome">
        <h1>Assessment Tracker</h1>
        <p class="muted">Deadlines, grades and study time in one place.</p>
        <button type="button" class="btn btn-primary btn-block" id="go-register">Create account</button>
        <button type="button" class="btn btn-ghost btn-block" id="go-login">Log in</button></div>`);
      $v.find('#go-register').on('click', () => router.go('register'));
      $v.find('#go-login').on('click', () => router.go('login'));
    },
  });

  router.register('login', {
    render($v) {
      $v.html(`<form class="card form" novalidate>
        <h1>Log in</h1>
        ${field('email', 'Email', '<input type="email" name="email" autocomplete="email" maxlength="254">')}
        ${field('password', 'Password', '<input type="password" name="password" autocomplete="current-password">')}
        <p class="form-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block">Log in</button>
        <p class="center"><button type="button" class="link" id="to-register">New here? Create an account</button></p>
      </form>`);
      const $f = $v.find('form');
      $v.find('#to-register').on('click', () => router.go('register', {}, { replace: true }));
      $f.on('submit', (e) => {
        e.preventDefault();
        clearErrors($f);
        const data = { email: $f.find('[name="email"]').val().trim(), password: $f.find('[name="password"]').val() };
        const errors = [];
        if (!validate.email(data.email)) errors.push({ field: 'email', message: 'Enter a valid email address.' });
        if (!data.password) errors.push({ field: 'password', message: 'Please enter your password.' });
        if (errors.length) return showErrors($f, errors);
        return withLoading($f.find('[type=submit]'), 'Logging in…', async () => {
          try {
            afterLogin(await api.post('/auth/login', data), 'Welcome back!');
          } catch (err) {
            handleError(err, $f);
          }
        });
      });
    },
  });

  router.register('register', {
    render($v) {
      $v.html(`<form class="card form" novalidate>
        <h1>Create account</h1>
        ${field('name', 'Name', '<input name="name" maxlength="60" autocomplete="name">')}
        ${field('email', 'Email', '<input type="email" name="email" autocomplete="email" maxlength="254">')}
        ${field('password', 'Password (8+ characters, a letter and a number)', '<input type="password" name="password" autocomplete="new-password" maxlength="72">')}
        ${field('confirm', 'Confirm password', '<input type="password" name="confirm" autocomplete="new-password" maxlength="72">')}
        <p class="form-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block">Create account</button>
        <p class="center"><button type="button" class="link" id="to-login">Already have an account? Log in</button></p>
      </form>`);
      const $f = $v.find('form');
      $v.find('#to-login').on('click', () => router.go('login', {}, { replace: true }));
      $f.on('submit', (e) => {
        e.preventDefault();
        clearErrors($f);
        const val = (n) => $f.find(`[name="${n}"]`).val();
        const data = { name: val('name').trim(), email: val('email').trim(), password: val('password') };
        const errors = [];
        if (!data.name) errors.push({ field: 'name', message: 'Please enter your name.' });
        if (!validate.email(data.email)) errors.push({ field: 'email', message: 'Enter a valid email address.' });
        if (!validate.password(data.password)) {
          errors.push({ field: 'password', message: 'Password must be 8+ characters and include a letter and a number.' });
        }
        if (val('confirm') !== data.password) errors.push({ field: 'confirm', message: 'Passwords do not match.' });
        if (errors.length) return showErrors($f, errors);
        return withLoading($f.find('[type=submit]'), 'Creating account…', async () => {
          try {
            afterLogin(await api.post('/auth/register', data), 'Account created');
          } catch (err) {
            handleError(err, $f);
          }
        });
      });
    },
  });
})();
