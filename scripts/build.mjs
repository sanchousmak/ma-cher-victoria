import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_PATH = resolve(ROOT, 'src/index.template.html');
const LOCALES_DIR = resolve(ROOT, 'src/locales');
const SITE_ROOT = 'https://macherevictoria.artalbom-graf.com/';
const GENERATED = '<!-- GENERATED FILE — edit src/index.template.html, src/404.template.html, and src/locales/*.json, then run npm run build. -->';
const RAW_TEMPLATE_MARKERS = new Set([
  'switch.ruAriaCurrent',
  'switch.enAriaCurrent',
  'notFound.config'
]);

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const safeJson = (value) => JSON.stringify(value)
  .replaceAll('<', '\\u003C')
  .replaceAll('>', '\\u003E')
  .replaceAll('&', '\\u0026')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');

function getPath(value, path) {
  return path.split('.').reduce((current, part) => current?.[part], value);
}

function flatten(value, prefix = '', result = new Set()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, result);
    else result.add(path);
  }
  return result;
}

function validateLocaleParity(ru, en) {
  const ruKeys = flatten(ru);
  const enKeys = flatten(en);
  const missingInEn = [...ruKeys].filter((key) => !enKeys.has(key));
  const missingInRu = [...enKeys].filter((key) => !ruKeys.has(key));
  if (missingInEn.length || missingInRu.length) {
    throw new Error(`Locale key parity failed. Missing in en: ${missingInEn.join(', ') || 'none'}; missing in ru: ${missingInRu.join(', ') || 'none'}`);
  }
}

function validateTemplateKeys(template, locale) {
  const markerKeys = [...template.matchAll(/\{\{i18n\.([^{}]+)\}\}/g)].map((match) => match[1]);
  const missingMarkers = markerKeys.filter((key) => getPath(locale, key) === undefined);
  const dataKeys = [...template.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
  const missingDataKeys = dataKeys.filter((key) => getPath(locale, key) === undefined);
  if (missingMarkers.length || missingDataKeys.length) {
    const missing = [...new Set([...missingMarkers, ...missingDataKeys])];
    throw new Error(`Template references missing locale keys: ${missing.join(', ')}`);
  }
}

function renderTemplate(template, locale, code) {
  const localeMeta = {
    code,
    heroPortrait: code === 'en' ? 'main-portrait-eng.webp' : 'main-portrait-rus.webp',
    blueHeading: code === 'en' ? 'blue_room_heading.png' : 'blue_room_heading_rus.png',
    yellowHeading: code === 'en' ? 'yellow_heading_eng.png' : 'yellow_heading_rus.png',
    json: safeJson(locale)
  };
  const context = {
    locale: localeMeta,
    i18n: locale,
    switch: {
      ru: '../ru/',
      en: '../en/',
      ruClass: code === 'ru' ? ' active' : '',
      enClass: code === 'en' ? ' active' : '',
      ruAriaCurrent: code === 'ru' ? 'aria-current="page"' : '',
      enAriaCurrent: code === 'en' ? 'aria-current="page"' : ''
    },
    route: {
      blue: `../404.html?lang=${code}`,
      yellow: `../404.html?lang=${code}`
    },
    seo: {
      canonical: `${SITE_ROOT}${code}/`,
      ru: `${SITE_ROOT}ru/`,
      en: `${SITE_ROOT}en/`,
      default: SITE_ROOT
    }
  };
  const rendered = template.replace(/\{\{([^{}]+)\}\}/g, (whole, key) => {
    const value = getPath(context, key.trim());
    if (value === undefined) throw new Error(`Unresolved template marker: ${whole}`);
    return key.trim() === 'locale.json' || RAW_TEMPLATE_MARKERS.has(key.trim())
      ? value
      : escapeHtml(value);
  });
  if (/\{\{[^{}]+\}\}/.test(rendered)) throw new Error(`Unresolved template marker in ${code}/index.html`);
  return `${GENERATED}\n${rendered}`;
}

function renderRouter() {
  return `${GENERATED}
<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ma chere Victoria</title>
  <meta http-equiv="refresh" content="0; url=ru/">
  <link rel="canonical" href="${SITE_ROOT}">
</head>
<body>
  <main>
    <p><a href="ru/">Русская версия</a> / <a href="en/">English version</a></p>
    <noscript><p><a href="ru/">Продолжить на русском</a></p></noscript>
  </main>
  <script>
    (() => {
      let saved = '';
      try { saved = localStorage.getItem('mcv-locale') || ''; } catch (_) {}
      const target = saved === 'en' ? 'en/' : 'ru/';
      const url = new URL(target, location.href);
      url.search = location.search;
      url.hash = location.hash;
      location.replace(url.href);
    })();
  </script>
</body>
</html>
`;
}

function renderNotFound(template, ru, en) {
  const config = {
    home: {
      ru: `ru/`,
      en: `en/`
    },
    dictionaries: {
      ru: ru.notFound,
      en: en.notFound
    }
  };
  const context = {
    notFound: {
      ru: ru.notFound,
      en: en.notFound,
      homeRu: config.home.ru,
      homeEn: config.home.en,
      config: safeJson(config)
    }
  };
  const rendered = template.replace(/\{\{([^{}]+)\}\}/g, (whole, key) => {
    const value = getPath(context, key.trim());
    if (value === undefined) throw new Error(`Unresolved 404 template marker: ${whole}`);
    return key.trim() === 'notFound.config' ? value : escapeHtml(value);
  });
  if (/\{\{[^{}]+\}\}/.test(rendered)) throw new Error('Unresolved template marker in 404.html');
  return `${GENERATED}\n${rendered}`;
}

async function loadLocale(code) {
  const path = resolve(LOCALES_DIR, `${code}.json`);
  return JSON.parse(await readFile(path, 'utf8'));
}

async function main() {
  const [template, ru, en] = await Promise.all([
    readFile(TEMPLATE_PATH, 'utf8'),
    loadLocale('ru'),
    loadLocale('en')
  ]);
  validateLocaleParity(ru, en);
  validateTemplateKeys(template, ru);
  validateTemplateKeys(template, en);

  for (const code of ['ru', 'en']) {
    const outputPath = resolve(ROOT, code, 'index.html');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, renderTemplate(template, code === 'ru' ? ru : en, code), 'utf8');
  }
  const notFoundTemplate = await readFile(resolve(ROOT, 'src/404.template.html'), 'utf8');
  await writeFile(resolve(ROOT, '404.html'), renderNotFound(notFoundTemplate, ru, en), 'utf8');
  await writeFile(resolve(ROOT, 'index.html'), renderRouter(), 'utf8');
  console.log(`Built ${relative(ROOT, resolve(ROOT, 'index.html'))}, ru/index.html, en/index.html, and 404.html`);
}

main().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
