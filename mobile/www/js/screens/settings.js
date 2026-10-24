(function () {
  const { ui, router, api, auth, notifications } = window.AT;
  const { field, withLoading, clearErrors, showErrors, handleError, validate, toast } = ui;
  const REMINDERS = [[10080, '7 days before'], [4320, '3 days before'], [1440, '1 day before'], [120, '2 hours before']];

  router.register('settings', {
    async render($v) {
      const { user } = await api.get('/auth/me');
      auth.saveUser(user);

      $v.html(`<h1>Settings</h1>
        <form class="card form" id="profile" novalidate><h2>Profile and reminders</h2>
          ${field('name', 'Name', '<input name="name" maxlength="60" autocomplete="name">')}
          ${field('settings.passMark', 'Pass mark (%)', '<input name="settings.passMark" type="number" min="0" max="100" step="1">')}
          <fieldset><legend>Deadline reminders</legend>${REMINDERS.map(([m, label]) =>
            `<label class="check"><input type="checkbox" name="reminder" value="${m}">${label}</label>`).join('')}</fieldset>
          <p class="form-error" role="alert"></p>
          <button type="submit" class="btn btn-primary btn-block">Save settings</button></form>

        <form class="card form" id="password" novalidate><h2>Change password</h2>
          ${field('currentPassword', 'Current password', '<input type="password" name="currentPassword" autocomplete="current-password">')}
          ${field('newPassword', 'New password', '<input type="password" name="newPassword" autocomplete="new-password" maxlength="72">')}
          ${field('confirm', 'Confirm new password', '<input type="password" name="confirm" autocomplete="new-password" maxlength="72">')}
          <p class="form-error" role="alert"></p>
          <button type="submit" class="btn btn-primary btn-block">Change password</button></form>

        <form class="card form" id="danger" novalidate><h2>Account</h2>
          <button type="button" class="btn btn-ghost btn-block" id="logout">Log out</button>
          ${field('deletePassword', 'Password (to delete your account)', '<input type="password" name="deletePassword" autocomplete="current-password">')}
          <p class="form-error" role="alert"></p>
          <button type="submit" class="btn btn-danger btn-block">Delete account and all data</button></form>`);

      const $p = $v.find('#profile');
      $p.find('[name="name"]').val(user.name);
      $p.find('[name="settings.passMark"]').val(user.settings.passMark);
      user.settings.reminderOffsetsMinutes.forEach((m) => $p.find(`[name="reminder"][value="${Number(m)}"]`).prop('checked', true));

      $p.on('submit', (e) => {
        e.preventDefault();
        clearErrors($p);
        const name = String($p.find('[name="name"]').val()).trim();
        const passMark = String($p.find('[name="settings.passMark"]').val());
        const errors = [];
        if (!name) errors.push({ field: 'name', message: 'Please enter your name.' });
        if (!validate.number(passMark, 0, 100)) errors.push({ field: 'settings.passMark', message: 'Pass mark must be between 0 and 100.' });
        if (errors.length) return showErrors($p, errors);
        const reminderOffsetsMinutes = $p.find('[name="reminder"]:checked').map((i, el) => Number(el.value)).get();
        return withLoading($p.find('[type=submit]'), 'Saving…', async () => {
          try {
            const res = await api.patch('/users/me', { name, settings: { passMark: Number(passMark), reminderOffsetsMinutes } });
            auth.saveUser(res.user);
            notifications.resyncAll().catch(() => {});
            toast('Settings saved', 'success');
          } catch (err) {
            handleError(err, $p);
          }
        });
      });

      const $pw = $v.find('#password');
      $pw.on('submit', (e) => {
        e.preventDefault();
        clearErrors($pw);
        const val = (n) => String($pw.find(`[name="${n}"]`).val());
        const errors = [];
        if (!val('currentPassword')) errors.push({ field: 'currentPassword', message: 'Enter your current password.' });
        if (!validate.password(val('newPassword'))) {
          errors.push({ field: 'newPassword', message: 'Password must be 8+ characters and include a letter and a number.' });
        }
        if (val('confirm') !== val('newPassword')) errors.push({ field: 'confirm', message: 'Passwords do not match.' });
        if (errors.length) return showErrors($pw, errors);
        return withLoading($pw.find('[type=submit]'), 'Changing…', async () => {
          try {
            await api.put('/users/me/password', { currentPassword: val('currentPassword'), newPassword: val('newPassword') });
            $pw[0].reset();
            toast('Password changed', 'success');
          } catch (err) {
            if (err.code === 'WRONG_PASSWORD') err.details = [{ field: 'currentPassword', message: err.message }];
            handleError(err, $pw);
          }
        });
      });

      const $d = $v.find('#danger');
      $d.find('#logout').on('click', async () => {
        if (!(await ui.confirmDialog('Log out of Assessment Tracker?', 'Log out'))) return;
        await notifications.cancelAll();
        auth.clear();
        toast('You have been logged out.');
        router.go('login', {}, { root: true });
      });
      $d.on('submit', async (e) => {
        e.preventDefault();
        clearErrors($d);
        const password = String($d.find('[name="deletePassword"]').val());
        if (!password) return showErrors($d, [{ field: 'deletePassword', message: 'Enter your password to confirm.' }]);
        if (!(await ui.confirmDialog('This permanently deletes your account and all your data. Continue?', 'Delete everything'))) return undefined;
        return withLoading($d.find('[type=submit]'), 'Deleting…', async () => {
          try {
            await api.del('/users/me', { password });
            await notifications.cancelAll();
            auth.clear();
            toast('Your account and data were deleted.', 'success');
            router.go('welcome', {}, { root: true });
          } catch (err) {
            if (err.code === 'WRONG_PASSWORD') err.details = [{ field: 'deletePassword', message: err.message }];
            handleError(err, $d);
          }
        });
      });
    },
  });
})();
