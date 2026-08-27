/**
 * Initializes optional Shamel shell controls only when their markup is present.
 */
export function initShamelShell() {
  initShamelSideTools();
  initShamelMarketingPopup();
}

const dialogFocusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function createDialogController(dialog, onClose = () => {}) {
  if (!dialog) return { open: () => {}, close: () => {} };

  let opener = null;
  const focusableElements = () => Array.from(dialog.querySelectorAll(dialogFocusableSelector));
  const close = ({ restoreFocus = true } = {}) => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    onClose();
    if (restoreFocus && opener?.isConnected && typeof opener.focus === 'function') opener.focus();
  };
  const open = (trigger = document.activeElement) => {
    opener = trigger;
    dialog.hidden = false;
    window.setTimeout(() => (focusableElements()[0] || dialog).focus(), 0);
  };

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return { open, close };
}

function initShamelSideTools() {
  const toolsBar = document.querySelector('[data-shamel-side-tools]');
  const darkButton = document.querySelector('.shamel-header-dark-toggle[data-shamel-dark-toggle]');
  const darkKey = 'shamel_dark_mode';

  function applyDarkMode(enabled) {
    document.body.classList.toggle('shamel-dark-mode', enabled);
    if (!darkButton) return;
    darkButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    darkButton.title = enabled ? 'الوضع الفاتح' : 'الوضع الليلي';
    const label = darkButton.querySelector('[data-shamel-dark-label]');
    if (label) label.textContent = enabled ? 'الوضع الفاتح' : 'الوضع الليلي';
  }

  const savedDark = localStorage.getItem(darkKey);
  let darkEnabled = savedDark === null ? window.matchMedia('(prefers-color-scheme:dark)').matches : savedDark === 'dark';
  applyDarkMode(darkEnabled);
  if (darkButton) darkButton.addEventListener('click', () => {
    darkEnabled = !document.body.classList.contains('shamel-dark-mode');
    localStorage.setItem(darkKey, darkEnabled ? 'dark' : 'light');
    applyDarkMode(darkEnabled);
  });
  if (!toolsBar) return;

  const key = 'shamel_compare_products';
  let items = [];
  try { items = JSON.parse(localStorage.getItem(key) || '[]'); } catch { items = []; }

  const drawer = document.querySelector('[data-shamel-compare-drawer]');
  const compareDialog = createDialogController(drawer);
  const list = document.querySelector('[data-shamel-compare-items]');
  const safe = (value) => {
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
  };
  const cleanPrice = (value) => {
    const raw = String(value || '');
    const decoder = document.createElement('textarea');
    decoder.innerHTML = raw;
    const text = decoder.value
      .replace(/<\/?i\b[^>]*>/gi, ' ')
      .replace(/<?\/?i\b[^<>\n]*>?/gi, ' ')
      .replace(/\bclass\s*=\s*["']?sicon-[\w-]+["']?/gi, ' ')
      .replace(/[<>]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const amounts = text.match(/[0-9٠-٩]+(?:[.,٬٫][0-9٠-٩]+)?/g);
    if (amounts?.length) return `${amounts.join(' / ')}${/ر\.?\s?س|SAR|ريال/i.test(text) ? '' : ' ر.س'}`;
    return text;
  };
  const render = () => {
    document.querySelectorAll('[data-shamel-compare-count]').forEach((element) => { element.textContent = items.length; });
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="shamel-compare-empty">أضف منتجات من بطاقات المتجر لتظهر هنا.</div>';
      return;
    }
    list.innerHTML = items.map((item, index) => `<article class="shamel-compare-item"><button type="button" class="shamel-compare-item__remove" data-remove="${index}" aria-label="إزالة">×</button><a href="${safe(item.url)}"><img src="${safe(item.image)}" alt="${safe(item.name)}"><h3>${safe(item.name)}</h3></a><strong>${safe(cleanPrice(item.price))}</strong></article>`).join('');
    list.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
      items.splice(Number(button.dataset.remove), 1);
      localStorage.setItem(key, JSON.stringify(items));
      render();
    }));
  };

  window.addEventListener('shamel:compare:add', (event) => {
    const product = event.detail;
    if (!product) return;
    const exists = items.findIndex((item) => String(item.id) === String(product.id));
    if (exists >= 0) items.splice(exists, 1);
    else if (items.length < 4) items.push(product);
    else {
      if (window.salla?.notify) salla.notify.warning('يمكن مقارنة 4 منتجات كحد أقصى');
      return;
    }
    localStorage.setItem(key, JSON.stringify(items));
    render();
    if (exists < 0) compareDialog.open();
    if (window.salla?.notify) salla.notify.success(exists >= 0 ? 'تمت إزالة المنتج من المقارنة' : 'تمت إضافة المنتج للمقارنة');
  });
  document.querySelectorAll('[data-shamel-compare-open]').forEach((button) => button.addEventListener('click', () => compareDialog.open(button)));
  document.querySelectorAll('[data-shamel-compare-close]').forEach((button) => button.addEventListener('click', () => compareDialog.close()));

  const newsletterDrawer = document.querySelector('[data-shamel-newsletter-drawer]');
  const newsletterDialog = createDialogController(newsletterDrawer);
  document.querySelectorAll('[data-shamel-newsletter-open]').forEach((button) => button.addEventListener('click', () => newsletterDialog.open(button)));
  document.querySelectorAll('[data-shamel-newsletter-close]').forEach((button) => button.addEventListener('click', () => newsletterDialog.close()));
  const newsletterForm = document.querySelector('[data-shamel-newsletter-form]');
  if (newsletterForm && !newsletterForm.getAttribute('action')) newsletterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (window.salla?.notify) salla.notify.warning('أضف رابط استقبال الاشتراكات من إعدادات الثيم أولًا');
  });

  const close = toolsBar.querySelector('[data-shamel-tools-close]');
  const open = toolsBar.querySelector('[data-shamel-tools-open]');
  if (close) close.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toolsBar.classList.add('is-collapsed');
    toolsBar.setAttribute('aria-expanded', 'false');
  };
  if (open) open.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toolsBar.classList.remove('is-collapsed');
    toolsBar.setAttribute('aria-expanded', 'true');
  };
  render();
}

function initShamelMarketingPopup() {
  const popup = document.getElementById('shamel-marketing-popup');
  if (!popup) return;
  const key = 'shamel_popup_hidden_until';
  const popupDialog = createDialogController(popup, () => localStorage.setItem(key, String(Date.now() + 604800000)));
  const hiddenUntil = Number(localStorage.getItem(key) || 0);
  if (Date.now() < hiddenUntil) return;
  window.setTimeout(() => popupDialog.open(), 1600);
  popup.querySelector('.shamel-popup__close').addEventListener('click', () => popupDialog.close());
  popup.querySelector('form').addEventListener('submit', () => window.setTimeout(() => popupDialog.close(), 250));
}
