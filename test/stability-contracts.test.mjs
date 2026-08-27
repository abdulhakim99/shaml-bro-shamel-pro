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
  assert.match(brands, /component\.show_all\|default\(true\)/);
  assert.match(config, /"id": "show_all"/);
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
