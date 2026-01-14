const { createApp, reactive } = Vue;

createApp({
  setup() {
    const state = reactive({
      user: null,
      submitting: false,
      success: null,
      error: null,
    });

    const form = reactive({
      name: '',
      email: '',
      subject: '',
      message: '',
    });

    async function submit() {
      state.success = null;
      state.error = null;

      const payload = {
        formKey: 'contact',
        fields: {
          name: form.name || null,
          email: (form.email || '').trim(),
          subject: form.subject || null,
          message: (form.message || '').trim(),
        },
      };

      state.submitting = true;
      try {
        const res = await fetch('/api/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          state.error = data?.error || 'Erreur lors de l\'envoi.';
          return;
        }
        state.success = 'Merci ! Votre message a bien été envoyé.';
        form.name = '';
        form.email = '';
        form.subject = '';
        form.message = '';
      } catch (e) {
        state.error = e?.message || 'Erreur lors de l\'envoi.';
      } finally {
        state.submitting = false;
      }
    }

    return { state, form, submit };
  }
}).mount('#app');
