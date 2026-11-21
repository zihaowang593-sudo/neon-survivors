/* HD shop artwork integration. Existing save, prices, purchase and loot logic remain in the parent game. */
(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`#subpage.hd-shop-integrated{background:#262b3e}#subpage.hd-shop-integrated .subpage-top,#subpage.hd-shop-integrated .subpage-bottom{display:none!important}#subpage.hd-shop-integrated #subpageBody{padding:0!important;margin:0!important;overflow:hidden!important;height:100%!important;max-height:none!important;display:block!important;background:#731485!important}#hdShopFrame{display:block;border:0;width:100%;height:100%;min-height:100%;background:#731485}`;
document.head.appendChild(css);
const original=window.showPanel;
if(typeof original!=='function')return;
function show(which){
 const result=original(which);
 const page=document.getElementById('subpage');
 if(!page)return result;
 page.classList.toggle('hd-shop-integrated',which==='shop');
 if(which==='shop'){
  const body=document.getElementById('subpageBody');
  if(body&&!body.querySelector('#hdShopFrame')){
   body.innerHTML='<iframe id="hdShopFrame" title="高清商店" src="./shop-hd-art.html?v=1817" loading="eager"></iframe>';
  }
 }
 return result;
}
window.showPanel=show;
window.addEventListener('message',function(event){
 if(event.origin!==location.origin||event.data?.source!=='hd-shop')return;
 const d=event.data;
 if(d.kind==='daily'&&Number.isInteger(d.index)&&d.index>=0&&d.index<6){
  window.shopV164?.dailyInfo(d.index);
 }else if(d.kind==='chest'){
  const map={tech:'tech',collection:'collection',sgear:'sGear'};
  if(map[d.type])window.shopV164?.chest(map[d.type]);
 }else if(d.kind==='tab'){
  if(d.tab==='battle')window.showHome();
  else if(['armory','challenges','guild'].includes(d.tab))window.showPanel(d.tab);
 }
});
})();
