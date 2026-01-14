const { createApp, ref, reactive, onMounted } = Vue;

createApp({
  setup() {
    const state = reactive({ submitting: false, error: null });
    const view = ref('login');

    const ctx = window.__ENBAUGES__ || { returnTo: '', joinOrgId: '' };

    const authForm = reactive({ email: '', password: '', name: '' });

    const inviteToken = ref(null);
    const inviteInfo = ref(null);
    const inviteForm = reactive({ name: '', password: '' });

    async function login() {
      state.submitting = true;
      state.error = null;
      try {
        const data = await api.auth.login(authForm.email, authForm.password);
        api.setTokens(data.token, data.refreshToken);

        if (ctx.joinOrgId) {
          try {
            await api.orgs.join(ctx.joinOrgId);
          } catch (e) {
          }
        }

        window.location.href = ctx.returnTo || '/dashboard';
      } catch (e) {
        state.error = e.message;
      }
      state.submitting = false;
    }

    async function register() {
      state.submitting = true;
      state.error = null;
      try {
        const data = await api.auth.register(authForm.email, authForm.password, authForm.name);
        api.setTokens(data.token, data.refreshToken);

        if (ctx.joinOrgId) {
          try {
            await api.orgs.join(ctx.joinOrgId);
          } catch (e) {
          }
        }

        window.location.href = ctx.returnTo || '/dashboard';
      } catch (e) {
        state.error = e.message;
      }
      state.submitting = false;
    }

    async function acceptInvite() {
      state.submitting = true;
      state.error = null;
      try {
        const payload = { token: inviteToken.value };
        if (!inviteInfo.value.userExists) {
          payload.name = inviteForm.name;
          payload.password = inviteForm.password;
        }
        await api.invites.accept(payload);
        window.location.href = '/login';
      } catch (e) {
        state.error = e.message;
      }
      state.submitting = false;
    }

    onMounted(async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        inviteToken.value = token;
        view.value = 'invite';
        try {
          const data = await api.invites.getInfo(token);
          inviteInfo.value = data.invite;
          inviteInfo.value.userExists = data.userExists;
        } catch (e) {
          state.error = e.message;
        }
      }
    });

    return { state, view, authForm, inviteInfo, inviteForm, login, register, acceptInvite };
  }
}).mount('#app');
