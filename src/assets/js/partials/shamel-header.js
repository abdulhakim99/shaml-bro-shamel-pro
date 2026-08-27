/**
 * Initializes the Shamel Pro header controls after the page is ready.
 */
export function initShamelHeader() {
var searchWrap = document.querySelector('[data-shamel-header-search]');
var searchShell = searchWrap ? searchWrap.closest('.shamel-pro-header-shell') : null;
if (searchWrap) {
  var searchButton = searchWrap.querySelector('[data-shamel-header-search-button]');
  var searchComponent = searchWrap.querySelector('salla-search');
  function focusHeaderSearch() {
    if (!searchComponent) return;
    if (searchComponent.shadowRoot) {
      var field = searchComponent.shadowRoot.querySelector('input');
      if (field) field.focus();
    }
  }
  function setHeaderSearch(open) {
    searchWrap.classList.toggle('is-open', open);
    if (searchShell) searchShell.classList.toggle('is-search-open', open);
    if (searchButton) {
      searchButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      searchButton.setAttribute('aria-label', open ? 'إغلاق البحث' : 'فتح البحث');
    }
    if (open) {
      window.setTimeout(focusHeaderSearch, 80);
      window.setTimeout(focusHeaderSearch, 240);
    }
  }
  if (searchButton) {
    searchButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setHeaderSearch(!searchWrap.classList.contains('is-open'));
    });
  }
  var panel = searchWrap.querySelector('.shamel-header-search-panel');
  if (panel) panel.addEventListener('click', function (event) { event.stopPropagation(); });
  document.addEventListener('click', function (event) {
    if (!searchWrap.contains(event.target)) setHeaderSearch(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setHeaderSearch(false);
  });
}

document.querySelectorAll('[data-shamel-drawer-group-toggle]').forEach(function (toggle) {
  toggle.addEventListener('click', function () {
    var group = toggle.closest('[data-shamel-drawer-group]');
    var opening = !group.classList.contains('is-open');
    group.classList.toggle('is-open', opening);
    toggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
    var mark = toggle.querySelector('b');
    if (mark) mark.textContent = opening ? '−' : '+';
  });
});

var drawer = document.querySelector('[data-shamel-categories-drawer]');
var overlay = document.querySelector('[data-shamel-categories-overlay]');
var openButton = document.querySelector('[data-shamel-categories-open]');
var closeButton = document.querySelector('[data-shamel-categories-close]');
var lastFocusedElement = null;
if (!drawer || !overlay || !openButton) return;

function getDrawerFocusableElements() {
  return Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), summary, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
}
function openCategories() {
  lastFocusedElement = document.activeElement;
  overlay.hidden = false;
  drawer.classList.add('is-open');
  window.requestAnimationFrame(function () {
    overlay.classList.add('is-open');
  });
  drawer.setAttribute('aria-hidden', 'false');
  openButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('shamel-categories-locked');
  window.setTimeout(function () { (closeButton || drawer).focus(); }, 0);
}
function closeCategories() {
  if (!drawer.classList.contains('is-open')) return;
  overlay.classList.remove('is-open');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  openButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('shamel-categories-locked');
  window.setTimeout(function () { overlay.hidden = true; }, 260);
  (lastFocusedElement && typeof lastFocusedElement.focus === 'function' ? lastFocusedElement : openButton).focus();
}
openButton.addEventListener('click', openCategories);
if (closeButton) closeButton.addEventListener('click', closeCategories);
overlay.addEventListener('click', closeCategories);
document.addEventListener('keydown', function (event) {
  if (!drawer.classList.contains('is-open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCategories();
    return;
  }
  if (event.key !== 'Tab') return;
  var focusable = getDrawerFocusableElements();
  if (!focusable.length) {
    event.preventDefault();
    drawer.focus();
    return;
  }
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
drawer.addEventListener('click', function (event) {
  if (event.target.closest('a')) closeCategories();
});
}
