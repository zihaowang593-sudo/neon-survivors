/* V16.7 integrated whole-shop art pass; existing V16.4 economy and save intact. */
(()=>{'use strict';
let seq=0;
const art={
diamond:'<path d="M19 37 36 19h31l18 18-33 45Z" fill="#31d43f"/><path d="M19 37h66L52 82Z" fill="#0b8a57"/><path d="M36 19h31l10 18H26Z" fill="#b4ff91"/><path d="M37 39h30L52 75Z" fill="#72ec77"/>',
coin:'<circle cx="51" cy="51" r="36" fill="#a56716"/><circle cx="49" cy="47" r="33" fill="#ffd737"/><circle cx="49" cy="47" r="25" fill="#ffad16"/><path d="M49 27v40m14-31H41q-11 0-8 9 2 8 19 7 17 0 10 9H36" stroke="#fff8ae" stroke-width="5" fill="none"/>',
energy:'<path d="M51 5 19 52h27L36 93 83 39H56L67 5Z" fill="#ffad04"/><path d="M54 13 33 45h21L45 70l26-29H48l12-28Z" fill="#fffb89"/>',
scroll:'<rect x="27" y="15" width="46" height="71" rx="7" fill="#ac7445"/><rect x="35" y="19" width="30" height="63" fill="#ecd09e"/><path d="M23 16q3-9 13-7h34q12 5 5 14H26Q20 21 23 16Zm0 63q5-8 14-4h33q11 2 5 12H28q-7 0-5-8Z" fill="#b9804c"/><path d="M41 40h19M41 48h19M41 56h12" stroke="#b68a60" stroke-width="3"/>',
glove:'<path d="M36 88 21 70 14 50q-3-10 5-13 6-3 12 9l-3-26q0-9 8-9t8 11v19l3-27q2-9 10-7t6 12v21l5-19q3-9 11-6t5 11l-5 22 8-13q5-7 12-2t2 13L78 84 55 94Z" fill="#ff9b79"/><path d="M32 73q9 3 18 16l17-4 11-23M43 18v32M61 18l-3 30M77 30l-8 20" fill="none" stroke="#e97558" stroke-width="3"/>',
belt:'<path d="M10 35h80v40H10Z" fill="#be8a4a"/><path d="M10 36h80v14H10Z" fill="#eec68d"/><rect x="37" y="34" width="28" height="42" rx="3" fill="#65432f"/><rect x="43" y="39" width="16" height="31" fill="#ffebb7"/><path d="M45 43h13v20H45Z" fill="#b2834b"/>',
part:'<path d="M14 11h72v78H14Z" fill="#333348"/><path d="M21 19h58v62H21Z" fill="#98ee27"/><path d="M27 41h47v34H27Z" fill="#7d26b4"/><path d="M36 48h31v24H36Z" fill="#efeaff"/><circle cx="51" cy="60" r="10" fill="#303551"/><circle cx="51" cy="60" r="4" fill="#a6f4ff"/><path d="M32 25h37v12H32Z" fill="#c8ff7d"/>',
tech:'<path d="M9 35 25 12h59l10 23-6 54H13Z" fill="#ffb928"/><path d="M10 36h81v48H10Z" fill="#e7ebf0"/><path d="M12 35 25 12h59l10 23Z" fill="#fff"/><path d="M14 55h76v29H14Z" fill="#f59f22"/><path d="M52 43 78 57v26L52 96 25 83V57Z" fill="#34374d"/><path d="M52 50 71 61v19L52 91 32 80V61Z" fill="#fff5d6"/><path d="M52 56 65 64v14L52 85 39 78V64Z" fill="#f6b52f"/><path d="M52 64 59 68v7l-7 5-7-5v-7Z" fill="#fff6ba"/>',
collection:'<path d="M16 26 30 12h48l9 14-5 61H17Z" fill="#b92add"/><path d="M15 27h70v15H15Z" fill="#ed64f7"/><path d="M23 45h55v41H23Z" fill="#8022ad"/><path d="M42 40h22v48H42Z" fill="#343556"/><path d="M46 47h14v34H46Z" fill="#91f8e8"/><path d="M49 54h8M49 63h8M49 72h8" stroke="#3fa9aa" stroke-width="3"/>',
sgear:'<path d="M50 5 83 19 89 52 76 78 50 95 24 79 10 52 17 18Z" fill="#423b5c"/><path d="M50 13 75 26 79 52 68 73 50 84 32 72 22 52 26 27Z" fill="#dfe6fa"/><path d="M50 22 68 32 72 51 62 65 50 74 39 65 30 51 33 32Z" fill="#4a3c87"/><path d="M50 30 62 39 61 54 50 64 40 54 38 39Z" fill="#ffd840"/><path d="M45 43h11v15H45Z" fill="#2bd7fa"/>',
supply:'<path d="M11 35 29 14h55l11 20-5 55H10Z" fill="#50c7ef"/><path d="M10 35h83v53H10Z" fill="#1385df"/><path d="M13 36 29 14h55l10 22Z" fill="#effaff"/><path d="M15 42h75v13H15Z" fill="#b4e8fc"/><path d="M36 40h31v47H36Z" fill="#3c5575"/><path d="M42 55h19v25H42Z" fill="#41edf3"/><path d="M45 60h13M45 69h13" stroke="#fff" stroke-width="3"/>',
premium:'<path d="M9 32 28 12h53l12 20-4 55H12Z" fill="#ffd022"/><path d="M11 33h81v54H11Z" fill="#b92add"/><path d="M11 34 29 12h52l12 22Z" fill="#ffef73"/><path d="M14 38h74v14H14Z" fill="#f9ae11"/><path d="M48 38h23v49H48Z" fill="#ffd02c"/><rect x="50" y="57" width="20" height="30" rx="2" fill="#4f2562"/><rect x="55" y="63" width="10" height="20" fill="#ffef77"/>',
gift:'<rect x="14" y="39" width="72" height="49" fill="#9941d9"/><path d="M10 32h80v18H10Z" fill="#ed68fb"/><path d="M43 32h15v56H43Z" fill="#ffdf70"/><path d="M50 33Q23 33 27 14q6-14 24 18Q76-1 81 14q4 17-31 19" stroke="#ffe58e" stroke-width="7" fill="none"/>',
shop:'<path d="M13 35 23 9h58l11 26v18H11Z" fill="#f3ab49"/><path d="M19 47h62v42H19Z" fill="#3a445e"/><path d="M25 54h25v33H25Z" fill="#82e568"/><path d="M58 54h16v33H58Z" fill="#ace3fa"/><path d="M10 35h83v15H10Z" fill="#ffad56"/><path d="M30 11v38M50 11v38M70 11v38" stroke="#fff4df" stroke-width="10"/>',
battle:'<path d="M50 5 64 34l33 5-24 23 5 32-28-16-28 16 5-32L4 39l32-5Z" fill="#ffca1b"/><path d="M50 20 59 40l22 3-16 16 4 21-19-11-19 11 4-21-16-16 22-3Z" fill="#fff287"/>',
planet:'<circle cx="50" cy="53" r="32" fill="#45bcef"/><path d="M23 39 42 23l19 13-8 22-22 8-14-12Z" fill="#f483af"/><path d="M52 56 75 37 82 61 69 74 52 68Z" fill="#ec5090"/><path d="M6 65q38-47 86 0" fill="none" stroke="#ffe549" stroke-width="9"/>',
home:'<path d="M7 45 50 8l43 37-9 13-10-9v40H25V49l-10 9Z" fill="#38a8ec"/><path d="M25 47 50 24l25 23v42H25Z" fill="#e6edf6"/><rect x="44" y="62" width="16" height="27" fill="#e95e5a"/><rect x="30" y="52" width="11" height="16" fill="#6ce4ff"/>',
key:'<circle cx="34" cy="32" r="19" fill="#ffc52f"/><circle cx="34" cy="32" r="8" fill="#ffec9a"/><path d="M47 44 88 85 76 95 64 81 57 88 48 79 55 72 39 54Z" fill="#ffda35"/>',
face:'<path d="M15 29 29 12l22 5 13-7 24 19-3 37-17 21-40-2-17-20Z" fill="#fb592b"/><path d="M24 42 40 30 62 34l15 10-4 27-19 14-23-9Z" fill="#ffe1a8"/><path d="M18 44 22 22 36 15l17 14 18-13 12 27-22-6-9-12-11 15Z" fill="#fc4b22"/><path d="M36 55h9M60 55h9" stroke="#2f2433" stroke-width="5"/>',
};
function make(kind){const num='v17-'+(seq++);return '<svg class="v167-icon" viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><g stroke="#292139" stroke-width="4.1" stroke-linejoin="round" stroke-linecap="round">'+(art[kind]||art.diamond)+'</g></svg>'}
function apply(){
 const root=document.getElementById('subpage');if(!root||!root.classList.contains('shop-immersive'))return;
 const replace=(sel,kinds)=>root.querySelectorAll(sel).forEach((node,i)=>{if(node.dataset.v167==='yes')return;node.dataset.v167='yes';node.innerHTML=make(kinds[i]||kinds[0])});
 replace('.recorded-shop-card .v165-emblem',['diamond','scroll','glove','belt','part','glove']);
 replace('.recorded-offer .offer-art',['tech','collection','sgear']);
 replace('.shop-feature .v165-supply-art',['supply','premium']);
 replace('.v165-avatar',['face']);
 replace('.v165-nav-icon',['shop','sgear','battle','planet','home']);
 const reIcon=(selector,keys)=>root.querySelectorAll(selector).forEach((node,i)=>{const old=node.querySelector('svg.v165-icon');if(old)old.outerHTML=make(keys[i]||keys[0])});
 reIcon('.v165-res',['energy','diamond','coin']);
 reIcon('.offer-foot span:first-child',['key','key','key']);
 reIcon('.gem-pack',['diamond']);
 reIcon('.shop-buy',['diamond','coin','diamond','coin','diamond','diamond']);
 reIcon('.v165-supply-actions button',['key']);
 root.querySelectorAll('.shop-feature').forEach(n=>{if(!n.querySelector('.v167-info'))n.insertAdjacentHTML('beforeend','<span class="v167-info" aria-hidden="true">i</span>')});
}
const oldShow=window.showPanel;
if(typeof oldShow==='function')window.showPanel=function(section,...args){const result=oldShow.call(this,section,...args);if(section==='shop')apply();return result};
const root=document.getElementById('subpage');if(root){let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply()})}).observe(root,{childList:true,subtree:true});apply()}
window.shopV167={version:'16.7',repaint:apply};
})();