(function () {
  function getMeta(name) {
    const el = document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute('content') : null;
  }

  function getCookie(name) {
    const cookie = document.cookie || '';
    const parts = cookie.split(';');
    for (const p of parts) {
      const [k, ...rest] = p.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('=') || '');
    }
    return null;
  }

  function resolveLocale() {
    const cookieLang = getCookie('lang');
    if (cookieLang) return cookieLang;
    const htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang) return htmlLang;
    return 'fr';
  }

  async function getPublicSetting(key) {
    try {
      const res = await fetch('/api/settings/public', { headers: { 'Accept': 'application/json' } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) return null;
      const found = data.find((s) => s && s.key === key);
      return found ? found.value : null;
    } catch (e) {
      return null;
    }
  }

  async function isInjectionEnabled() {
    const meta = getMeta('enbauges:i18n-inject');
    if (meta === '1') return true;
    if (meta === '0') return false;

    const setting = await getPublicSetting('i18n.injectEnabled');
    if (setting === 'true') return true;
    if (setting === 'false') return false;

    return false;
  }

  function safeParseJson(str) {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  async function loadBundle(locale) {
    const url = `/api/i18n/bundle?locale=${encodeURIComponent(locale)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load i18n bundle');
    return data;
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

  async function init() {
    const enabled = await isInjectionEnabled();
    if (!enabled) return;

    const locale = resolveLocale();

    try {
      const bundle = await loadBundle(locale);
      applyI18nToDom(bundle.entries || {});
    } catch (e) {
      // silent by design
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
