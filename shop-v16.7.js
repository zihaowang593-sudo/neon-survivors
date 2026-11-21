/* V16.7: reference-directed full shop artwork pass. No source-game art is embedded.
 * Preserves the V16.4 purchase/guarantee/save rules; upgrades presentation only.
 */
(function(){
'use strict';
const SVG_NS='http://www.w3.org/2000/svg';
let counter=0;
const C='#242036';
function svg(kind,extra=''){
 const uid='v167'+(counter++);
 const g=(name,a,b)=>`<linearGradient id="${uid}-${name}" x1="0" y1="0" x2=".15" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
 const paint=(name)=>`url(#${uid}-${name})`;
 const outline='stroke="#271e34" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
 const p=(d,fill,stroke)=>`<path d="${d}" fill="${fill}" ${stroke===false?'':outline}/>`;
 const rect=(x,y,w,h,fill,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${outline}/>`;
 const ell=(x,y,rx,ry,fill)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${outline}/>`;
 const gem=`${p('M25 50 43 25 102 25 119 50 73 120Z',paint('a'))}${p('M26 50H118L73 118Z',paint('b'))}${p('M44 27 55 51 73 116 91 51 102 27Z','#8efc85')}${p('M26 50H118L101 28H43Z','#adff84')}${p('M55 51 73 116 92 51Z','#12a52d')}${p('M44 28 55 51H92L101 28Z','#d2ffac')}`;
 const coin=`${ell(72,74,49,49,'#a45a0b')}${ell(69,68,47,46,paint('gold'))}${ell(69,66,35,35,'#ffbb16')}${ell(69,65,29,29,'#fddd49')}${p('M67 40v50m18-39H61q-14 2-7 13 5 6 23 5 18 2 6 16H51','none')}`;
 const scroll=`${rect(34,27,78,91,'#a77440',6)}${rect(42,35,62,73,'#e3bd81',3)}${p('M38 30q-17-13-20 4 1 12 20 12h77q18-7 6-17z','#bb7b43')}${p('M39 110q-16-10-20 3-1 12 18 12h66q16-9-1-17z','#b8733e')}<path d="M55 61h34M55 73h34M55 85h23" stroke="#aa8058" stroke-width="6" stroke-linecap="round"/>`;
 const glove=`${p('M39 121 21 94 15 75q-6-16 7-22 10-3 20 17l-4-35q-1-15 12-16 11-1 12 14v19l2-30q0-14 11-14 12 0 12 14v27l2-21q3-13 14-10 11 3 9 16l-5 24 8-13q11-13 20-4 8 9-1 23l-21 39-22 14Z',paint('coral'))}${p('M38 92q19 5 31 25l16-4 20-24','none')}<path d="M61 34v30M87 29l-2 34M108 48l-9 22" stroke="#ffbb83" stroke-width="6" stroke-linecap="round"/><path d="m25 75 20 18 15 3" stroke="#cc5742" stroke-width="4" fill="none"/>`;
 const belt=`${p('M20 42h106v54H20Z','#bb853e')}${p('M20 43h106v21H20Z','#e6c285')}${rect(53,43,42,44,'#7e5433',3)}${rect(62,50,24,30,'#ffeab4',1)}${p('M67 57h15v15H67Z','#a8744e')}`;
 const part=`${rect(24,19,96,107,'#29253c',6)}${rect(32,27,80,93,paint('lime'),3)}${rect(43,56,58,55,'#572a95',3)}${rect(51,64,43,40,'#f0f0ee',3)}${ell(72,84,17,17,'#363957')}${ell(72,84,7,7,'#9ae3ff')}${p('M48 34h50v15H48Z','#d3ffa2')}${p('M66 38v6h18','none')}`;
 const tech=`${p('M9 50 38 19h83l21 30v72H10Z',paint('gold'))}${p('M10 50h130v70H10Z','#ffaf19')}${p('M12 51h128v29H12Z','#edf6fa')}${p('M38 19h83l18 32H12Z','#f8ffff')}${p('M13 81h127v39H13Z','#e48010')}${rect(43,63,65,65,'#343949',10)}${p('M76 60 109 79v31l-33 21-32-21V79Z','#e3eef5')}${p('M76 67 101 82v24l-25 16-25-16V82Z','#ffad19')}${p('M76 79 92 90v17l-16 11-17-11V90Z','#fff7c5')}${p('M76 88 85 93v9l-9 6-10-6v-9Z','#ffbc08')}${p('M18 40 39 19h20L43 50H12Z','#ffffff')}`;
 const collection=`${p('M17 31 34 16h89l14 18-3 90H18Z',paint('violet'))}${p('M18 38h116l-8 20H24Z','#eb51f1')}${rect(23,59,107,66,'#8515b7',5)}${rect(52,52,49,73,'#3d2857',5)}${rect(58,62,38,53,'#a1fff4',5)}${rect(63,69,28,39,'#59c9ba',2)}<path d="M69 79h15M69 91h15M69 103h15" stroke="#fffbc1" stroke-width="5"/>${p('M22 38h111l-10-20H33Z','#d62bd8')}`;
 const supply=`${p('M14 46 37 22h86l18 24-2 81H13Z','#039ee9')}${p('M15 48h123v80H15Z','#1274cf')}${p('M15 47 36 22h88l14 25Z','#f1f9ff')}${p('M18 52h117v29H18Z','#c3e4f3')}${rect(55,66,44,58,'#2b4777',3)}${rect(65,74,25,39,'#4aeee9',2)}<path d="M71 85h14M71 97h14" stroke="#ffffff" stroke-width="5"/>${p('M16 90h38v36H16Z','#1783e8')}${p('M101 90h36v37h-36Z','#0075c4')}`;
 const premium=`${p('M15 42 42 19h82l18 24-5 82H13Z','#fead10')}${p('M16 45h123v78H16Z',paint('violet'))}${p('M17 44 41 19h83l17 25Z','#ffeb64')}${rect(19,52,117,22,'#ffc626',1)}${p('M21 76h111v47H21Z','#8b16b7')}${p('M83 51h21v73H83Z','#ffd630')}${rect(79,83,34,41,'#4c175d',3)}${rect(88,89,17,29,'#fbd240',2)}`;
 const sgear=`${p('M26 100 30 45 75 17 121 46 126 101 77 130Z','#353d5a')}${p('M36 95 40 54 75 28 111 53 115 94 76 118Z','#d8def7')}${p('M43 89 47 57 75 37 105 58 107 89 76 108Z','#53468e')}${p('M65 47 86 47 98 67 87 91 65 91 55 68Z','#ffe147')}${p('M67 59 83 59 89 69 81 80 67 80 61 69Z','#ff35c1')}${p('M13 21h32v21H13Z','#12a8ff')}${p('M105 16h32v24h-32Z','#ffbf17')}${p('M9 105h35v24H9Z','#ed2797')}${p('M108 101h32v23h-32Z','#51d2ff')}`;
 const gift=`${rect(20,52,114,78,paint('violet'),3)}${p('M14 48h126v28H14Z','#e056fb')}${p('M72 47h22v83H72Z','#ffe673')}${p('M78 49Q24 37 33 17q10-20 47 29Q112-7 128 15q12 19-50 34Z','none')}`;
 const shop=`${rect(15,65,112,65,'#3d465a')}${rect(26,81,40,47,'#72d551')}${rect(79,81,30,49,'#93e8fb')}${p('M12 60 28 20h85l20 40-7 22H19Z','#f8d15f')}${p('M14 60h116v22H14Z','#eb8543')}<path d="M30 24v58M56 24v58M82 24v58M109 24v58" stroke="#fff6e1" stroke-width="15" stroke-linecap="butt"/>`;
 const navShield=`${p('M72 13 124 34l-6 62-46 40-46-40-6-62Z','#292b48')}${p('M72 22 112 39l-5 49-35 33-34-33-6-49Z','#d9e4f4')}${p('M72 31 104 45 99 81 72 109 44 81 41 45Z','#3874b5')}${p('M72 50 91 59 87 81 72 95 56 81 52 59Z','#e1f2ff')}${p('M72 56 78 68 91 69 81 79 85 93 72 85 58 93 62 79 53 69 66 68Z','#ffe95d')}`;
 const star=`${p('M72 11 91 53l46 7-33 33 7 45-39-22-39 22 7-45L6 60l47-7Z',paint('gold'))}${p('M72 28 84 59l31 4-25 23 5 31-23-15-23 15 5-31-25-23 32-4Z','#ffe77c')}`;
 const planet=`${ell(76,80,46,43,'#4bb9f3')}${p('M42 61 66 41 88 56l-9 22-28 11-16-14Z','#f177ad')}${p('M80 80 116 56 122 87l-17 22-26-7Z','#db4d9e')}<path d="M9 103Q70 17 143 69" stroke="#ffe754" stroke-width="14" fill="none" stroke-linecap="round"/>${p('M113 16 118 26 130 30 119 36 114 49 108 35 98 30 109 26Z','#ffe56a')}`;
 const home=`${p('M13 67 75 12 137 67l-11 16-16-14v59H39V69L23 84Z','#2197e6')}${p('M40 66 75 35 112 66v61H40Z','#f3f2e7')}${rect(65,83,27,44,'#ed6269',2)}${rect(44,75,16,23,'#3cb7fc',1)}${rect(100,75,14,22,'#68d4fc',1)}`;
 const key=`${ell(53,51,20,20,'#ffc019')}${ell(53,51,7,7,'#fff3b0')}${p('M65 66 116 111 100 128 87 116 77 126 65 114 76 102 54 82Z','#ffcf21')}`;
 const face=`${p('M23 39 39 17 75 9 118 34 124 93 105 121 49 130 19 92Z','#ec5d1f')}${p('M35 54 73 40 110 55 109 94 89 114 58 114 34 93Z','#ffe1b1')}${p('M24 58 28 35 51 27 63 44 87 29 118 50 94 50 83 40 61 58 42 47Z','#ef4617')}<path d="M55 80h13m22 0h12" stroke="#2f2232" stroke-width="7" stroke-linecap="round"/><path d="M70 101q13 9 25 0" stroke="#bb6260" fill="none" stroke-width="4"/>`;
 const energy=`${p('M83 5 29 79H72L57 141 127 58H85L106 5Z',paint('gold'))}${p('M83 14 46 71h38l-14 49 44-54H75l21-52Z','#fff78f')}`;
 const plus=`${p('M59 14h27v40h39v27H86v39H59V81H20V54h39Z','#9cf533')}`;
 const common={diamond:gem,coin,energy,scroll,glove,belt,part,tech,collection,sgear,supply,premium,gift,shop,battle:star,planet,home,key,face,plus};
 const art=common[kind]||gem;
 return `<svg class="v167-icon ${extra}" viewBox="0 0 150 150" xmlns="${SVG_NS}" focusable="false" aria-hidden="true"><defs>${g('a','#74ff48','#00933b')}${g('b','#26d840','#006b59')}${g('gold','#fffaa7','#ff9800')}${g('coral','#ffd18e','#df513d')}${g('lime','#c2ff49','#43a91b')}${g('violet','#fd70ff','#7820ba')}</defs><g>${art}</g></svg>`;
}
function attach(root){
 if(!root||!root.classList.contains('shop-immersive'))return;
 const body=root.querySelector('.recorded-shop');if(!body)return;
 const items=['diamond','scroll','glove','belt','part','glove'];
 body.querySelectorAll('.recorded-shop-card').forEach((el,i)=>{
  const art=el.querySelector('.v165-emblem');
  if(art&&!art.dataset.v167){art.dataset.v167='1';art.innerHTML=svg(items[i]||'diamond');}
 });
 body.querySelectorAll('.recorded-offer').forEach((el,i)=>{
  const icons=['tech','collection','sgear'];const art=el.querySelector('.offer-art');
  if(art&&!art.dataset.v167){art.dataset.v167='1';art.innerHTML=svg(icons[i]||'tech');}
 });
 body.querySelectorAll('.shop-feature').forEach((el,i)=>{
  const art=el.querySelector('.v165-supply-art');
  if(art&&!art.dataset.v167){art.dataset.v167='1';art.innerHTML=svg(i===0?'supply':'premium');}
  if(!el.querySelector('.v167-corner-info')){
   const info=document.createElement('span');info.className='v167-corner-info';info.textContent='i';info.setAttribute('aria-hidden','true');el.appendChild(info);
  }
 });
 body.querySelectorAll('.gem-pack').forEach((el)=>{
  const old=el.querySelector('.v165-icon');
  if(old&&!el.querySelector('.v167-icon'))old.outerHTML=svg('diamond');
 });
 root.querySelectorAll('.v165-res').forEach((el,i)=>{
  const old=el.querySelector('.v165-icon');if(old&&!el.querySelector('.v167-icon'))old.outerHTML=svg(['energy','diamond','coin'][i]);
 });
 const avatar=root.querySelector('.v165-avatar');if(avatar&&!avatar.querySelector('.v167-icon'))avatar.innerHTML=svg('face');
 root.querySelectorAll('.v165-nav-icon').forEach((el,i)=>{
  if(!el.querySelector('.v167-icon'))el.innerHTML=svg(['shop','sgear','battle','planet','home'][i]);
 });
 root.querySelectorAll('.shop-buy').forEach(el=>{const old=el.querySelector('.v165-icon');if(old&&!el.querySelector('.v167-icon'))old.outerHTML=svg(el.closest('.shop-free')?'diamond':el.closest('[data-shop-index="1"], [data-shop-index="3"]')?'coin':'diamond');});
 root.querySelectorAll('.offer-foot span:first-child').forEach(el=>{const old=el.querySelector('.v165-icon');if(old&&!el.querySelector('.v167-icon'))old.outerHTML=svg('key');});
 root.querySelectorAll('.v165-supply-actions button').forEach(el=>{const old=el.querySelector('.v165-icon');if(old&&!el.querySelector('.v167-icon'))old.outerHTML=svg('key');});
 const title=body.querySelector('.shop-ribbon');if(title)title.dataset.visualVersion='16.7';
}
const originalShow=window.showPanel;
if(typeof originalShow==='function')window.showPanel=function(which,...args){const value=originalShow.apply(this,[which,...args]);if(which==='shop')attach(document.getElementById('subpage'));return value};
// Re-rendering may replace only the interior markup; the observer repairs missing art.
const root=document.getElementById('subpage');
if(root){let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;attach(root)})});observer.observe(root,{subtree:true,childList:true});attach(root);}
window.shopV167={version:'16.7',repaint:()=>attach(document.getElementById('subpage'))};
})();