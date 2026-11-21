
/* V16.5 shop view layer — preserves V16.4 economic rules and local save. */
(function(){
'use strict';
const VECTOR={
diamond:'<path d="M50 9 76 24 77 58 50 81 23 58 24 24Z" fill="#16bf30"/><path d="M26 27 49 12 71 28 51 43Z" fill="#83ff78"/><path d="M24 29 51 45 50 78 24 56Z" fill="#009347"/><path d="M51 45 75 29 75 55 51 78Z" fill="#0aab2b"/>',
coin:'<circle cx="50" cy="49" r="37" fill="#a55d07"/><circle cx="48" cy="45" r="33" fill="#ffe335"/><circle cx="48" cy="45" r="26" fill="#ffb818" stroke="#fff38d" stroke-width="3"/><path d="M48 27v37M36 35h21q11 9-6 12H38q-10 11 12 13h12" fill="none" stroke="#fff3a2" stroke-width="6" stroke-linecap="round"/>',
energy:'<path d="M51 5 25 45h22L36 92 78 40H53L66 5Z" fill="#ffad02"/><path d="M54 8 34 40h21L45 71 68 38H48L60 8Z" fill="#fff46b"/>',
scroll:'<rect x="28" y="12" width="45" height="72" rx="7" fill="#b77e45"/><path d="M31 20h33v48H31Z" fill="#f1d5a6"/><path d="M21 15q3-5 10-4h34q8 4 7 11H25Q17 21 21 15Zm1 62q5-6 12-3h30q8 3 7 9H23q-5-2-1-6Z" fill="#bc7b3e"/><path d="M40 34h17M40 43h20M40 52h12" stroke="#a97e5d" stroke-width="4"/>',
glove:'<path d="M32 84 22 65 15 48q-4-12 6-15l13 12-5-26q0-10 9-10 8 0 8 10V30l2-17q2-9 9-7 8 2 7 11l-1 13 5-15q4-7 11-3 6 4 3 12L76 47l5-14q4-8 11-3 5 6 0 15L78 81 57 93Z" fill="#ff9472"/><path d="M29 76 49 88 64 84 73 65" stroke="#e45843" stroke-width="5" fill="none"/><path d="M37 14 43 50M55 13 55 45M74 24 64 48" stroke="#ffcb92" stroke-width="4" fill="none"/><path d="M21 50 35 55 42 64" stroke="#d75f44" stroke-width="4" fill="none"/>',
part:'<path d="M18 17h65v70H17Z" fill="#34344e"/><path d="M23 22h55v60H23Z" fill="#a2ef30"/><rect x="30" y="40" width="42" height="37" rx="2" fill="#7c24c3"/><path d="M33 24h38v14H33Z" fill="#baff79"/><path d="M46 31h13" stroke="#242532" stroke-width="4"/><rect x="40" y="48" width="25" height="22" rx="3" fill="#e9e5ff"/><circle cx="52" cy="60" r="8" fill="#39344d"/><circle cx="52" cy="60" r="3" fill="#fff"/><path d="M37 39v38" stroke="#46235d" stroke-width="5"/>',
tech:'<path d="M10 37 35 13h45l12 24-8 51H18Z" fill="#f5b72d"/><path d="M11 37h80l-8 50H19Z" fill="#e7e9f2"/><path d="M19 44h64l-5 37H22Z" fill="#e9b51e"/><path d="M34 13 44 33h44L80 13Z" fill="#ecf2f9"/><path d="M11 37 34 13l11 25Z" fill="#fff"/><path d="M34 50 65 50 77 65 63 86H39L24 64Z" fill="#ffc425"/><path d="M40 52 60 52 68 66 59 78H41L32 66Z" fill="#fff2a3"/><path d="M42 58h16v18H42Z" fill="#ffb020"/>',
collection:'<rect x="17" y="24" width="65" height="59" rx="4" fill="#9025d2"/><path d="M16 26 29 12h46l10 14-4 15H18Z" fill="#dc3af0"/><path d="M24 37h51v40H24Z" fill="#a731db"/><path d="M43 30v49h20V30Z" fill="#5b198b"/><rect x="40" y="43" width="25" height="38" rx="4" fill="#333b6b"/><rect x="45" y="49" width="15" height="27" rx="3" fill="#85ffe2"/><path d="M48 54h9M48 61h9M48 69h9" stroke="#399fa3" stroke-width="3"/><path d="M20 29h61" stroke="#faadff" stroke-width="5"/>',
sgear:'<path d="M50 5 84 21 84 57 67 81 50 94 29 82 15 55 15 21Z" fill="#44305f"/><path d="M50 12 77 26 76 55 62 76 50 85 35 76 23 55 23 26Z" fill="#d3d5f7"/><path d="M50 18 70 31 70 52 60 70 50 78 39 70 30 52 30 31Z" fill="#2b274e"/><path d="M50 31 62 40 58 56 50 64 41 55 38 40Z" fill="#ffc533"/><path d="M44 43h13v15H44Z" fill="#1ad8ff"/><path d="M50 18v10" stroke="#ffe95b" stroke-width="5"/>',
supply:'<path d="M8 28 32 10 83 10 96 31 88 84H13Z" fill="#6ec9f5"/><path d="M9 28h86v56H9Z" fill="#0079d4"/><path d="M9 29 32 10h52l10 19Z" fill="#e9f2ff"/><path d="M10 34h81v13H10Z" fill="#b9dbef"/><path d="M40 33h25v43H40Z" fill="#5e9cda"/><rect x="38" y="47" width="28" height="32" rx="2" fill="#273958"/><rect x="45" y="52" width="14" height="19" fill="#36f1f8"/><path d="M48 58h9M48 64h9" stroke="#f4ffff" stroke-width="3"/>',
premium:'<path d="M9 29 28 13H78L94 29 88 86H15Z" fill="#ffbf1b"/><path d="M11 29h81v54H11Z" fill="#bb20da"/><path d="M12 29 28 11h50l14 18Z" fill="#fff36b"/><path d="M18 40h67v41H18Z" fill="#8b15b6"/><path d="M16 30h77v13H16Z" fill="#ffd828"/><rect x="42" y="39" width="24" height="45" fill="#fdbb0e"/><rect x="45" y="50" width="19" height="29" rx="2" fill="#4f1559"/><rect x="50" y="54" width="9" height="21" fill="#ffec76"/>',
gift:'<rect x="15" y="40" width="70" height="48" rx="3" fill="#9c3bdf"/><path d="M12 29h76v18H12Z" fill="#ed66f8"/><path d="M41 31h18v57H41Z" fill="#ffe36e"/><path d="M49 29Q13 25 23 12 34-1 50 31Q64-1 77 12 87 27 49 29" fill="none" stroke="#ffe58f" stroke-width="8"/>',
shop:'<rect x="13" y="35" width="72" height="55" fill="#354d6c"/><path d="M7 31 17 10H81l12 21-9 16H16Z" fill="#fff3cf"/><path d="M8 31h84v15H8Z" fill="#ed8c33"/><path d="M22 12v33M43 12v33M64 12v33M83 12v33" stroke="#fef5dc" stroke-width="12"/><path d="M24 48h26v40H24Z" fill="#8eed74"/><path d="M57 49h18v40H57Z" fill="#fbc36a"/>',
battle:'<path d="M13 66 38 53 51 15l12 38 25 13-31 5-8 21-9-23Z" fill="#ffdd1d"/><path d="M48 18 50 61 20 69 44 65Z" fill="#fff7a1"/>',
planet:'<circle cx="50" cy="53" r="32" fill="#3bb7d5"/><path d="M23 37 38 27l12 8 8 19-15 17-20-9Z" fill="#e84c9d"/><path d="M49 24 74 32 80 56 65 65 56 55Z" fill="#f74f86"/><path d="M8 62q20-27 49-19 27 3 36 12" fill="none" stroke="#fdd83a" stroke-width="9" stroke-linecap="round"/>',
home:'<path d="M9 43 50 10l41 33v43H13V43Z" fill="#75b4fd"/><path d="M25 43h50v42H25Z" fill="#d5dff8"/><rect x="42" y="57" width="20" height="29" fill="#ec5149"/><path d="M9 43 50 11l41 32-7 10-34-25-34 25Z" fill="#2289cd"/>',
key:'<circle cx="32" cy="26" r="16" fill="#ffdc20"/><circle cx="32" cy="26" r="7" fill="#f8bf15"/><path d="M43 38 84 78 71 88 58 74 50 82 40 72 48 63 34 48Z" fill="#f8bc15"/>',
face:'<path d="M13 27 25 10 43 12l15-7 30 24-3 40-22 22-39-3L12 63Z" fill="#ff5725"/><path d="M20 40 42 33 55 40 72 33 80 48 77 71 60 84 34 83 20 68Z" fill="#ffe0a9"/><path d="M22 34 30 15l23 11 15-8 13 22-22-5-11-12-5 14Z" fill="#fe4923"/><path d="M34 56h10M58 56h10" stroke="#2f252d" stroke-width="6"/><path d="M45 74q6 6 12 0" fill="none" stroke="#c97265" stroke-width="4"/>',
plus:'<path d="M39 8h22v30h30v24H61v29H39V62H9V38h30Z" fill="#8bea28"/>'
};
function vIcon(name,cls=''){return '<svg class="v165-icon '+cls+'" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke="#252034" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">'+(VECTOR[name]||VECTOR.diamond)+'</g></svg>'}
function price(n){return Number(n||0).toLocaleString('zh-CN')}
function money(){if(save.unlimitedCoins)return '∞';const n=Number(save.coins)||0;return n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'K':price(n)}
function getEnergy(){try{if(typeof ensureActivity==='function'){const a=ensureActivity();if(Number.isFinite(a?.energy?.value))return Math.max(0,Math.round(a.energy.value))+'/30'}}catch{}return '—/30'}
function profileHUD(){
 const h=document.querySelector('#subpage .subpage-top');if(!h||h.querySelector('.v165-hud'))return;
 h.insertAdjacentHTML('beforeend','<div class="v165-hud"><button type="button" class="v165-profile" onclick="showHome()" aria-label="返回游戏大厅"><span class="v165-avatar">'+vIcon('face')+'</span><span class="v165-profile-details"><span class="v165-name">防线指挥官</span><span class="v165-level">LV.<span id="v165Lv">1</span><span class="v165-xp"><i></i></span></span></span></button><span class="v165-res">'+vIcon('energy')+'<b id="v165Energy">—/30</b><span class="v165-plus">+</span></span><span class="v165-res">'+vIcon('diamond')+'<b id="v165Gems">0</b><span class="v165-plus">+</span></span><span class="v165-res">'+vIcon('coin')+'<b id="v165Coins">0</b><span class="v165-plus">+</span></span></div>');
}
function updateHUD(){
 const lv=document.getElementById('v165Lv');if(!lv)return;
 lv.textContent=save.level||1;
 document.getElementById('v165Energy').textContent=getEnergy();
 document.getElementById('v165Gems').textContent=price(save.gems);
 document.getElementById('v165Coins').textContent=money();
}
function navbar(){
 const icons={shop:'shop',armory:'sgear',battle:'battle',challenges:'planet',guild:'home'};
 document.querySelectorAll('#subpage .subpage-bottom button[data-tab]').forEach(b=>{
  const span=b.querySelector('span');if(!span||span.classList.contains('v165-nav-icon'))return;
  span.className='v165-nav-icon';span.innerHTML=vIcon(icons[b.dataset.tab]||'home');
 });
}
function dailyCard(p,i){
 const got=save.shopDaily.claims.includes(i),isFree=i===0,cur=p.currency==='coins'?'coin':'diamond',cost=p.cost;
 const icons=['diamond','scroll','glove','scroll','part','glove'];
 const disabled=got||(p.currency==='coins'&&!canAffordCoins(cost))||(p.currency==='gems'&&save.gems<cost)||([2,4,5].includes(i)&&save.gearInventory.length>=80);
 const discount={1:'5折',2:'3折',3:'9折',5:'9折'};
 const className='recorded-shop-card '+(isFree?'shop-free ':'')+(i===4?'shop-gem-chest ':'')+([2,5].includes(i)?'v165-glove ':'');
 return '<article class="'+className+'" data-shop-index="'+i+'">'+
  (discount[i]?'<div class="shop-discount '+(i===2?'v165-hot':'')+'">'+discount[i]+'</div>':'')+
  (isFree&&!got?'<span class="v165-attention">!</span>':'')+
  '<div class="shop-item-title">'+p.name+'</div>'+
  '<div class="shop-item-art" role="button" tabindex="0" aria-label="查看'+p.name+'" onclick="shopV164.dailyInfo('+i+')" onkeydown="if(event.key===\'Enter\')shopV164.dailyInfo('+i+')"><div class="v165-emblem">'+vIcon(icons[i])+'</div>'+(p.qty>1?'<span class="shop-qty">×'+p.qty+'</span>':'')+'</div>'+
  '<button class="shop-buy '+(isFree?'is-free':'')+'" '+(disabled?'disabled':'')+' onclick="purchaseDailyProduct('+i+')">'+
  (got?'已领取':isFree?'免费':vIcon(cur)+' ×'+price(cost))+'</button></article>';
}
function offer(type,title,rarity1,rarity2,icon,key,idx){
 const s=shopV164.state(),amount=s[key]||0;
 const colorful1=rarity1.replace('杰出','<em>杰出</em>'),colorful2=rarity2.replace('史诗','<em>史诗</em>');
 return '<section class="recorded-offer offer-'+idx+'" role="button" tabindex="0" onclick="shopV164.chest(\''+type+'\')" onkeydown="if(event.key===\'Enter\')shopV164.chest(\''+type+'\')">'+
 '<div class="offer-heading">'+title+'</div>'+
 '<div class="offer-body"><div class="offer-art">'+vIcon(icon)+'</div><div class="offer-copy"><strong>'+colorful1+'</strong><small>'+colorful2+'</small></div></div>'+
 '<div class="offer-foot"><span>'+vIcon('key')+' ×'+amount+'</span><span>详情展开</span></div></section>';
}
function feature(type,title,description,icon,cl){
 const fn=type==='normal'?"shopV164.chest('normal')":"shopV164.wish()";
 const action=type==='normal'?"shopV164.chest('normal')":"shopV164.wish()";
 return '<article class="shop-feature '+cl+'" role="group" aria-label="'+title+'"><b>'+title+'</b>'+
 '<div class="v165-supply-note">'+description+'</div><div class="v165-supply-art">'+vIcon(icon)+'</div>'+
 '<div class="v165-supply-actions"><button onclick="shopV165.ad()">广告 ▷</button><button onclick="'+action+'">'+vIcon('key')+' 开启</button></div>'+
 '<small class="v165-supply-count">今日剩余次数：999/999</small></article>';
}
function dailyCountdown(){const d=new Date(),to=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1),t=Math.max(0,Math.floor((to-d)/60000));return String(Math.floor(t/60)).padStart(2,'0')+'时 '+String(t%60).padStart(2,'0')+'分'}
function render(){
 ensureMetaSave();ensureShopDaily();
 const cards=SHOP_DAILY.map(dailyCard).join('');
 const box=offer('tech','科技配件宝箱','7次内必出杰出配件','60次内必出史诗配件','tech','techKeys',0)+
 offer('collection','收藏品十期宝箱','8次内必出杰出收藏品','31次内必出史诗收藏品','collection','collectionKeys',1)+
 offer('sGear','S级军备','6次内必出杰出装备','17次内必出史诗装备','sgear','sGearKeys',2);
 const pack=[80,500,1200,2500,6500,14000].map((n,i)=>'<div class="gem-pack" role="button" tabindex="0" onclick="shopV164.gem('+i+')">'+vIcon('diamond')+'<b>×'+price(n)+'</b><small>查看礼包</small></div>').join('');
 return '<div class="recorded-shop"><div class="shop-ribbon">每日商店</div><p class="shop-countdown">刷新倒计时：<span id="v165Timer">'+dailyCountdown()+'</span></p>'+
 '<div class="recorded-shop-products">'+cards+'</div><div class="recorded-offers">'+box+'</div>'+
 '<div class="shop-ribbon v165-lower">补给箱</div><div class="shop-feature-grid">'+
 feature('normal','军用物资箱','获得装备与战备物资','supply','blue')+
 feature('choice','地球卫队补给','获得高品质精选装备','premium','magenta')+'</div>'+
 '<div class="shop-ribbon v165-lower">钻石</div><div class="recorded-gem-grid">'+pack+'</div>'+
 '<p class="shop-disclaimer">礼包为界面展示；没有接入真实支付或激励广告。</p>'+
 '<h3 class="base-title" style="margin:12px 5px 6px">装备补给箱</h3><div class="shop-equip-action">'+vIcon('sgear')+'<div><b>战备物资箱</b><small>240金币，可获得随机装备</small></div><button onclick="buyGearCrate()" '+(!canAffordCoins(240)||save.gearInventory.length>=80?'disabled':'')+'>开启</button></div></div>';
}
renderRecordedShop=render;
profileHUD();navbar();
const baseShow=showPanel;
showPanel=function(which){
 const root=document.getElementById('subpage');
 const scroll=document.getElementById('subpageBody');
 const keep=which==='shop'&&root.classList.contains('shop-immersive')&&root.classList.contains('active')?scroll.scrollTop:0;
 const result=baseShow(which);
 root.classList.toggle('shop-immersive',which==='shop');
 if(which==='shop'){
  updateHUD();navbar();
  scroll.scrollTop=keep;
 }
 return result;
};
function ad(){shopV164.close();const root=document.getElementById('v164ShopVeil'),head=document.getElementById('v164ShopHead'),body=document.getElementById('v164ShopBody');head.textContent='广告补给';body.innerHTML='<div class="v164-summary">激励视频广告尚未接入。此处不会模拟观看广告或直接发放奖励。</div><div class="v164-buttons"><button class="alternate" onclick="shopV164.close()">返回商店</button></div>';root.classList.add('open')}
function refreshHud(){
 const root=document.getElementById('subpage');
 if(!root.classList.contains('shop-immersive')||!root.classList.contains('active'))return;
 const time=document.getElementById('v165Timer');if(time)time.textContent=dailyCountdown();
 updateHUD();
}
window.shopV165={version:'16.5',ad,refreshHud,render,updateHUD};
window.setInterval(refreshHud,30000);
})();
