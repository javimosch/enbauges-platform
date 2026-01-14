const { createApp, reactive, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const state = reactive({
      loading: true,
      error: null,
      metrics: {
        loading: true,
        error: null,
        activeUsers: 0,
        servicesConsulted: 0,
        newsletterSubscribers: 0,
      },
      newsletter: {
        email: '',
        submitting: false,
        success: null,
        error: null
      }
    });

    const calendar = reactive({ instance: null });

    function initCalendar(timeout = 10) {
      const el = document.getElementById('calendar');
      if (!el){
        if (timeout > 0){
          console.log('Calendar element not found, retrying...');
          setTimeout(() => initCalendar(timeout - 1), 100);
        }else{
          console.error('Calendar element not found');
        }
        return
      }

      if (calendar.instance){
         console.warn('Calendar instance already exists');
         calendar.instance.destroy();
      }

      console.log('Initializing calendar');

      calendar.instance = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
        events: async (info, success, failure) => {
          try {
            const params = { from: info.startStr, to: info.endStr };
            const data = await api.events.listPublicAll(params);
            success(data.events.map(e => ({
              id: e._id,
              title: e.org?.name ? `[${e.org.name}] ${e.title}` : e.title,
              start: e.startAt,
              end: e.endAt,
              extendedProps: e
            })));
          } catch (e) {
            failure(e);
          }
        },
        eventClick: (info) => {
          const e = info.event.extendedProps;
          const start = new Date(e.startAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
          const end = new Date(e.endAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
          alert(`${e.title}\n\n${start} → ${end}${e.location ? `\n\nLieu: ${e.location}` : ''}${e.description ? `\n\n${e.description}` : ''}`);
        }
      });

      calendar.instance.render();
    }

    onMounted(async () => {
      try {
        await nextTick();
        initCalendar();
        track('page_view', { page: 'landing' });
        await fetchImpactMetrics();
      } catch (e) {
        state.error = e.message;
      }
      state.loading = false;
    });

    function formatCompactNumber(n) {
      const num = Number(n || 0);
      try {
        return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
      } catch (e) {
        return String(num);
      }
    }

    async function fetchImpactMetrics() {
      state.metrics.loading = true;
      state.metrics.error = null;
      try {
        const res = await fetch('/api/metrics/impact');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          state.metrics.error = data?.error || 'Erreur métriques';
          return;
        }
        state.metrics.activeUsers = Number(data?.activeUsers || 0);
        state.metrics.servicesConsulted = Number(data?.servicesConsulted || 0);
        state.metrics.newsletterSubscribers = Number(data?.newsletterSubscribers || 0);
      } catch (e) {
        state.metrics.error = e?.message || 'Erreur métriques';
      } finally {
        state.metrics.loading = false;
      }
    }

    async function track(action, meta) {
      try {
        await fetch('/api/metrics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, meta: meta || null })
        });
      } catch (e) {
        // ignore
      }
    }

    function trackService(serviceKey) {
      track('service_view', { service: serviceKey, page: 'landing' });
      state.metrics.servicesConsulted = Number(state.metrics.servicesConsulted || 0) + 1;
    }

    async function submitNewsletter() {
      state.newsletter.success = null;
      state.newsletter.error = null;

      const email = (state.newsletter.email || '').trim();
      if (!email) {
        state.newsletter.error = 'Veuillez saisir une adresse email.';
        return;
      }

      state.newsletter.submitting = true;
      try {
        const res = await fetch('/api/enbauges/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          state.newsletter.error = data?.error || 'Erreur lors de l\'inscription.';
          return;
        }

        state.newsletter.success = 'Merci ! Vous êtes bien inscrit(e).';
        state.newsletter.email = '';
      } catch (e) {
        state.newsletter.error = e?.message || 'Erreur lors de l\'inscription.';
      } finally {
        state.newsletter.submitting = false;
      }
    }

    return { state, submitNewsletter, trackService, formatCompactNumber };
  }
}).mount('#app');
