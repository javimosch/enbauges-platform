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

    const tab = ref('calendar');
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
      if (!api.getToken()) {
        window.location.href = '/login';
        return;
      }

      try {
        state.user = await api.auth.me();
      } catch (e) {
        api.clearTokens();
        window.location.href = '/login';
        return;
      }

      await loadOrgs();
      state.loading = false;
    }

    async function loadOrgs() {
      const data = await api.orgs.list();
      state.orgs = data.orgs;
      const savedOrgId = localStorage.getItem('currentOrgId');
      if (savedOrgId) {
        const found = state.orgs.find(o => o._id === savedOrgId);
        if (found) await selectOrg(found);
      } else if (state.orgs.length) {
        await selectOrg(state.orgs[0]);
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
      if (!state.currentOrg || !isAdmin.value) {
        pendingCount.value = 0;
        return;
      }
      try {
        const data = await api.events.pendingCount(state.currentOrg._id);
        pendingCount.value = data.count;
      } catch (e) {
        pendingCount.value = 0;
      }
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
            const params = { from: info.startStr, to: info.endStr };
            const data = await api.events.list(state.currentOrg._id, params);
            success(data.events.map(e => ({
              id: e._id,
              title: e.title,
              start: e.startAt,
              end: e.endAt,
              extendedProps: e
            })));
          } catch (e) {
            failure(e);
          }
        },
        eventClick: (info) => {
          editEvent(info.event.extendedProps);
        },
        dateClick: (info) => {
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

    function logout() {
      api.clearTokens();
      localStorage.removeItem('currentOrgId');
      window.location.href = '/';
    }

    async function createOrg() {
      state.submitting = true;
      try {
        const data = await api.orgs.create({ name: newOrg.name, description: newOrg.description });
        state.orgs.push(data.org);
        await selectOrg(data.org);
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

    watch(tab, async (newTab) => {
      if (newTab === 'moderation') await loadPendingEvents();
      if (newTab === 'calendar') await nextTick(() => initCalendar());
    });

    onMounted(init);

    return {
      state, tab, newOrg, eventForm, memberForm, orgSettings,
      showCreateOrg, showEventModal, showAddMember, addMemberMode, editingEvent,
      members, pendingEvents, pendingCount, isAdmin,
      rejectModal, toast,
      selectOrg, logout, createOrg, saveOrgSettings,
      saveEvent, closeEventModal, approveEvent, showRejectModal, rejectEvent,
      addMember, removeMember,
      formatDate, roleBadgeClass
    };
  }
}).mount('#app');
