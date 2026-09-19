document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('#login-form');
  const registerForm = document.querySelector('#register-form');
  const tabs = document.querySelectorAll('[data-auth-tab]');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.authTab;
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      loginForm.classList.toggle('hide', target !== 'login');
      registerForm.classList.toggle('hide', target !== 'register');
    });
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = new FormData(loginForm);
    try {
      const data = await SheMarket.request('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: Object.fromEntries(form.entries())
      });

      SheMarket.setAuth(data.token, data.user);
      SheMarket.toast('Welcome back.', 'success');
      redirectAfterAuth(data.user);
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    }
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = new FormData(registerForm);
    try {
      const data = await SheMarket.request('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: Object.fromEntries(form.entries())
      });

      SheMarket.setAuth(data.token, data.user);
      SheMarket.toast('Account created.', 'success');
      redirectAfterAuth(data.user);
    } catch (error) {
      SheMarket.toast(error.message, 'error');
    }
  });
});

function redirectAfterAuth(user) {
  const next = SheMarket.getQuery('next');
  if (next) {
    location.href = next;
    return;
  }

  if (user.role === 'admin') {
    location.href = '/pages/shg-dashboard.html';
    return;
  }

  if (user.role === 'seller') {
    location.href = '/pages/seller-dashboard.html';
    return;
  }

  location.href = '/index.html';
}
