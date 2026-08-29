// ==========================================================================
// НАСТРОЙКИ
// ==========================================================================
const SHOP_EMAIL = 'victtoress@mail.com';   // ← сюда приходят заказы
const CURRENCY = '₽';
const CART_KEY = 'mcv-cart';             // ключ хранения корзины
const CART_BADGE_POSITION = 'top-right';  // 'top-right' | 'bottom-right'
const i18n = window.mcvI18n || {
  t: (path) => path,
  value: (entry) => (entry && typeof entry === 'object' ? (entry.ru ?? entry.en ?? '') : (entry ?? '')),
  money: (amount) => `${Number(amount || 0).toLocaleString('ru-RU')} ${CURRENCY}`
};
const t = (path, replacements) => i18n.t(path, replacements);
const value = (entry) => i18n.value(entry);

// ==========================================================================
// 1. УТИЛИТЫ
// ==========================================================================
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const money = (n) => i18n.money(n);
const num = (i) => String(i + 1).padStart(2, '0');
const caption = (o) => [value(o.year), value(o.material), value(o.size)].filter(Boolean).join(' · ');

const localized = (item, field, fallback = '') => {
  const result = value(item?.[field]);
  return result || fallback;
};

/**
 * Тег картинки с адаптивными срезами.
 * Мелкая копия ожидается рядом с оригиналом: work-1.webp → work-1-sm.webp.
 * Если её нет или файл не webp — отдаём обычный src без srcset.
 */
function imgTag(src, alt, { sizes, eager = false, ratio = '4/5' } = {}) {
  const small = src.endsWith('.webp') ? src.replace(/\.webp$/, '-sm.webp') : null;
  const [w, h] = ratio.split('/').map(Number);

  return `<img src="${esc(src)}"
    ${small && sizes ? `srcset="${esc(small)} 800w, ${esc(src)} 1400w" sizes="${esc(sizes)}"` : ''}
    alt="${esc(alt)}"
    width="${w * 100}" height="${h * 100}"
    loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}

// ==========================================================================
// 2. ПОДГРУЗКА HTML-ЧАСТЕЙ
// ==========================================================================
async function loadParts() {
  const nodes = [...document.querySelectorAll('[data-include]')];
  if (!nodes.length) return;

  await Promise.all(nodes.map(async (el) => {
    try {
      const res = await fetch(el.dataset.include);
      if (!res.ok) throw new Error(res.status);
      el.outerHTML = await res.text();
    } catch (e) {
      console.error('Не загрузилась часть HTML:', el.dataset.include, e);
    }
  }));

  if (document.querySelector('[data-include]')) await loadParts();
}

// ==========================================================================
// 3. МЕНЮ
// ==========================================================================
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? t('access.closeMenu') : t('access.openMenu'));
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

  return setOpen;
}

function initScrollSpy() {
  const links = [...document.querySelectorAll('.menu a[href^="#"]')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!sections.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((s) => io.observe(s));
}

// ==========================================================================
// 4. КАРУСЕЛЬ «СЕРИЯ РАБОТ»
// ==========================================================================
const ARROW = {
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M15 4 7 12l8 8"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>'
};

const CAROUSEL_SIZES = '(max-width: 700px) 82vw, (max-width: 1100px) 45vw, 30vw';

function workMarkup(item, i, eager) {
  const title = localized(item, 'title', t('messages.untitled'));
  const note = esc(caption(item));

  return `
    <article class="work">
      <div class="work-media">
        ${imgTag(item.image, title, { sizes: CAROUSEL_SIZES, eager })}
      </div>
      <div class="work-meta">
        <div>
          <h3 class="work-title">${num(i)} — ${esc(title)}</h3>
          ${note ? `<span class="work-note">${note}</span>` : ''}
        </div>
      </div>
    </article>`;
}

function renderCarousel(root, items, label) {
  if (!root) return;

  if (!items?.length) {
    root.innerHTML = `<p class="state-empty">${esc(t('catalog.empty'))}</p>`;
    return;
  }

  root.innerHTML = `
    <div class="carousel">
      <div class="carousel-track" role="region" aria-label="${esc(t('catalog.aria'))}" tabindex="0">
        ${items.map((it, i) => `<div class="carousel-slide">${workMarkup(it, i, i < 2)}</div>`).join('')}
      </div>
      <div class="carousel-controls">
        <button class="carousel-btn" data-dir="-1" aria-label="${esc(t('catalog.previous'))}">${ARROW.prev}</button>
        <button class="carousel-btn" data-dir="1" aria-label="${esc(t('catalog.next'))}">${ARROW.next}</button>
        <span class="carousel-counter" aria-live="polite"></span>
        <span class="carousel-progress"><i></i></span>
      </div>
    </div>`;

  wireCarousel(root, items.length);
}

function wireCarousel(root, total) {
  const track = root.querySelector('.carousel-track');
  const buttons = root.querySelectorAll('.carousel-btn');
  const counter = root.querySelector('.carousel-counter');
  const bar = root.querySelector('.carousel-progress i');

  const step = () => {
    const slide = track.querySelector('.carousel-slide');
    if (!slide) return track.clientWidth;
    return slide.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
  };

  buttons.forEach((btn) => btn.addEventListener('click', () => {
    track.scrollBy({ left: step() * Number(btn.dataset.dir), behavior: 'smooth' });
  }));

  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    track.scrollBy({ left: step() * (e.key === 'ArrowRight' ? 1 : -1), behavior: 'smooth' });
  });

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const visible = Math.max(1, Math.round(track.clientWidth / step()));
    const index = max > 0 ? Math.round(track.scrollLeft / step()) : 0;

    counter.textContent = `${num(Math.min(index, total - 1))} / ${num(total - 1)}`;

    const width = Math.min(100, (visible / total) * 100);
    const progress = max > 0 ? track.scrollLeft / max : 0;
    bar.style.width = width + '%';
    bar.style.transform = `translateX(${progress * (100 - width) / width * 100}%)`;

    buttons[0].disabled = track.scrollLeft <= 2;
    buttons[1].disabled = track.scrollLeft >= max - 2;
  };

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });

  new ResizeObserver(update).observe(track);
  update();
}

function collectItems(filter) {
  if (typeof gallery === 'undefined') return [];
  return filter === 'all' ? Object.values(gallery).flat() : (gallery[filter] || []);
}

function renderCatalog(filter = 'all') {
  renderCarousel(document.getElementById('catalogGrid'), collectItems(filter), t('catalog.aria'));
}

function initFilters(selector, onChange) {
  const tabs = [...document.querySelectorAll(selector)];
  if (!tabs.length) return;

  tabs.forEach((btn) => btn.addEventListener('click', () => {
    tabs.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    onChange(btn.dataset.filter);
  }));
}
// ==========================================================================
// ==========================================================================

// ==========================================================================
// 5. СТЕНА (магазин)
// ==========================================================================
const shopItems = () => (typeof shop === 'undefined' ? [] : shop);
const findItem = (id) => shopItems().find((i) => String(i.id) === String(id));

// Пропорция работы: пустое место от проданной картины занимает ровно
// столько же, сколько занимала она сама
const ratioOf = (item) => item.ratio || '4/5';

const WALL_SIZES = '(max-width: 700px) 88vw, (max-width: 1100px) 44vw, 30vw';

function hangMarkup(item, i) {
  const sold = item.status === 'sold';
  const title = localized(item, 'title', t('messages.untitled'));
  const meta = esc([localized(item, 'type'), localized(item, 'size')].filter(Boolean).join(' · '));
  const scale = item.scale === 's' || item.scale === 'l' ? ` is-${item.scale}` : '';
  const ratio = ratioOf(item);

  const body = sold
    ? `<div class="hang-ghost" style="aspect-ratio:${esc(ratio)}; opacity: 0.05" aria-hidden="true">
         ${imgTag(item.image, title, { sizes: WALL_SIZES, eager: i < 4, ratio })} 
      </div>`
    : `<div class="hang-media" style="aspect-ratio:${esc(ratio)}">
         ${imgTag(item.image, title, { sizes: WALL_SIZES, eager: i < 4, ratio })}
       </div>`;

  const label = `
    <div class="hang-label">
      <span class="hang-index">№${num(i)}</span>
      <span class="hang-title">${esc(title)}
        ${meta ? `<span class="hang-meta">${meta}</span>` : ''}
        ${sold && item.collection ? `<span class="hang-collection">${esc(localized(item, 'collection'))}</span>` : ''}
      </span>
      <span class="hang-price">${sold ? esc(t('spread.soldIndex')) : money(item.price)}</span>
    </div>`;

  // Проданная работа тоже кликабельна: у неё есть своя история
  return `
    <article class="hang${scale}">
      <span class="hang-nail" aria-hidden="true"></span>
      <button class="hang-frame" data-open="${esc(item.id)}" aria-label="${esc(`${title} — ${t('spread.aria')}`)}">
        ${body}
        ${label}
      </button>
    </article>`;
}

function renderShop(filter = 'all') {
  const wall = document.getElementById('shopWall');
  if (!wall) return;

  const items = shopItems().filter((it) => filter === 'all' || it.kind === filter);

  wall.innerHTML = items.length
    ? items.map(hangMarkup).join('')
    : `<p class="state-empty">${esc(t('catalog.empty'))}</p>`;
}

// ==========================================================================
// 6. РАЗВОРОТ РАБОТЫ
// ==========================================================================
let lastFocused = null;   // куда вернуть фокус после закрытия

function specRow(name, value) {
  return value ? `<div><span>${esc(name)}</span><span>${esc(value)}</span></div>` : '';
}

function openSpread(id) {
  const item = findItem(id);
  const spread = document.getElementById('spread');
  if (!item || !spread) return;

  lastFocused = document.activeElement;

  const index = shopItems().indexOf(item);
  const sold = item.status === 'sold';

  spread.querySelector('.spread-inner').innerHTML = `
    <div class="spread-main">
      ${imgTag(item.image, localized(item, 'title', t('messages.untitled')), { eager: true, ratio: ratioOf(item) })}
    </div>

    <div class="spread-side">
      <span class="spread-index">№${num(index)}${sold ? ` — ${esc(t('spread.soldIndex'))}` : ''}</span>
      <h2 class="spread-title">${esc(localized(item, 'title', t('messages.untitled')))}</h2>

      ${item.detail ? `
        <div class="spread-detail">${imgTag(item.detail, t('spread.detailAlt'), { eager: true })}</div>
        <p class="spread-detail-note">${esc(t('spread.detailNote'))}</p>` : ''}

      ${item.about ? `<p class="spread-about">${esc(localized(item, 'about'))}</p>` : ''}

      <div class="spread-specs">
        ${specRow(t('spread.year'), value(item.year))}
        ${specRow(t('spread.material'), localized(item, 'material'))}
        ${specRow(t('spread.size'), localized(item, 'size'))}
        ${specRow(t('spread.type'), localized(item, 'type'))}
        ${specRow(t('spread.price'), sold ? '—' : money(item.price))}
      </div>

      ${sold
        ? `<p class="spread-sold">${esc(localized(item, 'collection', t('spread.soldDefault')))}</p>`
        : `<div class="spread-buy">
             <button class="btn" data-add="${esc(item.id)}">${esc(t('spread.addToCart'))} — ${money(item.price)}</button>
             <p class="spread-ship">${esc(t('spread.shipping'))}</p>
           </div>`}
    </div>`;

  spread.classList.add('is-open');
  spread.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-locked');
  spread.querySelector('.spread-close')?.focus();
}

function closeSpread() {
  const spread = document.getElementById('spread');
  if (!spread?.classList.contains('is-open')) return;

  spread.classList.remove('is-open');
  spread.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-locked');
  lastFocused?.focus();
}

// ==========================================================================
// 7. КОРЗИНА
// ==========================================================================
const cart = {
  items: [],

  // Храним только id: цены и названия всегда берём из gallery.js,
  // иначе после правки прайса в корзине останется старая цена
  load() {
    try {
      const ids = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      this.items = ids.map(findItem).filter((i) => i && i.status !== 'sold');
    } catch (e) {
      this.items = [];
    }
  },

  save() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items.map((i) => i.id)));
    } catch (e) { /* приватный режим — просто не сохраняем */ }
  },

  add(id) {
    const product = findItem(id);
    if (!product || product.status === 'sold') return false;
    if (this.items.some((i) => i.id === product.id)) return false;  // оригинал один
    this.items.push(product);
    this.save();
    this.render();
    return true;
  },

  remove(id) {
    this.items = this.items.filter((i) => String(i.id) !== String(id));
    this.save();
    this.render();
  },

  total() { return this.items.reduce((s, i) => s + Number(i.price || 0), 0); },

  render() {
    const body = document.getElementById('cartBody');
    if (!body) return;

    body.innerHTML = this.items.length
      ? this.items.map((i) => `
          <div class="cart-item">
            <img src="${esc(i.image.endsWith('.webp') ? i.image.replace(/\.webp$/, '-sm.webp') : i.image)}"
                 alt="" width="64" height="80" loading="lazy">
            <div>
              <h4>${esc(localized(i, 'title', t('messages.untitled')))}</h4>
              <span class="cart-item-note">${esc([localized(i, 'type'), localized(i, 'size')].filter(Boolean).join(' · '))}</span>
              <button class="cart-remove" data-remove="${esc(i.id)}">${esc(t('cart.remove'))}</button>
            </div>
            <span class="cart-item-price">${money(i.price)}</span>
          </div>`).join('')
      : `<p class="cart-empty">${esc(t('cart.empty'))}</p>`;

    document.getElementById('cartTotal').textContent = money(this.total());

    const count = this.items.length;
    const countElement = document.getElementById('cartCount');
    const toggle = document.getElementById('cartToggle');
    if (countElement) {
      countElement.textContent = String(count);
      countElement.hidden = count === 0;
    }
    toggle?.setAttribute(
      'aria-label',
      count ? t('cart.countLabel', { count }) : t('cart.emptyLabel')
    );

    const order = document.getElementById('cartOrder');
    order.classList.toggle('is-disabled', !this.items.length);
    order.setAttribute('aria-disabled', String(!this.items.length));
    order.href = this.items.length ? this.mailto() : '#';
  },

  // Бэкенда у статического хостинга нет — заказ уходит письмом
  mailto() {
    const lines = this.items.map((i) =>
      t('mail.lineSeparator', {
        title: localized(i, 'title', t('messages.untitled')),
        details: [localized(i, 'type'), localized(i, 'size')].filter(Boolean).join(', '),
        price: money(i.price)
      }));

    const body = [
      t('mail.greeting'), '',
      ...lines, '',
      t('mail.total', { total: money(this.total()) }), '',
      t('mail.name'),
      t('mail.location'),
      t('mail.address'),
      t('mail.phone')
    ].join('\n');

    return `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent(t('mail.subject'))}&body=${encodeURIComponent(body)}`;
  }
};

let setCartOpen = () => {};

function initCart() {
  const panel = document.getElementById('cartPanel');
  const overlay = document.getElementById('cartOverlay');
  const toggle = document.getElementById('cartToggle');
  if (!panel || !toggle) return;

  toggle.dataset.badgePosition = ['top-right', 'bottom-right'].includes(CART_BADGE_POSITION)
    ? CART_BADGE_POSITION
    : 'top-right';

  setCartOpen = (open) => {
    panel.classList.toggle('is-open', open);
    overlay?.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
    if (open) panel.querySelector('.cart-close')?.focus();
  };

  toggle.addEventListener('click', () => setCartOpen(true));
  overlay?.addEventListener('click', () => setCartOpen(false));
  panel.querySelector('.cart-close')?.addEventListener('click', () => setCartOpen(false));

  toggle.hidden = false;
  cart.load();
  cart.render();
}

// ==========================================================================
// 8. ОБЩЕЕ ДЕЛЕГИРОВАНИЕ
// ==========================================================================
// Карточки перерисовываются при смене фильтра, поэтому слушаем документ
function initDelegation() {
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) { openSpread(open.dataset.open); return; }

    if (e.target.closest('.spread-close') || e.target.closest('.spread-overlay')) {
      closeSpread();
      return;
    }

    const add = e.target.closest('[data-add]');
    if (add) {
      const ok = cart.add(add.dataset.add);
      const original = add.textContent;
      add.textContent = ok ? t('messages.added') : t('messages.alreadyInCart');
      add.classList.add('btn-added');
      setTimeout(() => {
        add.textContent = original;
        add.classList.remove('btn-added');
      }, 1800);
      return;
    }

    const rm = e.target.closest('[data-remove]');
    if (rm) cart.remove(rm.dataset.remove);
  });

  // Один обработчик на всё: сначала верхний слой, потом нижний
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('spread')?.classList.contains('is-open')) {
      closeSpread();
    } else {
      setCartOpen(false);
      document.querySelector('.menu')?.classList.remove('is-open');
      document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
    }
  });
}

// ==========================================================================
// 9. ЗАПУСК
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadParts();
  initNav();

  renderCatalog('all');
  initFilters('#catalogFilters .tab-btn', renderCatalog);

  renderShop('all');
  initFilters('#shopFilters .tab-btn', renderShop);

  initCart();
  initDelegation();
  initScrollSpy();
});
