const { createApp, ref, reactive, onMounted } = Vue;

createApp({
  setup() {
    const state = reactive({
      loading: true,
      submitting: false,
      error: null,
      user: null
    });

    const orgs = ref([]);
    const toast = reactive({ show: false, message: '', type: 'success' });

    function showToast(message, type = 'success') {
      toast.message = message;
      toast.type = type;
      toast.show = true;
      setTimeout(() => (toast.show = false), 3000);
    }

    async function load() {
      try {
        const orgData = await api.orgs.listPublic();
        orgs.value = orgData.orgs;
      } catch (e) {
        state.error = e.message;
      }

      if (api.getToken()) {
        try {
          state.user = await api.auth.me();
        } catch (e) {
          api.clearTokens();
        }
      }

      state.loading = false;
    }

    async function joinOrg(org) {
      if (!api.getToken()) {
        const returnTo = encodeURIComponent('/browse-orgs');
        const joinOrgId = encodeURIComponent(org._id);
        window.location.href = `/login?returnTo=${returnTo}&joinOrgId=${joinOrgId}`;
        return;
      }

      state.submitting = true;
      try {
        await api.orgs.join(org._id);
        showToast('Organisation rejointe');
        window.location.href = '/dashboard';
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    onMounted(load);

    return { state, orgs, joinOrg, toast };
  }
}).mount('#app');
