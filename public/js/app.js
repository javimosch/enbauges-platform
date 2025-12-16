const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const state = reactive({
      loading: true,
      submitting: false,
      error: null,
      user: null,
      orgs: [],
      currentOrg: null
    });

    const view = ref('login');
    const tab = ref('calendar');
    const authForm = reactive({ email: '', password: '', name: '' });
    const newOrg = reactive({ name: '', description: '' });
    const eventForm = reactive({ title: '', description: '', startAt: '', endAt: '', location: '', category: '' });
    const memberForm = reactive({ email: '', role: 'member', sendNotification: false });
    const orgSettings = reactive({ name: '', description: '', allowPublicJoin: false });

    const showCreateOrg = ref(false);
    const showEventModal = ref(false);
    const showAddMember = ref(false);
    const addMemberMode = ref('direct');
    const editingEvent = ref(null);
    const members = ref([]);
    const pendingEvents = ref([]);
    const pendingCount = ref(0);
    const calendarInstance = ref(null);

    const inviteToken = ref(null);
    const inviteInfo = ref(null);
    const inviteError = ref(null);
    const inviteForm = reactive({ name: '', password: '' });

    const rejectModal = reactive({ show: false, event: null, reason: '' });
    const toast = reactive({ show: false, message: '', type: 'success' });

    const isAdmin = computed(() => ['owner', 'admin'].includes(state.currentOrg?.myRole));

    function showToast(message, type = 'success') {
      toast.message = message;
      toast.type = type;
      toast.show = true;
      setTimeout(() => toast.show = false, 3000);
    }

    function formatDate(d) {
      return new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function roleBadgeClass(role) {
      return { owner: 'badge-primary', admin: 'badge-secondary', member: 'badge-ghost', viewer: 'badge-outline' }[role] || '';
    }

    async function init() {
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
          inviteError.value = e.message;
        }
        state.loading = false;
        return;
      }

      if (api.getToken()) {
        try {
          state.user = await api.auth.me();
          await loadOrgs();
        } catch (e) {
          api.clearTokens();
        }
      }
      state.loading = false;
    }

    async function loadOrgs() {
      const data = await api.orgs.list();
      state.orgs = data.orgs;
      const savedOrgId = localStorage.getItem('currentOrgId');
      if (savedOrgId) {
        const found = state.orgs.find(o => o._id === savedOrgId);
        if (found) selectOrg(found);
      } else if (state.orgs.length) {
        selectOrg(state.orgs[0]);
      }
    }

    async function selectOrg(org) {
      state.currentOrg = org;
      localStorage.setItem('currentOrgId', org._id);
      orgSettings.name = org.name;
      orgSettings.description = org.description || '';
      orgSettings.allowPublicJoin = org.allowPublicJoin || false;
      await Promise.all([loadMembers(), loadPendingCount()]);
      await nextTick();
      initCalendar();
    }

    async function loadMembers() {
      if (!state.currentOrg) return;
      const data = await api.members.list(state.currentOrg._id);
      members.value = data.members;
    }

    async function loadPendingCount() {
      if (!state.currentOrg || !isAdmin.value) return;
      try {
        const data = await api.events.pendingCount(state.currentOrg._id);
        pendingCount.value = data.count;
      } catch (e) {}
    }

    async function loadPendingEvents() {
      if (!state.currentOrg) return;
      const data = await api.events.list(state.currentOrg._id, { status: 'pending' });
      pendingEvents.value = data.events;
    }

    function initCalendar() {
      if (!state.currentOrg) return;
      const el = document.getElementById('calendar');
      if (!el) return;

      if (calendarInstance.value) calendarInstance.value.destroy();

      calendarInstance.value = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
        events: async (info, success, failure) => {
          try {
            const params = { from: info.startStr, to: info.endStr, status: 'approved' };
            const data = state.user 
              ? await api.events.list(state.currentOrg._id, params)
              : await api.events.listPublic(state.currentOrg._id, params);
            success(data.events.map(e => ({
              id: e._id,
              title: e.title,
              start: e.startAt,
              end: e.endAt,
              extendedProps: e
            })));
          } catch (e) { failure(e); }
        },
        eventClick: (info) => {
          if (!state.user) return;
          editEvent(info.event.extendedProps);
        },
        dateClick: (info) => {
          if (!state.user) return;
          resetEventForm();
          const d = new Date(info.dateStr);
          eventForm.startAt = toLocalDatetime(d);
          d.setHours(d.getHours() + 1);
          eventForm.endAt = toLocalDatetime(d);
          showEventModal.value = true;
        }
      });
      calendarInstance.value.render();
    }

    function toLocalDatetime(d) {
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    function resetEventForm() {
      editingEvent.value = null;
      Object.assign(eventForm, { title: '', description: '', startAt: '', endAt: '', location: '', category: '' });
    }

    function editEvent(e) {
      editingEvent.value = e;
      eventForm.title = e.title;
      eventForm.description = e.description || '';
      eventForm.startAt = toLocalDatetime(new Date(e.startAt));
      eventForm.endAt = toLocalDatetime(new Date(e.endAt));
      eventForm.location = e.location || '';
      eventForm.category = e.category || '';
      showEventModal.value = true;
    }

    function closeEventModal() {
      showEventModal.value = false;
      resetEventForm();
    }

    async function saveEvent() {
      state.submitting = true;
      state.error = null;
      try {
        const data = {
          title: eventForm.title,
          description: eventForm.description,
          startAt: new Date(eventForm.startAt).toISOString(),
          endAt: new Date(eventForm.endAt).toISOString(),
          location: eventForm.location,
          category: eventForm.category
        };
        if (editingEvent.value) {
          await api.events.update(state.currentOrg._id, editingEvent.value._id, data);
          showToast('Événement modifié');
        } else {
          await api.events.create(state.currentOrg._id, data);
          showToast(isAdmin.value ? 'Événement créé et publié' : 'Événement créé, en attente de validation');
        }
        closeEventModal();
        calendarInstance.value?.refetchEvents();
        loadPendingCount();
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    async function approveEvent(id) {
      state.submitting = true;
      try {
        await api.events.approve(state.currentOrg._id, id);
        showToast('Événement approuvé');
        await loadPendingEvents();
        loadPendingCount();
        calendarInstance.value?.refetchEvents();
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    function showRejectModal(event) {
      rejectModal.event = event;
      rejectModal.reason = '';
      rejectModal.show = true;
    }

    async function rejectEvent() {
      state.submitting = true;
      try {
        await api.events.reject(state.currentOrg._id, rejectModal.event._id, rejectModal.reason);
        showToast('Événement rejeté');
        rejectModal.show = false;
        await loadPendingEvents();
        loadPendingCount();
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    async function login() {
      state.submitting = true;
      state.error = null;
      try {
        const data = await api.auth.login(authForm.email, authForm.password);
        api.setTokens(data.token, data.refreshToken);
        state.user = data.user;
        await loadOrgs();
        view.value = 'home';
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
        state.user = data.user;
        await loadOrgs();
        view.value = 'home';
      } catch (e) {
        state.error = e.message;
      }
      state.submitting = false;
    }

    function logout() {
      api.clearTokens();
      state.user = null;
      state.orgs = [];
      state.currentOrg = null;
      localStorage.removeItem('currentOrgId');
      view.value = 'login';
    }

    async function createOrg() {
      state.submitting = true;
      try {
        const data = await api.orgs.create({ name: newOrg.name, description: newOrg.description });
        state.orgs.push(data.org);
        selectOrg(data.org);
        showCreateOrg.value = false;
        newOrg.name = '';
        newOrg.description = '';
        showToast('Organisation créée');
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    async function saveOrgSettings() {
      state.submitting = true;
      try {
        const data = await api.orgs.update(state.currentOrg._id, {
          name: orgSettings.name,
          description: orgSettings.description,
          allowPublicJoin: orgSettings.allowPublicJoin
        });
        Object.assign(state.currentOrg, data.org);
        const idx = state.orgs.findIndex(o => o._id === state.currentOrg._id);
        if (idx >= 0) state.orgs[idx] = { ...state.orgs[idx], ...data.org };
        showToast('Paramètres enregistrés');
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    async function addMember() {
      state.submitting = true;
      try {
        if (addMemberMode.value === 'invite') {
          await api.invites.create(state.currentOrg._id, { email: memberForm.email, role: memberForm.role });
          showToast('Invitation envoyée');
        } else {
          await api.members.add(state.currentOrg._id, {
            email: memberForm.email,
            role: memberForm.role,
            sendNotification: memberForm.sendNotification
          });
          showToast('Membre ajouté');
          await loadMembers();
        }
        showAddMember.value = false;
        memberForm.email = '';
        memberForm.role = 'member';
        memberForm.sendNotification = false;
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    async function removeMember(userId) {
      if (!confirm('Retirer ce membre ?')) return;
      try {
        await api.members.remove(state.currentOrg._id, userId);
        showToast('Membre retiré');
        await loadMembers();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function acceptInvite() {
      state.submitting = true;
      try {
        const payload = { token: inviteToken.value };
        if (!inviteInfo.value.userExists) {
          payload.name = inviteForm.name;
          payload.password = inviteForm.password;
        }
        await api.invites.accept(payload);
        showToast('Invitation acceptée!');
        window.location.href = '/';
      } catch (e) {
        showToast(e.message, 'error');
      }
      state.submitting = false;
    }

    function goHome() {
      if (state.user) {
        tab.value = 'calendar';
      } else {
        view.value = 'login';
      }
    }

    watch(tab, async (newTab) => {
      if (newTab === 'moderation') await loadPendingEvents();
      if (newTab === 'calendar') await nextTick(() => initCalendar());
    });

    onMounted(init);

    return {
      state, view, tab, authForm, newOrg, eventForm, memberForm, orgSettings,
      showCreateOrg, showEventModal, showAddMember, addMemberMode, editingEvent,
      members, pendingEvents, pendingCount, isAdmin,
      inviteToken, inviteInfo, inviteError, inviteForm,
      rejectModal, toast,
      login, register, logout, createOrg, saveOrgSettings,
      selectOrg, addMember, removeMember,
      saveEvent, closeEventModal, approveEvent, showRejectModal, rejectEvent,
      acceptInvite, goHome,
      formatDate, roleBadgeClass
    };
  }
}).mount('#app');
