import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Twilight configuration remains valid JSON', () => {
  assert.doesNotThrow(() => JSON.parse(read('twilight.json')));
});

test('Shamel runtime settings are emitted as JavaScript booleans', () => {
  const master = read('src/views/layouts/master.twig');
  for (const setting of ['header_is_sticky', 'imageZoom', 'enable_more_menu', 'enable_add_product_toast', 'notify_when_available_in_card']) {
    assert.match(master, new RegExp(`window\\.${setting} = \\{\\{ theme\\.settings\\.get\\('${setting}'[^\\n]+\\? 'true' : 'false' \\}\\}`));
  }
});

test('mobile category drawer remains independent from inherited mmenu', () => {
  const app = read('src/assets/js/app.js');
  const header = read('src/views/components/header/header.twig');
  assert.match(app, /document\.body\.classList\.contains\('shamel-pro'\)/);
  assert.match(header, /data-shamel-categories-drawer/);
  assert.doesNotMatch(header, /custom-main-menu/);
});

test('cart quantity watcher binds hydrated inputs and uses the known cart item id', () => {
  const source = read('src/assets/js/partials/validate-product-options.js');
  const watcher = source.slice(source.indexOf('function observeQuantityChanges'), source.indexOf('/**\n * Handles cart update failures'));
  assert.match(watcher, /const bindQuantityInput = \(\) =>/);
  assert.match(watcher, /if \(bindQuantityInput\(\)\) return;/);
  assert.match(watcher, /appendLoadingOverlay\(itemId\)/);
  assert.doesNotMatch(watcher, /appendLoadingOverlay\(e\.detail\?\.productId\)/);
});

test('home components expose correct category alt text and local display-all control', () => {
  const links = read('src/views/components/home/main-links.twig');
  const brands = read('src/views/components/home/brands.twig');
  const config = read('twilight.json');
  assert.match(links, /alt="\{\{ cat\.name \}\}"/);
  assert.doesNotMatch(links, /alt="\{\{ menu\.title \}\}"/);
  assert.match(links, /\{% if link\.title and link\.url %\}/);
  assert.match(config, /"id": "links"[\s\S]*?"required": false,[\s\S]*?"minLength": 0,[\s\S]*?"value": \[\]/);
  assert.match(config, /"id": "links\.title"[\s\S]*?"required": true/);
  assert.match(config, /"id": "links\.url"[\s\S]*?"required": true/);
  assert.match(brands, /component\.show_all\|default\(true\)/);
  assert.match(config, /"id": "show_all"/);
});

test('Discovery icons remain decorative while category names label their links', () => {
  const links = read('src/views/components/home/main-links.twig');
  assert.match(links, /<i class="\{\{ cat\.icon \}\}" aria-hidden="true"><\/i>/);
  assert.match(links, /<i class="\{\{ link\.icon \}\}" aria-hidden="true"><\/i>/);
});

test('Product cards escape product names before inserting accessible HTML', () => {
  const productCard = read('src/assets/js/partials/product-card.js');
  assert.match(productCard, /const productName = this\.escapeHTML\(this\.product\?\.name \|\| ''\);/);
  assert.match(productCard, /aria-label="\$\{productName\}" class="s-product-card-overlay"/);
  assert.match(productCard, /<a href="\$\{productUrl\}" aria-label="\$\{this\.escapeHTML\(this\.product\?\.image\?\.alt \|\| productName\)\}">/);
  assert.match(productCard, /<a href="\$\{productUrl\}">\$\{productName\}<\/a>/);
  assert.doesNotMatch(productCard, /aria-label=\$\{this\.product\.name\}/);
  assert.doesNotMatch(productCard, /<a href="\$\{this\.product\?\.url\}"\>\$\{this\.product\?\.name\}</);
});

test('optional menu initialisation cannot poll or multiply close handlers indefinitely', () => {
  const app = read('src/assets/js/app.js');
  assert.match(app, /menuDirAttempts >= 50/);
  assert.match(app, /isElementLoaded\(selector, timeout = 5000\)/);
  assert.match(app, /Install one document-level close handler/);
});

test('Shamel header and shell payloads are compiled through the theme pipeline', () => {
  const app = read('src/assets/js/app.js');
  const styles = read('src/assets/styles/app.scss');
  const header = read('src/views/components/header/header.twig');
  const master = read('src/views/layouts/master.twig');
  const shell = read('src/assets/js/partials/shamel-shell.js');
  assert.match(app, /initShamelHeader/);
  assert.match(app, /initShamelShell/);
  assert.match(styles, /04-components\/shamel-header/);
  assert.match(styles, /04-components\/shamel-shell/);
  assert.match(shell, /function createDialogController/);
  assert.match(shell, /event\.key === 'Escape'/);
  assert.match(shell, /window\.setTimeout\(\(\) => \(focusableElements\(\)\[0\] \|\| dialog\)\.focus\(\), 0\)/);
  assert.match(master, /data-shamel-newsletter-drawer[^>]+tabindex="-1"/);
  assert.doesNotMatch(header, /<style>|<script>/);
  assert.equal((master.match(/<style>/g) || []).length, 1);
});

test('Store Identity exposes the six supported identities and bounded merchant overrides', () => {
  const config = JSON.parse(read('twilight.json'));
  const settings = Object.fromEntries(config.settings.filter((setting) => setting.id).map((setting) => [setting.id, setting]));
  const identity = settings.shamel_store_identity;
  assert.ok(identity);
  assert.deepEqual(identity.options.map((option) => option.value), ['general', 'digital', 'perfume', 'fashion', 'electronics', 'gaming']);
  assert.deepEqual(settings.shamel_surface_mode.options.map((option) => option.value), ['light', 'dark', 'system']);
  assert.deepEqual(settings.shamel_identity_header_density.options.map((option) => option.value), ['compact', 'standard']);
  assert.deepEqual(settings.shamel_product_card_detail.options.map((option) => option.value), ['minimal', 'standard', 'rich']);
  assert.deepEqual(settings.shamel_discovery_style.options.map((option) => option.value), ['auto', 'tiles', 'chips', 'mosaic', 'specs', 'platform']);
});

test('Store Identity runtime emits tokens without replacing Twilight or Salla contracts', () => {
  const master = read('src/views/layouts/master.twig');
  const shell = read('src/assets/js/partials/shamel-shell.js');
  const styles = read('src/assets/styles/04-components/shamel-identity.scss');
  const appStyles = read('src/assets/styles/app.scss');
  assert.match(master, /data-shamel-identity="\{\{ shamel_store_identity \}\}"/);
  assert.match(master, /data-shamel-surface-mode="\{\{ shamel_surface_mode \}\}"/);
  assert.match(master, /shamel-card-detail-\{\{ shamel_product_card_detail \}\}/);
  assert.match(master, /shamel-discovery-\{\{ shamel_discovery_style \}\}/);
  assert.match(shell, /const surfaceMode = document\.body\.dataset\.shamelSurfaceMode/);
  assert.match(shell, /const isGamingIdentity = document\.body\.dataset\.shamelIdentity === 'gaming'/);
  assert.match(shell, /const defaultDark = surfaceMode === 'dark'/);
  for (const name of ['general', 'digital', 'perfume', 'fashion', 'electronics', 'gaming']) assert.match(styles, new RegExp(`shamel-identity-${name}`));
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(appStyles, /04-components\/shamel-identity/);
  assert.doesNotMatch(styles, /cart\.addItem|cart\.deleteItem|checkout/);
});

test('Store Identity variants remain reusable and data-first across shared Twilight components', () => {
  const header = read('src/views/components/header/header.twig');
  const hero = read('src/views/components/home/enhanced-slider.twig');
  const discovery = read('src/views/components/home/main-links.twig');
  const product = read('src/views/pages/product/single.twig');
  const productOptions = read('src/views/pages/partials/product/options.twig');
  const footer = read('src/views/components/footer/footer.twig');
  const styles = read('src/assets/styles/04-components/shamel-identity.scss');
  assert.match(header, /data-shamel-header-variant/);
  assert.match(hero, /data-shamel-hero-variant/);
  assert.match(discovery, /data-shamel-discovery-variant/);
  assert.match(product, /data-shamel-product-variant/);
  assert.match(footer, /data-shamel-footer-variant/);
  for (const variant of ['compact', 'sensory', 'editorial', 'specs', 'gaming']) assert.match(styles, new RegExp(`shamel-header-variant--${variant}`));
  for (const variant of ['platform', 'campaign', 'editorial', 'collection']) assert.match(styles, new RegExp(`shamel-hero--${variant}`));
  for (const variant of ['digital-oriented', 'scent-oriented', 'fashion-oriented', 'specs-oriented', 'gaming-oriented']) assert.match(styles, new RegExp(`shamel-product--${variant}`));
  assert.match(product, /include 'pages\.partials\.product\.options'/);
  assert.match(productOptions, /salla-product-options/);
  assert.match(product, /salla-add-product-button/);
  assert.doesNotMatch(styles, /delivery promise|warranty|original product/i);
});


test('Marketplace polish keeps hero content data-first and preserves accessible presentation overrides', () => {
  const hero = read('src/views/components/home/enhanced-slider.twig');
  const styles = read('src/assets/styles/04-components/shamel-identity.scss');
  assert.match(hero, /\{% if slide\.title or slide\.description %\}/);
  assert.match(hero, /\{% if slide\.title %\}/);
  assert.match(hero, /\{% if slide\.description %\}/);
  assert.match(hero, /<div aria-hidden="true" style="background-image: url\(\{\{ slide\.image \}\}\);/);
  assert.match(styles, /shamel-discovery-platform/);
  assert.match(styles, /\.banner-entry:focus-within/);
  assert.match(styles, /\.s-block--hero-slider \[data-swiper-parallax\]/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(hero, /delivery promise|warranty|original product/i);
});

test('Header search mirrors outward in RTL without changing mobile search layout', () => {
  const headerStyles = read('src/assets/styles/04-components/shamel-header.scss');
  assert.match(headerStyles, /@media\(min-width:641px\)/);
  assert.match(headerStyles, /html\[dir='rtl'\] \.shamel-pro \.shamel-header-search-panel/);
  assert.match(headerStyles, /right:calc\(100% \+ 10px\)!important/);
  assert.match(headerStyles, /transform-origin:right center/);
  assert.match(headerStyles, /@media\(max-width:430px\)/);
  assert.match(headerStyles, /\.shamel-header-search-trigger\.is-open \.shamel-header-search-panel\{width:min\(46vw,185px\)\}/);
});

test('Header search restores focus to its trigger after Escape dismissal', () => {
  const headerScript = read('src/assets/js/partials/shamel-header.js');
  assert.match(headerScript, /function setHeaderSearch\(open, restoreFocus\)/);
  assert.match(headerScript, /if \(!open && restoreFocus && searchButton\) searchButton\.focus\(\);/);
  assert.match(headerScript, /if \(event\.key === 'Escape'\) setHeaderSearch\(false, true\);/);
});

test('Newsletter close control respects RTL placement and touch target sizing', () => {
  const shellStyles = read('src/assets/styles/04-components/shamel-shell.scss');
  assert.match(shellStyles, /\.shamel-newsletter-drawer__close\{[^}]*inset-inline-start:\.75rem/);
  assert.match(shellStyles, /\.shamel-newsletter-drawer__close\{[^}]*width:2\.75rem;height:2\.75rem/);
  assert.doesNotMatch(shellStyles, /\.shamel-newsletter-drawer__close\{[^}]*left:/);
});

test('Product gallery falls back to the product name when image alt text is unavailable', () => {
  const product = read('src/views/pages/product/single.twig');
  assert.match(product, /\{% set image_alt = image\.alt\|default\(product\.name\) %\}/);
  assert.match(product, /alt="\{\{ image_alt \}\}"/);
  assert.match(product, /aria-label="\{\{ image_alt \}\}"/);
  assert.doesNotMatch(product, /alt="\{\{ image\.alt \}\}"/);
});

test('YouTube block requires a merchant video identifier', () => {
  const youtube = read('src/views/components/home/youtube.twig');
  assert.match(youtube, /\{% if youtube_id %\}/);
  assert.match(youtube, /<lite-youtube videoid="\{\{ youtube_id \}\}"/);
});

test('Store features render only populated Salla feature entries', () => {
  const features = read('src/views/components/home/store-features.twig');
  assert.match(features, /\{% if items\|length %\}/);
  assert.match(features, /\{% if item\.title or item\.text %\}/);
  assert.match(features, /\{% if item\.icon %\}/);
  assert.match(features, /aria-hidden="true"/);
});

test('Standard home photo components guard images, links, and loading behavior', () => {
  const slider = read('src/views/components/home/photos-slider.twig');
  const squares = read('src/views/components/home/square-photos.twig');
  assert.match(slider, /\{% if items\|length %\}/);
  assert.match(slider, /\{% if item\.image\.url %\}/);
  assert.match(slider, /\{% if item\.url %\}/);
  assert.match(slider, /loading="\{\{ loop\.first \? 'eager' : 'lazy' \}\}"/);
  assert.doesNotMatch(slider, /\{\{store\.name\}\} image-slider/);
  assert.match(squares, /\{% if items\|length %\}/);
  assert.match(squares, /\{% if item\.image\.url %\}/);
  assert.match(squares, /\{% if item\.url %\}/);
  assert.match(squares, /aria-hidden="true"/);
});

test('Parallax banner requires a merchant image before it renders', () => {
  const banner = read('src/views/components/home/parallax-background.twig');
  assert.match(banner, /\{% if image\.url %\}/);
  assert.match(banner, /\{% if url and link_text %\}/);
});

test('Fixed banners stay accessible with incomplete merchant data', () => {
  const banner = read('src/views/components/home/fixed-banner.twig');
  assert.match(banner, /\{% if image\.url %\}/);
  assert.match(banner, /\{% if url %\}/);
  assert.match(banner, /alt="\{\{ alt_text \}\}"/);
  assert.match(banner, /aria-label="\{\{ banner_label\|e\('html_attr'\) \}\}"/);
  assert.doesNotMatch(banner, /alt_text = image\.alt\|trim \? image\.alt : 'fixed banner'/);
});

test('Enhanced square banners remain data-first and accessible with partial merchant data', () => {
  const banners = read('src/views/components/home/enhanced-square-banners.twig');
  assert.match(banners, /\{% set banner_has_text = banner\.title or banner\.description %\}/);
  assert.match(banners, /\{% if banner\.url %\}/);
  assert.match(banners, /\{% if banner_has_text %\}/);
  assert.match(banners, /banner_has_text \? ' role="group"' : ' aria-hidden="true"'/);
  assert.doesNotMatch(banners, /<h3[^>]*>\{\{banner\.title\}\}<\/h3>/);
});

test('Seeded home components require merchant content before they render', () => {
  const config = JSON.parse(read('twilight.json'));
  const byPath = Object.fromEntries(config.components.map((component) => [component.path, component]));
  const field = (component, id) => component.fields.find((item) => item.id === id);
  const hero = byPath['home.enhanced-slider'];
  const banners = byPath['home.enhanced-square-banners'];
  const testimonials = byPath['home.custom-testimonials'];
  const brands = byPath['home.brands'];
  const discovery = byPath['home.main-links'];
  assert.equal(hero.is_default, false);
  assert.deepEqual(field(hero, 'slides').value, []);
  assert.equal(field(hero, 'slides').minLength, 0);
  assert.equal(banners.is_default, false);
  assert.deepEqual(field(banners, 'banners').value, []);
  assert.equal(field(banners, 'banners').minLength, 0);
  assert.equal(testimonials.is_default, false);
  assert.deepEqual(field(testimonials, 'items').value, []);
  assert.equal(field(testimonials, 'items').minLength, 0);
  assert.equal(field(testimonials, 'items').fields.find((item) => item.id === 'items.name').required, true);
  assert.equal(field(testimonials, 'items').fields.find((item) => item.id === 'items.text').required, true);
  assert.equal(field(brands, 'title').value, null);
  assert.equal(discovery.is_default, false);
  assert.match(read('src/views/components/home/enhanced-slider.twig'), /\{% if component\.slides\|length %\}/);
  assert.match(read('src/views/components/home/enhanced-square-banners.twig'), /\{% if component\.banners\|length %\}/);
  assert.match(read('src/views/components/home/custom-testimonials.twig'), /\{% if component\.items\|length %\}/);
  assert.match(read('src/views/components/home/brands.twig'), /\{% if component\.brands\|length %\}/);
  assert.match(read('src/views/components/home/main-links.twig'), /\{% if shamel_discovery_has_items %\}/);
});

test('Marketplace shell stays data-first and honours the merchant motion setting', () => {
  const product = read('src/views/pages/product/single.twig');
  const master = read('src/views/layouts/master.twig');
  const shellStyles = read('src/assets/styles/04-components/shamel-shell.scss');
  const presentationStyles = read('src/assets/styles/04-components/shamel-pro.scss');
  const config = JSON.parse(read('twilight.json'));
  const settings = Object.fromEntries(config.settings.filter((setting) => setting.id).map((setting) => [setting.id, setting]));
  assert.match(product, /shamel_product_trust_enabled[^\n]+shamel_product_trust_one[^\n]+shamel_product_trust_two[^\n]+shamel_product_trust_three/);
  for (const setting of ['shamel_product_trust_one', 'shamel_product_trust_two', 'shamel_product_trust_three', 'shamel_announcement_text', 'shamel_popup_eyebrow', 'shamel_popup_title', 'shamel_popup_description', 'shamel_popup_button', 'shamel_follow_title', 'shamel_follow_description']) assert.equal(settings[setting].value, '');
  assert.match(master, /shamel_follow_has_links/);
  assert.match(master, /shamel_contact_has_links/);
  assert.match(master, /\{% if shamel_contact_has_links %\}/);
  assert.match(master, /\{% set shamel_newsletter_action_url = theme\.settings\.get\('shamel_popup_action_url'\) %\}/);
  assert.match(master, /shamel_side_tools_enabled', true\) and theme\.settings\.get\('shamel_side_newsletter_enabled', true\) and shamel_newsletter_action_url/);
  assert.match(master, /data-shamel-newsletter-form action="\{\{ shamel_newsletter_action_url \}\}" method="post"/);
  assert.match(master, /shamel_popup_enabled'\) and theme\.settings\.get\('shamel_popup_action_url'\) and \(shamel_popup_title or shamel_popup_description\)/);
  assert.match(master, /shamel-popup__card--no-image/);
  assert.match(shellStyles, /\.shamel-popup__card--no-image/);
  assert.doesNotMatch(shellStyles, /content:"منتج رقمي"/);
  assert.match(shellStyles, /\.shamel-pro:not\(\.shamel-motion\) \.shamel-news__track/);
  assert.match(shellStyles, /\.shamel-pro:not\(\.shamel-motion\) \.shamel-contact__link--whatsapp/);
  assert.match(presentationStyles, /&:not\(\.shamel-motion\) \{/);
  assert.match(presentationStyles, /\.s-product-card-entry:hover,/);
  assert.match(presentationStyles, /transition: none !important/);
});
