(function () {
  'use strict';

  const root = document.documentElement;
  const supported = new Set(['ru', 'en']);
  const htmlLocale = String(root.lang || 'ru').toLowerCase().split('-')[0];
  const locale = supported.has(htmlLocale) ? htmlLocale : 'ru';
  const source = document.getElementById('mcv-i18n');
  let messages = {};

  try {
    messages = source ? JSON.parse(source.textContent || '{}') : {};
  } catch (error) {
    // A malformed or unavailable dictionary must not disable the storefront.
    messages = {};
  }

  const readPath = (object, path) => String(path || '').split('.').reduce((value, key) => (
    value == null ? undefined : value[key]
  ), object);

  // The generator embeds one locale object in each page. Accept a wrapped
  // { ru, en } dictionary as well so the runtime remains useful standalone.
  const dictionary = messages[locale] && typeof messages[locale] === 'object'
    ? messages[locale]
    : messages;
  const fallbackDictionary = messages.ru && typeof messages.ru === 'object'
    ? messages.ru
    : {};

  const fallback = (path) => readPath(fallbackDictionary, path);

  function t(path, replacements) {
    let result = readPath(dictionary, path);
    if (result == null) result = fallback(path);
    if (result == null) return String(path || '');
    result = String(result);

    if (replacements && typeof replacements === 'object') {
      Object.entries(replacements).forEach(([key, replacement]) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement));
      });
    }
    return result;
  }

  function value(entry) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      return entry[locale] ?? entry.ru ?? entry.en ?? '';
    }
    return entry ?? '';
  }

  function money(amount) {
    const number = Number(amount || 0);
    let formatted;
    try {
      formatted = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU').format(number);
    } catch (error) {
      formatted = String(number);
    }
    return `${formatted} ₽`;
  }

  function localeFromLink(link) {
    const declared = String(link.dataset.locale || '').toLowerCase().split('-')[0];
    if (supported.has(declared)) return declared;

    const label = String(link.textContent || '').trim().toLowerCase();
    if (label === 'en' || label === 'english') return 'en';
    if (label === 'ru' || label === 'русский' || label === 'russian') return 'ru';

    try {
      const path = new URL(link.getAttribute('href') || '', location.href).pathname.toLowerCase();
      if (/\/(?:en)(?:\/|$)/.test(path)) return 'en';
      if (/\/(?:ru)(?:\/|$)/.test(path)) return 'ru';
    } catch (error) { /* invalid href: leave navigation untouched */ }
    return null;
  }

  function rememberLocale(nextLocale) {
    try {
      if (nextLocale === 'en') localStorage.setItem('mcv-locale', 'en');
      else if (nextLocale === 'ru') localStorage.removeItem('mcv-locale');
    } catch (error) {
      // Private browsing/storage restrictions must not block the link.
    }
  }

  function initLanguageLinks() {
    document.querySelectorAll('.lang-link, [data-locale]').forEach((link) => {
      link.addEventListener('click', () => {
        const nextLocale = localeFromLink(link);
        if (nextLocale) rememberLocale(nextLocale);

        // Keep the current section when the target link points to a page
        // without an explicit fragment. Storage is deliberately best effort.
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        try {
          const target = new URL(href, location.href);
          if (location.hash && !target.hash) target.hash = location.hash;
          link.href = target.href;
        } catch (error) { /* browser will handle the original href */ }
      });
    });
  }

  window.mcvI18n = Object.freeze({ locale, t, value, money });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageLinks, { once: true });
  } else {
    initLanguageLinks();
  }
})();
