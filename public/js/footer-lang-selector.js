(function () {
  function getCookie(name) {
    const cookie = document.cookie || '';
    const parts = cookie.split(';');
    for (const p of parts) {
      const [k, ...rest] = p.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('=') || '');
    }
    return null;
  }

  function setCookie(name, value, days) {
    const maxAge = days * 60 * 60 * 24;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  async function loadBundle(locale) {
    const url = `/api/i18n/bundle?locale=${encodeURIComponent(locale)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load i18n bundle');
    return data;
  }

  function safeParseJson(str) {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function applyI18nToDom(entries) {
    const nodes = document.querySelectorAll('[data-i18n-key]');
    nodes.forEach((el) => {
      const key = el.getAttribute('data-i18n-key');
      if (!key) return;

      const raw = Object.prototype.hasOwnProperty.call(entries, key) ? entries[key] : null;
      if (raw === null || raw === undefined || raw === '') {
        return;
      }

      const vars = safeParseJson(el.getAttribute('data-i18n-vars')) || null;
      let value = String(raw);

      if (vars) {
        value = value.replace(/\{([a-zA-Z0-9_\-\.]+)\}/g, (m, k) => {
          if (Object.prototype.hasOwnProperty.call(vars, k)) return String(vars[k]);
          return m;
        });
      }

      const attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        for (const a of attr.split(',').map((x) => x.trim()).filter(Boolean)) {
          el.setAttribute(a, value);
        }
        return;
      }

      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });
  }

  const select = document.getElementById('lang-select');
  if (!select) return;

  const current = getCookie('lang') || document.documentElement.getAttribute('lang') || 'fr';
  select.value = current;

  select.addEventListener('change', async () => {
    const newLocale = select.value;
    
    // Update cookie
    setCookie('lang', newLocale, 365);
    
    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', newLocale);
    
    // Load and apply new translations immediately
    try {
      const bundle = await loadBundle(newLocale);
      applyI18nToDom(bundle.entries || {});
    } catch (e) {
      console.error('Failed to apply i18n:', e);
    }
  });
})();
