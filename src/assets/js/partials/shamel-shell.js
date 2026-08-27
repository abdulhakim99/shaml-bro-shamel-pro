/**
 * Initializes optional Shamel shell controls only when their markup is present.
 */
export function initShamelShell() {
  initShamelSideTools();
  initShamelMarketingPopup();
}

function initShamelSideTools() {
var toolsBar=document.querySelector('[data-shamel-side-tools]');
var darkButton=document.querySelector('.shamel-header-dark-toggle[data-shamel-dark-toggle]');
var darkKey='shamel_dark_mode';
function applyDarkMode(enabled){
  document.body.classList.toggle('shamel-dark-mode',enabled);
  if(darkButton){
    darkButton.setAttribute('aria-pressed',enabled?'true':'false');
    darkButton.title=enabled?'الوضع الفاتح':'الوضع الليلي';
    var label=darkButton.querySelector('[data-shamel-dark-label]');
    if(label)label.textContent=enabled?'الوضع الفاتح':'الوضع الليلي';
  }
}
var savedDark=localStorage.getItem(darkKey);
var darkEnabled=savedDark===null?window.matchMedia('(prefers-color-scheme:dark)').matches:savedDark==='dark';
applyDarkMode(darkEnabled);
if(darkButton)darkButton.addEventListener('click',function(){
  darkEnabled=!document.body.classList.contains('shamel-dark-mode');
  localStorage.setItem(darkKey,darkEnabled?'dark':'light');
  applyDarkMode(darkEnabled);
});
if(!toolsBar)return;
var key='shamel_compare_products',items=[];
try{items=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){items=[]}
var drawer=document.querySelector('[data-shamel-compare-drawer]');
var list=document.querySelector('[data-shamel-compare-items]');
function safe(value){var div=document.createElement('div');div.textContent=value||'';return div.innerHTML}
function cleanPrice(value){
  var raw=String(value||''),decoder=document.createElement('textarea');
  decoder.innerHTML=raw;
  var text=decoder.value
    .replace(/<\/?i\b[^>]*>/gi,' ')
    .replace(/<?\/?i\b[^<>\n]*>?/gi,' ')
    .replace(/\bclass\s*=\s*["']?sicon-[\w-]+["']?/gi,' ')
    .replace(/[<>]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  var amounts=text.match(/[0-9٠-٩]+(?:[.,٬٫][0-9٠-٩]+)?/g);
  if(amounts&&amounts.length){
    return amounts.join(' / ')+(/ر\.?\s?س|SAR|ريال/i.test(text)?'':' ر.س');
  }
  return text;
}
function render(){
  document.querySelectorAll('[data-shamel-compare-count]').forEach(function(el){el.textContent=items.length});
  if(!list)return;
  if(!items.length){list.innerHTML='<div class="shamel-compare-empty">أضف منتجات من بطاقات المتجر لتظهر هنا.</div>';return}
  list.innerHTML=items.map(function(item,index){return '<article class="shamel-compare-item"><button type="button" class="shamel-compare-item__remove" data-remove="'+index+'" aria-label="إزالة">×</button><a href="'+safe(item.url)+'"><img src="'+safe(item.image)+'" alt="'+safe(item.name)+'"><h3>'+safe(item.name)+'</h3></a><strong>'+safe(cleanPrice(item.price))+'</strong></article>'}).join('');
  list.querySelectorAll('[data-remove]').forEach(function(btn){btn.addEventListener('click',function(){items.splice(Number(btn.dataset.remove),1);localStorage.setItem(key,JSON.stringify(items));render()})});
}
window.addEventListener('shamel:compare:add',function(e){
  var product=e.detail;if(!product)return;
  var exists=items.findIndex(function(x){return String(x.id)===String(product.id)});
  if(exists>=0){items.splice(exists,1)}else if(items.length<4){items.push(product)}else{if(window.salla&&salla.notify)salla.notify.warning('يمكن مقارنة 4 منتجات كحد أقصى');return}
  localStorage.setItem(key,JSON.stringify(items));render();
  if(exists<0&&drawer)drawer.hidden=false;
  if(window.salla&&salla.notify)salla.notify.success(exists>=0?'تمت إزالة المنتج من المقارنة':'تمت إضافة المنتج للمقارنة');
});
document.querySelectorAll('[data-shamel-compare-open]').forEach(function(btn){btn.addEventListener('click',function(){if(drawer)drawer.hidden=false})});
document.querySelectorAll('[data-shamel-compare-close]').forEach(function(btn){btn.addEventListener('click',function(){if(drawer)drawer.hidden=true})});
var newsletterDrawer=document.querySelector('[data-shamel-newsletter-drawer]');
document.querySelectorAll('[data-shamel-newsletter-open]').forEach(function(btn){btn.addEventListener('click',function(){if(newsletterDrawer)newsletterDrawer.hidden=false})});
document.querySelectorAll('[data-shamel-newsletter-close]').forEach(function(btn){btn.addEventListener('click',function(){if(newsletterDrawer)newsletterDrawer.hidden=true})});
if(newsletterDrawer)newsletterDrawer.addEventListener('click',function(e){if(e.target===newsletterDrawer)newsletterDrawer.hidden=true});
var newsletterForm=document.querySelector('[data-shamel-newsletter-form]');
if(newsletterForm&&!newsletterForm.getAttribute('action'))newsletterForm.addEventListener('submit',function(e){e.preventDefault();if(window.salla&&salla.notify)salla.notify.warning('أضف رابط استقبال الاشتراكات من إعدادات الثيم أولًا')});
var close=toolsBar.querySelector('[data-shamel-tools-close]');
var open=toolsBar.querySelector('[data-shamel-tools-open]');
if(close)close.onclick=function(e){e.preventDefault();e.stopPropagation();toolsBar.classList.add('is-collapsed');toolsBar.setAttribute('aria-expanded','false')};
if(open)open.onclick=function(e){e.preventDefault();e.stopPropagation();toolsBar.classList.remove('is-collapsed');toolsBar.setAttribute('aria-expanded','true')};
render();
}

function initShamelMarketingPopup() {
  var popup = document.getElementById('shamel-marketing-popup');
  if (!popup) return;
  var key = 'shamel_popup_hidden_until';
  var hiddenUntil = Number(localStorage.getItem(key) || 0);
  if (Date.now() < hiddenUntil) return;
  window.setTimeout(function(){ popup.hidden = false; }, 1600);
  function closePopup(){ popup.hidden = true; localStorage.setItem(key, String(Date.now() + 604800000)); }
  popup.querySelector('.shamel-popup__close').addEventListener('click', closePopup);
  popup.addEventListener('click', function(e){ if(e.target === popup) closePopup(); });
  popup.querySelector('form').addEventListener('submit', function(){ window.setTimeout(closePopup, 250); });
}
