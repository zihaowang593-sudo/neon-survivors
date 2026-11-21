/* HD shop artwork integration. Existing save, prices, purchase and loot logic remain in the parent game. */
(function(){
'use strict';
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
   body.innerHTML='<iframe id="hdShopFrame" title="高清商店" src="./shop-hd-art.html?v=1812" loading="eager"></iframe>';
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
