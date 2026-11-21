
/* V16.4: Shop upgrade. Additive, backward-compatible offline local-save features.
   Based on user screen recording for UI categories; all drops/balancing are this game's own. */
(function(){
"use strict";
const VER="16.4",TYPES=["tech","collection","sGear","normal","choice"],LABELS={tech:"科技配件宝箱",collection:"收藏品十期宝箱",sGear:"S级军备",normal:"军用物资箱",choice:"地球卫队补给"};
const ICONS=["📐","🦾","⚙️","🎯","🔋","🛡️","🧲","🔧","🌀","🪖","📡","🧬"];
const PRICES={tech:90,collection:110,sGear:160,normal:80,choice:120};
const GUARANTEES={tech:{rare:7,epic:60},collection:{rare:8,epic:31},sGear:{rare:6,epic:17}};
let pickedSlot="weapon",veil,head,body;
function state(){
 ensureMetaSave();
 if(!save.shopV164||typeof save.shopV164!=="object")save.shopV164={};
 const s=save.shopV164;
 if(!Number.isFinite(s.techKeys))s.techKeys=1;
 if(!Number.isFinite(s.collectionKeys))s.collectionKeys=0;
 if(!Number.isFinite(s.sGearKeys))s.sGearKeys=0;
 if(!s.pity||typeof s.pity!=="object")s.pity={};
 if(!s.collectionInventory||typeof s.collectionInventory!=="object")s.collectionInventory={};
 if(!Number.isInteger(s.series)||s.series<1||s.series>10)s.series=10;
 if(!["armor","gloves","neck","belt","boots"].includes(s.wishSlot))s.wishSlot="armor";
 if(!Array.isArray(s.history))s.history=[];
 for(const x of TYPES){if(!s.pity[x]||typeof s.pity[x]!=="object")s.pity[x]={rare:0,epic:0,opened:0}}
 return s;
}
function fmt(n){return Math.max(0,Math.floor(Number(n)||0)).toLocaleString()}
function close(){if(veil)veil.classList.remove("open")}
function popup(title,html){
 head.textContent=title;body.innerHTML=html;veil.classList.add("open");body.scrollTop=0;
}
function note(s){toast(s)}
function b(label,click,alternate,disabled){
 return '<button '+(alternate?'class="alternate" ':'')+(disabled?'disabled ':'')+'onclick="'+click+'">'+label+'</button>';
}
function countDown(){
 const d=new Date(),end=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1),m=Math.max(0,Math.floor((end-d)/60000));
 return String(Math.floor(m/60)).padStart(2,"0")+"时 "+String(m%60).padStart(2,"0")+"分";
}
function iconBox(icon,rarity){
 const cls=rarity===3?"":rarity===2?"purple":rarity===1?"blue":"green";
 return '<div class="v164-hex '+cls+'">'+shopVector(icon)+'</div>';
}
function rates(){
 const rows=[["史诗","1.50%",3],["杰出","10.35%",2],["优秀","22.70%",1],["精良","65.45%",0]];
 popup(LABELS.tech,rows.map(x=>'<div class="v164-rarity '+(x[2]===2?'purple':x[2]===1?'blue':x[2]===0?'green':'')+'"><strong>'+x[0]+'</strong><span>含保底综合概率 '+x[1]+'</span></div><div class="v164-rarity-grid">'+ICONS.map(y=>iconBox(y,x[2])).join("")+'</div>').join("")+
 '<div class="v164-summary">显示录屏中的品质与综合概率。此项目的离线奖池采用独立实现，并在保底时提高对应品质的实际掉落。</div>');
}
function gearFull(n){ensureMetaSave();return save.gearInventory.length+n>80}
function roll(type){
 const s=state(),p=s.pity[type],gu=GUARANTEES[type],u=Math.random();
 let r=u<.015?3:u<.1185?2:u<.3455?1:0;
 p.opened++;
 p.rare++;p.epic++;
 if(gu){if(p.epic>=gu.epic)r=3;else if(p.rare>=gu.rare)r=Math.max(2,r)}
 if(r>=2)p.rare=0;
 if(r>=3)p.epic=0;
 return r;
}
function reward(type,r){
 const s=state();
 if(type==="tech"){
  const parts=[4,9,22,45][r];save.gearParts+=parts;
  return {icon:"⚙️",name:"装备零件 ×"+parts,rarity:r};
 }
 if(type==="collection"){
  const ids=["抗体徽记","能源晶簇","量子符印","远星藏品"],key="第"+s.series+"期 · "+ids[r];
  s.collectionInventory[key]=(s.collectionInventory[key]||0)+1;
  const cores=[1,2,4,8][r];save.petCores+=cores;
  return {icon:ICONS[(r*3+s.pity[type].opened)%ICONS.length],name:key+" ＋ 宠物核心×"+cores,rarity:r};
 }
 const wished=GEAR_DEFS.filter(d=>d.slot===s.wishSlot);
 const pool=(type==="sGear"&&r>=2&&wished.length)?wished:GEAR_DEFS;
 const def=pool[Math.floor(Math.random()*pool.length)];
 const item=makeGear(def.id,Math.min(3,r));
 if(!item)throw new Error("gear_inventory_full");
 return {icon:"🛡️",name:def.name+" · "+GEAR_RARITIES[item.rarity].name,rarity:item.rarity};
}
function priceOf(type){return PRICES[type]||0}
function chestKeys(type){const s=state(),key=type+"Keys";return type==="normal"?0:Math.max(0,Math.floor(s[key]||0))}
function buy(type,num){
 const s=state(),n=Number(num);
 if(!TYPES.includes(type)||type==="choice"||![1,10].includes(n))return false;
 const key=type+"Keys",used=Math.min(chestKeys(type),n),cost=(n-used)*priceOf(type);
 if(type!=="tech"&&type!=="collection"&&type!=="sGear"&&type!=="normal")return false;
 if((type==="sGear"||type==="normal")&&gearFull(n)){note("装备背包空间不足，请先整理");return false}
 if(!Number.isFinite(save.gems)||save.gems<cost){note("钻石不足");return false}
 save.gems-=cost;
 if(type!=="normal")s[key]-=used;
 const result=[];
 for(let i=0;i<n;i++)result.push(reward(type,roll(type)));
 s.history.unshift({at:Date.now(),type,number:n,cost,rewards:result.map(x=>x.name)});
 s.history=s.history.slice(0,60);
 updateHome();showPanel("shop");persist();
 popup("获得奖励",'<div class="v164-outcomes">'+result.map(x=>iconBox(x.icon,x.rarity)).join("")+'</div><div class="v164-summary">'+result.map(x=>x.name).join("<hr>")+'</div><div class="v164-buttons">'+b("查看背包","shopV164.inventory()")+b("返回商店","shopV164.close()",true)+'</div>');
 return true;
}
function chest(type){
 const s=state(),name=LABELS[type];if(!name)return;
 if(type==="choice"){wish();return}
 const keyCount=chestKeys(type),p=s.pity[type];
 const more=type==="tech"?'<button class="v164-action" style="width:100%;margin-bottom:10px" onclick="shopV164.rates()">宝箱概率及配件图鉴</button>':"";
 const hint=GUARANTEES[type]?(GUARANTEES[type].rare+"次内必出杰出，"+GUARANTEES[type].epic+"次内必出史诗"):"从已实装的装备池获得随机装备";
 const moreChoice=type==="collection"?'<div class="v164-buttons">'+b("选择收藏品期数 · "+s.series+"期","shopV164.series()",true)+"</div>":type==="sGear"?'<div class="v164-buttons">'+b("S级装备心愿单 · "+s.wishSlot,"shopV164.sWish()",true)+"</div>":"";
 popup(name,'<div class="v164-summary"><strong>'+name+'</strong><div>🎁 '+hint+'</div><div>已有钥匙 '+keyCount+'　累计开启 '+p.opened+' 次</div><div>距下次品质保底：杰出 '+Math.max(0,(GUARANTEES[type]?.rare||0)-p.rare)+' / 史诗 '+Math.max(0,(GUARANTEES[type]?.epic||0)-p.epic)+'</div></div>'+more+
 moreChoice+'<div class="v164-buttons">'+b('开启1次<br>🔑 / 💎×'+priceOf(type),'shopV164.buy("'+type+'",1)',false,false)+b('开启10次<br>💎×'+(priceOf(type)*10),'shopV164.buy("'+type+'",10)',true,false)+'</div><p class="v164-mini">先使用持有的钥匙，不足部分使用钻石补齐；余额和奖励同步保存。</p>');
}
function series(){
 const s=state();
 popup("选择收藏品期数",'<div class="v164-summary">选择希望抽取的收藏品期数。切换后仅改变期数奖池，不重置保底进度。</div><div class="v164-select">'+Array.from({length:10},(_,i)=>'<button class="'+(s.series===i+1?'active':'')+'" onclick="shopV164.selectSeries('+(i+1)+')">收藏品第'+(i+1)+'期</button>').join("")+'</div><div class="v164-buttons">'+b("返回","shopV164.chest('collection')",true)+'</div>');
}
function selectSeries(n){if(!Number.isInteger(n)||n<1||n>10)return;state().series=n;persist();chest("collection")}
function sWish(){
 const s=state();
 popup("S级装备心愿单",'<div class="v164-summary">选择一件期望的S级装备部位。杰出及以上品质的军备奖励会优先按心愿部位生成，保底不会因切换而重置。</div><div class="v164-select">'+SLOTS.map(([k,name])=>'<button class="'+(s.wishSlot===k?'active':'')+'" onclick="shopV164.selectWish(\''+k+'\')">'+name+'</button>').join("")+'</div><div class="v164-buttons">'+b("返回军备","shopV164.chest('sGear')",true)+'</div>');
}
function selectWish(k){if(!SLOTS.some(x=>x[0]===k))return;state().wishSlot=k;persist();chest("sGear")}
function inventory(){
 const s=state(),col=Object.entries(s.collectionInventory).filter(x=>x[1]>0);
 popup("补给仓库",'<div class="v164-summary"><strong>有效材料</strong><p>装备零件 '+fmt(save.gearParts)+'　宠物核心 '+fmt(save.petCores)+'</p><p>装备 '+save.gearInventory.length+'/80</p></div>'+
 '<div class="v164-summary"><strong>收藏品（永久生效）</strong><p>'+(col.length?col.map(x=>x[0]+" ×"+x[1]).join(" · "):"暂未获得")+'</p><p>每件收藏品提供生命和伤害加成，战斗计算已经接入。</p></div>'+
 '<div class="v164-buttons">'+b("返回","shopV164.close()",true)+b("查看装备库","shopV164.goItems()")+'</div>');
}
const SLOTS=[["armor","护甲"],["gloves","手套"],["neck","项链"],["belt","腰带"],["boots","战靴"]];
function wish(){
 popup("地球卫队补给",'<div class="v164-summary">选择希望获得的装备部位。每次消耗💎120，获取一件精良或更高品质装备；奖励进入当前装备背包。</div>'+
 '<div class="v164-select">'+SLOTS.map(([k,name])=>'<button class="'+(pickedSlot===k?'active':'')+'" onclick="shopV164.select(\''+k+'\')">'+name+'</button>').join("")+'</div><div class="v164-buttons">'+b("确认开启 💎120","shopV164.buyWish()",false,save.gems<120||gearFull(1))+b("返回","shopV164.close()",true)+'</div>');
}
function select(slot){if(SLOTS.some(x=>x[0]===slot)){pickedSlot=slot;wish()}}
function buyWish(){
 if(save.gems<120||gearFull(1)){note("钻石不足或背包已满");return false}
 const defs=GEAR_DEFS.filter(x=>x.slot===pickedSlot),def=defs[Math.floor(Math.random()*defs.length)];
 if(!def){note("当前装备池暂无该部位");return false}
 const rarity=Math.random()<.11?3:Math.random()<.4?2:1;
 const item=makeGear(def.id,rarity);if(!item)return false;
 save.gems-=120;const s=state();s.history.unshift({at:Date.now(),type:"choice",rewards:[def.name],cost:120});updateHome();showPanel("shop");persist();
 popup("获得装备",'<div class="v164-summary">'+shopVector("🛡️")+'<strong>'+GEAR_RARITIES[item.rarity].name+' · '+def.name+'</strong><p>已加入装备背包，能够进行装备和强化。</p></div><div class="v164-buttons">'+b("查看装备","shopV164.goItems()")+b("返回商店","shopV164.close()",true)+'</div>');
 return true;
}
function dailyInfo(i){
 const p=SHOP_DAILY[i];if(!p)return;
 ensureShopDaily();
 const bought=save.shopDaily.claims.includes(i),cur=p.currency==="coins"?"🪙":"💎";
 popup(p.name,'<div class="v164-summary">'+shopVector(p.icon)+'<strong>'+p.name+' ×'+p.qty+'</strong><p>'+p.desc+'</p><p>每日限购 1 次，刷新时间 00:00</p></div><div class="v164-buttons">'+b("返回","shopV164.close()",true)+b(bought?"今日已领取":(i===0?"免费领取":cur+" ×"+p.cost),"shopV164.buyDaily("+i+")",false,bought)+'</div>');
}
function buyDaily(i){close();return purchaseDailyProduct(i)}
function gem(i){
 const packs=[80,500,1200,2500,6500,14000],prices=[6,30,68,128,328,648];
 popup("钻石",'<div class="v164-summary"><strong>💎 '+fmt(packs[i])+' 钻石</strong><p>录屏中的标价：'+prices[i]+'元</p><p>这是原版商店付费栏目的界面展示，本项目未接入支付渠道，也不会扣取真实货币。</p></div><div class="v164-buttons">'+b("返回","shopV164.close()",true)+'</div>');
}
function goItems(){close();showPanel("items")}
function showShopSection(){
 let h=baseRender(),i=0;
 h=h.replace(/<section class="recorded-offer offer-(\d+)">/g,function(m,n){return '<section class="recorded-offer offer-'+n+'" role="button" tabindex="0" onclick="shopV164.chest(\''+TYPES[Number(n)]+'\')">';});
 h=h.replace(/<section class="recorded-offer offer-(\d+)"[\s\S]*?<\/section>/g,function(block,n){return block.replace("×0","×"+chestKeys(TYPES[Number(n)]));});
 h=h.replace("收藏品十钥宝箱","收藏品十期宝箱");
 h=h.replace("次次获得装备","6次内必出杰出品质").replace("达到次数获取高级装备","17次内必出史诗品质");
 h=h.replace(/<div class="shop-discount">5折<\/div>/g,'<div class="shop-discount">3折</div>');
 h=h.replace(/<div class="shop-item-art">/g,function(){return '<div class="shop-item-art" role="button" tabindex="0" onclick="shopV164.dailyInfo('+i+++')">';});
 h=h.replace('<article class="shop-feature blue">','<article class="shop-feature blue" role="button" tabindex="0" onclick="shopV164.chest(\'normal\')">');
 h=h.replace('<article class="shop-feature magenta">','<article class="shop-feature magenta" role="button" tabindex="0" onclick="shopV164.wish()">');
 let g=0;h=h.replace(/class="gem-pack"/g,function(){return 'class="gem-pack" role="button" tabindex="0" onclick="shopV164.gem('+g+++')"';});
 h=h.replace("刷新倒计时：每日0时更新","刷新倒计时："+countDown());
 h=h.replace("钻石礼包仅展示录屏中的外观，不接入真实支付。","钻石购买区仅展示界面，尚未接入支付。");
 return h;
}
const baseRender=renderRecordedShop;
renderRecordedShop=showShopSection;
const originalGearBonuses=gearBonuses;
gearBonuses=function(){
 const result=originalGearBonuses();
 const bag=state().collectionInventory;
 let hp=0,atk=0;
 for(const [k,qty] of Object.entries(bag)){if(!Number.isFinite(qty)||qty<=0)continue;hp+=qty*2;atk+=qty*.4}
 result.hp+=Math.min(500,hp);result.atk+=Math.min(70,atk);return result;
};
function init(){
 veil=document.createElement("div");veil.id="v164ShopVeil";veil.innerHTML='<div id="v164ShopPopup" role="dialog" aria-modal="true" aria-label="补给商店"><header id="v164ShopHead"></header><button id="v164ShopClose" aria-label="关闭" onclick="shopV164.close()">×</button><main id="v164ShopBody"></main></div>';
 document.body.appendChild(veil);head=document.getElementById("v164ShopHead");body=document.getElementById("v164ShopBody");
 veil.addEventListener("click",function(e){if(e.target===veil)close()});
 document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
 state();
}
window.shopV164={version:VER,close,chest,inventory,rates,wish,select,buyWish,buy,dailyInfo,buyDaily,gem,goItems,series,selectSeries,sWish,selectWish,state:()=>JSON.parse(JSON.stringify(state())),ratesShown:[1.5,10.35,22.7,65.45],runSmoke:()=>({cards:(document.querySelectorAll(".recorded-shop-card")||[]).length,popup:!!veil,keys:state().techKeys})};
init();
})();
