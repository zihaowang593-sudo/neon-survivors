const { chromium } = require('playwright');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
if(inlineScripts.length<2)throw Error('Missing game inline scripts');
for(let i=0;i<inlineScripts.length;i++){
  new vm.Script(inlineScripts[i],{filename:'index.html:inline-script-'+(i+1)});
}
console.log('INLINE SCRIPT SYNTAX PASS: '+inlineScripts.length+' scripts');

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  let failed=false;
  for(const viewport of [{width:390,height:844},{width:430,height:932},{width:1280,height:800}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
      await page.waitForFunction(()=>!!window.__gameQA,{timeout:15000});
      await page.waitForFunction(()=>{
        const art=document.getElementById('referenceLobbyArtwork');
        return !!art&&art.complete&&art.naturalWidth===864&&art.naturalHeight===1536;
      },null,{timeout:15000});
      const artSanity=await page.evaluate(()=>{
        const art=document.getElementById('referenceLobbyArtwork');
        const root=document.getElementById('referenceLobby'),r=root.getBoundingClientRect();
        const hits=[...document.querySelectorAll('#referenceLobby .replica-hit')];
        const valid=hits.length===25&&hits.every(b=>b.getAttribute('aria-label')&&
          getComputedStyle(b).pointerEvents==='auto'&&b.getBoundingClientRect().width>10);
        const play=hits.find(b=>b.getAttribute('aria-label')==='开始标准生存');
        const nav=hits.find(b=>b.getAttribute('aria-label')==='战斗大厅');
        return {imageWidth:art.naturalWidth,imageHeight:art.naturalHeight,width:r.width,height:r.height,
          valid,lobbyCentered:Math.abs((r.left+r.right)/2-window.innerWidth/2)<=2,homeFullWidth:Math.abs(document.getElementById('home').getBoundingClientRect().width-window.innerWidth)<=2,playAboveNav:!!play&&!!nav&&play.getBoundingClientRect().bottom<nav.getBoundingClientRect().top,
          hasDynamicCoins:document.getElementById('referenceCoins').textContent!=='',
          centerClick:!!play&&document.elementFromPoint(play.getBoundingClientRect().left+play.getBoundingClientRect().width*.5,play.getBoundingClientRect().top+play.getBoundingClientRect().height*.5)===play};
      });
      if(!artSanity.valid||!artSanity.lobbyCentered||!artSanity.homeFullWidth||!artSanity.playAboveNav||!artSanity.hasDynamicCoins||!artSanity.centerClick)
        throw Error('Screenshot reference visual/interaction regression: '+JSON.stringify(artSanity));
      fs.mkdirSync(require('node:path').join(__dirname,'screenshots'),{recursive:true});
      const capture=await page.screenshot({path:require('node:path').join(__dirname,'screenshots','chapter-home-'+viewport.width+'.png'),type:'png'});
      const paintCheck=await page.evaluate(async pngBase64=>{
        const screenshot=new Image();
        screenshot.src='data:image/png;base64,'+pngBase64;await screenshot.decode();
        const main=document.getElementById('referenceLobby');
        const img=document.getElementById('referenceLobbyArtwork');
        const rect=main.getBoundingClientRect();
        const reference=document.createElement('canvas');
        reference.width=screenshot.naturalWidth;reference.height=screenshot.naturalHeight;
        const rctx=reference.getContext('2d',{willReadFrequently:true});
        rctx.drawImage(img,rect.x,rect.y,rect.width,rect.height);
        const actual=document.createElement('canvas');
        actual.width=screenshot.naturalWidth;actual.height=screenshot.naturalHeight;
        const actx=actual.getContext('2d',{willReadFrequently:true});
        actx.drawImage(screenshot,0,0);
        const checks=[[.5,.44],[.45,.58],[.45,.72],[.6,.93],[.35,.32],[.65,.46],[.2,.55]];
        return checks.map(([x,y])=>{
          const px=Math.max(1,Math.min(actual.width-2,Math.floor(rect.x+rect.width*x)));
          const py=Math.max(1,Math.min(actual.height-2,Math.floor(rect.y+rect.height*y)));
          const a=actx.getImageData(px,py,1,1).data,b=rctx.getImageData(px,py,1,1).data;
          return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[2]-b[2]));
        });
      },capture.toString('base64'));
      if(paintCheck.some(diff=>diff>15))throw Error('Home page image does not visually match confirmed art: '+JSON.stringify(paintCheck));
      console.log('REFERENCE LOBBY VISUAL PASS '+viewport.width+'px: original 864x1536 art rendered, 25 clicks, actual screenshot pixel compare '+JSON.stringify(paintCheck));
      // Actual pointer actions, not merely DOM presence or direct function calls.
      for(const [name] of [['商店'],['装备'],['挑战'],['基地']]){
        await page.locator('#referenceLobby .replica-hit[aria-label="'+name+'"]').click();
        const pageOpened=await page.evaluate(()=>document.getElementById('subpage').classList.contains('active')&&!document.getElementById('home').classList.contains('active'));
        if(!pageOpened)throw Error('Recorded visual navigation is not clickable: '+name);
        await page.evaluate(()=>showHome());
      }
      await page.locator('#referenceLobby .replica-hit[aria-label="开始标准生存"]').click();
      const combatOpened=await page.evaluate(()=>!!game&&document.getElementById('hud').classList.contains('active'));
      if(!combatOpened)throw Error('Approved screenshot start button did not start combat');
      await page.screenshot({path:require('node:path').join(__dirname,'screenshots','recorded-combat-'+viewport.width+'.png')});
      const visualAndCache=await page.evaluate(()=>{
        render();
        const qa=window.__recordedCombatQA?.();
        showPauseMenu();
        const pause=!!document.querySelector('.recorded-pause')&&
          document.getElementById('modal').textContent.includes('战斗设置')&&paused;
        return {qa,pause};
      });
      if(!visualAndCache.qa||visualAndCache.qa.terrainCache<1||visualAndCache.qa.terrainCache>18||!visualAndCache.pause)
        throw Error('Recorded battle, pause and cached terrain are not functional: '+JSON.stringify(visualAndCache));

      const pauseGeometry=await page.evaluate(()=>{
        const selectors=['#modal','.recorded-pause','.recorded-inventory','.recorded-inventory>div','.recorded-items','.recorded-item','.recorded-actions','.recorded-main'];
        return Object.fromEntries(selectors.map(name=>{
          const e=document.querySelector(name);if(!e)return [name,null];const r=e.getBoundingClientRect(),css=getComputedStyle(e);
          return [name,{x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1),minHeight:css.minHeight,maxHeight:css.maxHeight,gridRows:css.gridTemplateRows}];
        }));
      });
      console.log('PAUSE GEOMETRY AUDIT '+viewport.width+'px '+JSON.stringify(pauseGeometry));
      const rootBox=pauseGeometry['#modal'],invBox=pauseGeometry['.recorded-inventory'],cellBox=pauseGeometry['.recorded-item'];
      const videoCoordinates={
        left:(invBox.x-rootBox.x)/rootBox.width,top:(invBox.y-rootBox.y)/rootBox.height,
        width:invBox.width/rootBox.width,height:invBox.height/rootBox.height,
        rowHeight:cellBox.height/rootBox.height
      };
      const targetCoordinates={left:.112,top:.276,width:.818,height:.36,rowHeight:.1};
      for(const key of Object.keys(targetCoordinates)){
        if(Math.abs(videoCoordinates[key]-targetCoordinates[key])>.016)
          throw Error('Paused equipment geometry differs from user video: '+JSON.stringify({key,actual:videoCoordinates,target:targetCoordinates}));
      }
      console.log('REFERENCE GEOMETRY ACCEPTANCE PASS '+viewport.width+'px: pause panel anchored to source video '+JSON.stringify(videoCoordinates));


      if(viewport.width===390){
        const box=pauseGeometry['.recorded-inventory'];
        const close=(v,reference,tolerance=.016)=>Math.abs(v-reference)<=tolerance;
        if(!box||!close(box.x/viewport.width,57/512)||!close(box.y/viewport.height,307/1112)||
           !close(box.width/viewport.width,420/512)||!close(box.height/viewport.height,400/1112))
          throw Error('Pause grid no longer matches the measured recording layout: '+JSON.stringify(box));
        console.log('VIDEO COORDINATE GATE PASS: paused inventory x/y/w/h aligned to provided recording');
      }

      await page.screenshot({path:require('node:path').join(__dirname,'screenshots','recorded-pause-'+viewport.width+'.png')});
      const recordedFlows=await page.evaluate(()=>{
        showBattleStatistics();
        const statistics=!!document.querySelector('.recorded-stats')&&document.getElementById('modal').textContent.includes('首领伤害');
        showRecordedControls();
        const controls=!!document.querySelector('.recorded-calibration');
        const oldSize=settings.recordedJoySize||125;
        changeRecordedControl('recordedJoySize',140);
        const joystick=document.getElementById('joystick');
        const adjusted=joystick.style.getPropertyValue('--recorded-joy-size')==='140px'&&
          (window.innerWidth>750||Math.round(joystick.getBoundingClientRect().width)===140);
        changeRecordedControl('recordedJoySize',oldSize);
        game.eventCount=0;game.events=[];
        triggerFieldEvent();
        const slot=!!document.querySelector('.recorded-slot')&&game.slotPending===true&&game.events.length===1;
        spinRecordedSlot();
        const reward=game.slotPending===false&&document.getElementById('modal').textContent.includes('已实际应用');
        return {statistics,controls,adjusted,slot,reward};
      });
      if(Object.values(recordedFlows).some(v=>v!==true))
        throw Error('Recorded battle settings, statistics or reward flow failed: '+JSON.stringify(recordedFlows));
      await page.screenshot({path:require('node:path').join(__dirname,'screenshots','recorded-slot-reward-'+viewport.width+'.png')});
      console.log('RECORDED COMBAT UI PASS '+viewport.width+'px: cached floor, pause equipment, damage, joystick and reward reel');

      const upgradeVideoUI=await page.evaluate(()=>{
        game.pending=1;game.offered=[];rollUpgrades();renderUpgradeModal();
        const slots=document.querySelectorAll('.recorded-upgrade-slot');
        const cards=document.querySelectorAll('.upgrade-option .choice');
        const stars=document.querySelectorAll('.recorded-card-stars');
        const text=document.getElementById('modal')?.textContent||'';
        const modal=document.getElementById('modal').getBoundingClientRect();
        const within=[...cards].every(c=>{const b=c.getBoundingClientRect();return b.left>=modal.left-1&&b.right<=modal.right+1});
        return {slots:slots.length,cards:cards.length,stars:stars.length,hasInstruction:text.includes('从上方选择一个技能进行学习'),within};
      });

      if(viewport.width===390){
        const geometry=await page.evaluate(()=>{
          const r=e=>{const b=document.querySelector(e).getBoundingClientRect();return [b.x/innerWidth,b.y/innerHeight,b.width/innerWidth,b.height/innerHeight]};
          return {header:r('.upgrade-head'),strip:r('.recorded-upgrade-strip'),cards:r('.choices')};
        });
        const near=(a,b,t=.018)=>Math.abs(a-b)<=t;
        if(!near(geometry.header[1],216/1112)||!near(geometry.strip[1],329/1112)||
           !near(geometry.cards[1],416/1112)||!near(geometry.cards[3],310/1112))
          throw Error('Skill card geometry diverged from recorded screen: '+JSON.stringify(geometry));
        console.log('VIDEO SKILL GEOMETRY GATE PASS: heading, slots and three cards aligned');
      }

      if(upgradeVideoUI.slots!==12||upgradeVideoUI.cards!==3||upgradeVideoUI.stars!==3||
         !upgradeVideoUI.hasInstruction||!upgradeVideoUI.within)
        throw Error('Video skill strip/card layout broken: '+JSON.stringify(upgradeVideoUI));
      const skillGeometry=await page.evaluate(()=>{
        const root=document.querySelector('#modal'),head=root.querySelector('.upgrade-head'),card=root.querySelector('.upgrade-option');
        const r=root.getBoundingClientRect(),h=head.getBoundingClientRect(),c=card.getBoundingClientRect();
        return {headerTop:(h.y-r.y)/r.height,cardTop:(c.y-r.y)/r.height,cardBottom:(c.bottom-r.y)/r.height};
      });
      if(Math.abs(skillGeometry.headerTop-.1935)>.025||Math.abs(skillGeometry.cardTop-.376)>.025||
         Math.abs(skillGeometry.cardBottom-.653)>.035)
        throw Error('Skill three-card geometry differs from video: '+JSON.stringify(skillGeometry));
      await page.screenshot({path:require('node:path').join(__dirname,'screenshots','recorded-upgrade-'+viewport.width+'.png')});
      console.log('RECORDED SKILL STRIP PASS '+viewport.width+'px: 12 live slots, 3 interactive cards and star ranks');

      await page.evaluate(()=>showHome());
      console.log('REFERENCE BUTTON ACTIONS PASS '+viewport.width+'px: four independent tabs and start combat');


      const comboHud=await page.evaluate(()=>document.getElementById('comboHud')!==null);
      if(!comboHud)throw Error('Combo HUD missing');
      const combatBars=await page.evaluate(()=>{const xp=document.querySelector('.battle-exp-track #expbar'),hp=document.getElementById('hpbar');return !!xp&&!!hp&&!!hp.closest('.battle-hp-accessible')&&!!document.querySelector('.battle-level')});
      if(!combatBars)throw Error('Battle XP must be in the top bar; HP must not be in the top bar');

      const threatHud=await page.evaluate(()=>document.getElementById('battleThreat')!==null);
      if(!threatHud)throw Error('Battle threat HUD missing');
      const cooldownButtons=await page.evaluate(()=>[0,1].every(i=>document.getElementById('skill'+i)!==null));
      if(!cooldownButtons)throw Error('Cooldown ring buttons missing');
      const homeFeatures=await page.evaluate(()=>['homeBrief','dailyBar'].every(id=>document.getElementById(id)!==null));
      if(!homeFeatures)throw Error('Home command center elements missing');
      const missionPreview=await page.evaluate(()=>document.querySelectorAll('.arcade-home .arcade-bottom button').length===5&&document.querySelectorAll('.arcade-subpage .arcade-bottom button').length===5&&document.querySelector('.arcade-play')!==null&&['homeWeaponDamage','homeWeaponRate','homeWeaponIcon'].every(id=>document.getElementById(id)!==null));
      if(!missionPreview)throw Error('Arcade lobby or weapon preview missing');
      const equipmentStyle=await page.evaluate(()=>{showPanel('armory');const ok=document.querySelectorAll('.equipment-item').length===4&&document.querySelector('.ref-equipment-layout')!==null&&document.querySelectorAll('.ref-slot-rail .meta-slot').length===6&&document.getElementById('subpage').classList.contains('active')&&!document.getElementById('home').classList.contains('active');showHome();return ok});
      if(!equipmentStyle)throw Error('Equipment inventory or unified arcade panel missing');
      const independentTabs=await page.evaluate(()=>{for(const tab of ['shop','armory','challenges','guild']){showPanel(tab);if(!document.getElementById('subpage').classList.contains('active')||document.getElementById('overlay').classList.contains('show')||document.getElementById('home').classList.contains('active'))return false;}showHome();return document.getElementById('home').classList.contains('active')&&!document.getElementById('subpage').classList.contains('active')});
      if(!independentTabs)throw Error('Bottom navigation is not independent full-screen pages');
      const baseMatchesRecording=await page.evaluate(()=>{showPanel('guild');const root=document.getElementById('subpageBody');const ok=!!root.querySelector('.recorded-pet-yard')&&root.querySelectorAll('.pet-yard-creature').length===3&&!root.textContent.includes('创建公会');showHome();return ok});
      if(!baseMatchesRecording)throw Error('Recorded pet base layout missing');
      const noFloatingShortcuts=await page.evaluate(()=>!document.getElementById('achievementBtn')&&!document.getElementById('challengeBtn')&&!document.querySelector('.arcade-quick'));
      if(!noFloatingShortcuts)throw Error('Duplicate floating achievement/challenge shortcuts still exist');
      const customIcons=await page.evaluate(()=>{const nav=document.querySelectorAll('.arcade-home .arcade-bottom button .cartoon-icon');const guild=document.querySelector('.arcade-home .arcade-bottom button:last-child .cartoon-icon');return nav.length===5&&!!guild&&guild.tagName.toLowerCase()==='svg'});
      if(!customIcons)throw Error('Original SVG navigation icons missing');
      const panelIcons=await page.evaluate(()=>{showPanel('armory');const armory=document.querySelectorAll('#subpageBody .equipment-icon .cartoon-icon').length;showPanel('shop');const shop=document.querySelectorAll('#subpageBody .shopitem .cartoon-icon').length;showHome();return {armory,shop}});
      if(panelIcons.armory<4)throw Error('Equipment cards must use vector icons');

      const release=await page.evaluate(()=>({
        expected:GAME_VERSION,
        badge:document.getElementById('gameVersionLabel')?.textContent,
        qa:window.__gameQA.version
      }));
      if(!release.expected||!release.badge?.includes(release.expected)||release.qa!==release.expected)throw Error('Version labels out of sync: '+JSON.stringify(release));
      // Verify the new player sprite atlas loads and actually paints non-transparent pixels.
      await page.waitForFunction(()=>typeof earthHeroAtlas!=='undefined' && earthHeroAtlas.complete && earthHeroAtlas.naturalWidth>0,null,{timeout:15000});
      const hero=await page.evaluate(()=>{
        const off=document.createElement('canvas');off.width=170;off.height=160;
        const c=off.getContext('2d');
        const rendered=drawSelectedHero(c,85,112,1,0);
        if(!drawEarthDefenseHero(c,85,112,1,0))throw Error('Legacy hero renderer is broken');
        const anchors=getHeroFrameAnchors();
        if(anchors.length!==6||anchors.some(row=>row.length!==8))throw Error('Hero anchor table shape invalid');
        for(const row of anchors)for(const a of row){
          if(!Number.isFinite(a.cx)||!Number.isFinite(a.bottom)||a.cx<0||a.cx>168||a.bottom<0||a.bottom>192)throw Error('Hero anchor invalid');
        }
        const blendActor={};
        const b0=heroFrameBlend(blendActor,0,0,1);
        const b1=heroFrameBlend(blendActor,0,1,1.1);
        const b2=heroFrameBlend(blendActor,0,1,1.135);
        const b3=heroFrameBlend(blendActor,0,1,1.2);
        if(b0.previous!==null||b1.previous!==0||b1.alpha!==0||b2.alpha<=0||b2.alpha>=1||b3.previous!==null)throw Error('Hero frame blending timeline invalid');
        const fastActor={};
        heroFrameBlend(fastActor,0,0,2);
        heroFrameBlend(fastActor,0,1,2.01);
        const interrupted=heroFrameBlend(fastActor,0,2,2.02);
        if(interrupted.previous!==0||interrupted.alpha!==0)throw Error('Rapid sprite blend interruption failed');
        // Dark rectangular atlas panels must not be treated as valid full-body poses.
        const cleaned=heroCleanCtx.getImageData(0,0,1344,1152).data;
        if(!heroCleanReady)throw Error('Hero atlas preprocessing did not finish');
        let visiblePixels=0,transparentPixels=0;
        for(let i=3;i<cleaned.length;i+=4){if(cleaned[i]>48)visiblePixels++;else transparentPixels++}
        if(visiblePixels<1000||transparentPixels<1000)throw Error('Hero atlas preprocessing erased or failed to isolate sprite art');
        let cleared=0;
        for(let row=3;row<6;row++)for(let col=0;col<8;col++){
          const i=((row*192+8)*1344+col*168+8)*4+3;
          if(cleaned[i]===0)cleared++;
        }
        if(cleared<8)throw Error('Atlas matte cleanup did not clear enough dark panel corners');
        const safe=getHeroSafeFrames();
        if(nearestHeroFrame([0,3,7],4,8)!==3)throw Error('Nearest-frame selection failed');
        if(nearestHeroFrame([0,3,7],6,8)!==7)throw Error('Frame wrap selection failed');
        const fake={moving:0,fireAnim:0,hitAnim:0,dashTime:0,deadAnim:false};
        const start=heroAnimation(fake,10);
        const progress=heroAnimation(fake,10.2);
        fake.moving=1;
        const transition=heroAnimation(fake,10.3);
        if(start.elapsed!==0||progress.elapsed<=0||transition.elapsed!==0||transition.state!=='run')throw Error('Hero state clock failed');
        if(!safe[0].length)throw Error('Missing safe idle fallback');
        if(safe.length!==6||safe.some(row=>row.some(col=>!Number.isInteger(col)||col<0||col>7)))throw Error('Invalid hero frame index');
        for(const row of [0,1,2]){
          const frames=safe[row].length?safe[row]:safe[0];
          const chosen=nearestHeroFrame(frames,3,8);
          if(!frames.includes(chosen))throw Error('Frame selector escaped safe list');
        }
        if(safe[0].length===0)throw Error('Idle fallback unavailable');
        if(!Array.isArray(safe)||safe.length!==6||safe.some(row=>row.some(f=>f<0||f>7)))throw Error('Invalid sprite safety map');
        const states=['idle','run','shoot','hurt','dash','death'];
        // Reduced-motion rendering must remain valid for every gameplay state.
        const previousReduced=settings.reducedMotion;
        try{
          settings.reducedMotion=true;
          const oldReducedGame=game;
          try{
            for(const state of states){
              game={player:{moving:state==='run'?1:0,fireAnim:state==='shoot'?.2:0,hitAnim:state==='hurt'?.2:0,dashTime:state==='dash'?.2:0,deadAnim:state==='death',deathTime:.1,facing:1}};
              if(!drawSelectedHero(c,85,112,1,.2))throw Error('Reduced-motion hero failed: '+state);
            }
          }finally{game=oldReducedGame}
        }finally{settings.reducedMotion=previousReduced}
        const gunCanvas=document.createElement('canvas');gunCanvas.width=170;gunCanvas.height=160;
        const gunCtx=gunCanvas.getContext('2d');
        const oldGameForFire=game;
        try{
          for(const moving of [0,1]){
            for(const facing of [-1,1]){
              game={player:{moving,fireAnim:.2,hitAnim:0,dashTime:0,deadAnim:false,facing}};
              gunCtx.clearRect(0,0,170,160);
              if(!drawSelectedHero(gunCtx,85,112,1,.3))throw Error('Shooting render failed');
              if(!gunCtx.getImageData(0,0,170,160).data.some((v,i)=>i%4===3&&v>32))throw Error('Empty shooting render');
            }
          }
        }finally{game=oldGameForFire}
        const oldGame=game;
        try{
          for(const state of states){
            const actor={moving:state==='run'?1:0,fireAnim:state==='shoot'?.2:0,hitAnim:state==='hurt'?.2:0,dashTime:state==='dash'?.2:0,deadAnim:state==='death',deathTime:.1,facing:1};
            game={player:actor};
            ctx.save();
            try{if(!drawSelectedHero(ctx,85,112,1,.2))throw Error('Cannot draw '+state)}
            finally{ctx.restore()}
          }
        }finally{game=oldGame}
        const pixels=c.getImageData(0,0,170,160).data;
        let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>32)opaque++;
        return {rendered,opaque,width:earthHeroAtlas.naturalWidth,height:earthHeroAtlas.naturalHeight};
      });
      if(!hero.rendered||hero.opaque<1000||hero.width!==1344||hero.height!==1152){
        failed=true;console.error('Hero atlas integration failed',hero);
      }else console.log(viewport.width+'px: HERO ATLAS PASS ('+hero.opaque+' nontransparent pixels)');

      // Stress the actual on-screen renderer with crowded mobile and desktop battle objects.
      // This records a repeatable CI diagnostic; it is not an iPhone FPS claim.
      const stress=await page.evaluate(()=>{
        showHome();startGame('normal');
        const p=game.player,count=140,range=Math.min(innerWidth*.62,420);
        for(let i=0;i<count;i++){
          spawnEnemy(i%5===0?2:0);
          const e=game.enemies[game.enemies.length-1],a=i*2.39996,r=20+(i%13)/13*range;
          e.x=p.x+Math.cos(a)*r;e.y=p.y+Math.sin(a)*r;
        }
        for(let i=0;i<260;i++){
          const a=i*2.39996;fireBullet(p.x,p.y,Math.cos(a),Math.sin(a),p.damage);
        }
        for(let i=0;i<250;i++){
          const a=i*2.39996,r=25+(i%15)/15*range;
          game.drops.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,xp:2,r:5});
        }
        paused=true;render();
        const times=[];
        for(let i=0;i<12;i++){let t=performance.now();render();times.push(performance.now()-t)}
        const max=Math.max(...times),avg=times.reduce((a,b)=>a+b,0)/times.length;

        const cacheState=window.__terrainComposite;
        const reused=cacheState.hits>=11,buildBefore=cacheState.builds;
        p.x+=230;render();
        const rebuildsOnMove=cacheState.builds>buildBefore;
        const alpha=ctx.getImageData(Math.floor(W*.26),Math.floor(H*.28),1,1).data[3];
        p.x-=230;render();
        if(!reused||!rebuildsOnMove||alpha===0)
          throw Error('Terrain framebuffer is stale or transparent: '+JSON.stringify({reused,rebuildsOnMove,alpha}));
        console.log('TERRAIN SCROLL CACHE PASS '+window.innerWidth+'px hits='+cacheState.hits+' builds='+cacheState.builds);
        const counts={enemies:game.enemies.length,bullets:game.bullets.length,drops:game.drops.length};
        const cache=window.__terrainCache?.size||0;
        showHome();
        return {avgMs:Number(avg.toFixed(2)),worstMs:Number(max.toFixed(2)),cache,...counts};
      });
      if(stress.enemies<120||stress.bullets<230||stress.drops<220||stress.cache<1||stress.cache>18||
         !Number.isFinite(stress.avgMs)||stress.avgMs>250)
        throw Error('Crowded battle performance/capacity regression: '+JSON.stringify(stress));
      console.log('PERFORMANCE STRESS PASS '+viewport.width+'px: '+JSON.stringify(stress));

      const result=await page.evaluate(()=>window.__gameQA.run());
      console.log(viewport.width+'px: '+result.passed+'/'+result.total);
      for(const r of result.results)console.log((r.ok?'PASS':'FAIL')+' '+r.name+(r.error?' — '+r.error:''));
      if(result.passed!==result.total||errors.length){failed=true;console.error('Runtime errors:',errors)}
    }catch(e){failed=true;console.error(e)}
    if(failed){fs.mkdirSync('tests/screenshots',{recursive:true});await page.screenshot({path:'tests/screenshots/'+viewport.width+'.png',fullPage:true}).catch(()=>{})}
    await page.close();
  }

  // Reproduce the real "Start Game → black iris → combat" route from the user's video.
  // Separate page prevents animation timer interference with other established smoke tests.
  const transitionPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
    await transitionPage.goto('http://127.0.0.1:8765/?smoke=1&introtest=1',{waitUntil:'load'});
    const initial=await transitionPage.evaluate(()=>{
      startGame('normal');
      const el=document.getElementById('recordedBattleEntry');
      return {active:window.__battleEntryQA?.active,paused,
        screen:!!game&&document.getElementById('hud').classList.contains('active'),
        duration:window.__battleEntryQA?.duration,
        overlay:!!el&&getComputedStyle(el).display==='block'};
    });
    if(!initial.active||!initial.paused||!initial.screen||!initial.overlay||
       initial.duration<1400||initial.duration>1900)
      throw Error('Reference black iris transition not active after start: '+JSON.stringify(initial));
    await transitionPage.waitForTimeout(120);
    const closing=await transitionPage.evaluate(()=>{
      const overlay=document.getElementById("recordedBattleEntry");
      const c=overlay.querySelector("canvas"),x=c.getContext("2d");
      const data=x.getImageData(0,0,c.width,c.height).data;
      let warm=0,dark=0;
      for(let y=20;y<c.height-20;y+=30)for(let px=15;px<c.width-15;px+=30){
        const i=(y*c.width+px)*4,R=data[i],G=data[i+1],B=data[i+2];
        if(R>100&&R>G*1.2&&G>B*1.2)warm++;
        if(R<12&&G<12&&B<12)dark++;
      }
      return {warm,dark,active:overlay.classList.contains('active')};
    });
    if(!closing.active||closing.warm<2||closing.dark<2)
      throw Error('Recorded start should close with visible chapter art and expanding black blobs, never instant black: '+JSON.stringify(closing));
    await transitionPage.screenshot({path:require('node:path').join(__dirname,'screenshots','recorded-entry-closing-390.png')});
    console.log('RECORDED CLOSE-IRIS PASS: visible source chapter plus black expansion '+JSON.stringify(closing));
    await transitionPage.waitForTimeout(430);
    const midway=await transitionPage.evaluate(()=>({
      black:document.getElementById('recordedBattleEntry').classList.contains('active'),
      paused,timer:game?.t,
      pixel:document.querySelector('.entry-pixel')?.classList.contains('active')
    }));
    if(!midway.black||!midway.paused||midway.timer!==0||!midway.pixel)
      throw Error('Black screen and center icon should be visible with frozen game time: '+JSON.stringify(midway));
    await transitionPage.screenshot({path:require('node:path').join(__dirname,'screenshots','recorded-entry-black-390.png')});
    await transitionPage.waitForFunction(()=>!window.__battleEntryQA.active,{timeout:5000});
    const finished=await transitionPage.evaluate(()=>({game:!!game,paused,time:game?.t,black:window.__battleEntryQA.active}));
    if(!finished.game||finished.paused||finished.black)
      throw Error('Reference transition did not hand control to the real game: '+JSON.stringify(finished));
    await transitionPage.evaluate(()=>{showHome();startGame('normal')});
    await transitionPage.evaluate(()=>showHome());
    const cancelled=await transitionPage.evaluate(()=>({active:window.__battleEntryQA.active,home:document.getElementById('home').classList.contains('active')}));
    if(cancelled.active||!cancelled.home)throw Error('Return-home must cancel lingering loading animation: '+JSON.stringify(cancelled));
    console.log('REFERENCE START IRIS PASS: black entry, rotating icon, frozen game time, reveal and cancellation');
  }catch(e){failed=true;console.error(e)}
  finally{await transitionPage.close()}


  // Video 00:01 shows a specific three-choice loadout. Verify the live system, not a mockup.
  const skillPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
    await skillPage.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
    await skillPage.evaluate(()=>startGame('normal'));
    await skillPage.waitForFunction(()=>!!game?.firstChoiceDone&&!!modalOpen&&game.offered?.length===3,{timeout:4500});
    const offered=await skillPage.evaluate(()=>({
      ids:game.offered.slice(),names:game.offered.map(id=>upgrades.find(u=>u.id===id)?.name),
      art:document.querySelectorAll('.upgrade-option .recorded-skill-art').length,
      realCards:document.querySelectorAll('.upgrade-option button.choice').length,
      imageReady:getComputedStyle(document.querySelector('.upgrade-head')).backgroundImage.includes('data:image/png;base64')
    }));
    if(offered.ids.join(',')!=='lightning,durian,duel'||offered.art!==3||offered.realCards!==3||!offered.imageReady)
      throw Error('Recorded three-card skill UI is not faithful/interactive: '+JSON.stringify(offered));

    await skillPage.screenshot({path:require('node:path').join(__dirname,'screenshots','recorded-first-three-390.png')});
    const firstThreeGeometry=await skillPage.evaluate(()=>{
      const box=selector=>{const r=document.querySelector(selector).getBoundingClientRect();
        return {x:r.x/innerWidth,y:r.y/innerHeight,w:r.width/innerWidth,h:r.height/innerHeight}};
      const cards=[...document.querySelectorAll('.upgrade-option')].map(el=>{
        const r=el.getBoundingClientRect();return {x:r.x/innerWidth,y:r.y/innerHeight,w:r.width/innerWidth,h:r.height/innerHeight};
      });
      return {head:box('.upgrade-head'),cards,visibleText:[...document.querySelectorAll('.upgrade-option strong')].map(x=>x.textContent)};
    });
    if(firstThreeGeometry.cards.length!==3||
       firstThreeGeometry.visibleText.join(',')!=='雷电发射器,榴莲,决斗'||
       firstThreeGeometry.cards.some(x=>x.y<.34||x.y>.43||x.h<.24||x.h>.35))
      throw Error('Recorded first three skill geometry or visible text mismatch: '+JSON.stringify(firstThreeGeometry));
    console.log('SOURCE FIRST THREE SKILLS GEOMETRY PASS '+JSON.stringify(firstThreeGeometry));
    const durian=await skillPage.evaluate(()=>{
      pickUpgrade('durian');
      game.player.shoot=999;game.spawn=999;game.eliteAt=999;
      update(.04);
      return {rank:game.player.durian||0,count:game.recordedDurians?.length||0};
    });
    if(durian.rank!==1||durian.count<1)throw Error('Durian was a decorative skill, not a real projectile: '+JSON.stringify(durian));
    const duel=await skillPage.evaluate(()=>{
      showHome();startGame('normal');
      game.pending=1;game.offered=['duel','durian','lightning'];renderUpgradeModal();pickUpgrade('duel');
      game.spawn=999;game.eliteAt=999;game.player.shoot=999;spawnEnemy(4);
      const e=game.enemies.find(x=>x.type===4);game.player.duelCd=4.99;update(.04);
      const marked=e.duelWeak>0,old=e.hp;damageEnemy(e,10);
      return {rank:game.player.duel||0,marked,bonusDamage:old-e.hp};
    });
    if(duel.rank!==1||!duel.marked||duel.bonusDamage<=10)
      throw Error('Duel weakness was cosmetic, not an actual damage modifier: '+JSON.stringify(duel));
    console.log('RECORDED STARTER SKILLS PASS: exact three names, source-video banner, vector art and real durian/duel combat');
  }catch(e){failed=true;console.error(e)}
  finally{await skillPage.close()}


  // PUBLIC 5.4.0 feature-category implementation checks. These are original local mechanics:
  // verify actual input -> battle -> reward -> save, not the presence of decorative labels.
  const expandPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
    await expandPage.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
    const screens=await expandPage.evaluate(()=>{
      if(!window.__expansionQA||window.__expansionQA.version!=='16.0')throw Error('v16 runtime module unavailable');
      showPanel('challenges');
      const hub=document.querySelectorAll('.expansion-hub button').length;
      showPanel('vehicles');
      const vehicle=document.querySelector('.expansion-mech')!==null;
      showPanel('chapters');
      const chapters=document.querySelectorAll('.expansion-card').length;
      const chaptersInitiallyLocked=document.querySelectorAll('.expansion-card.locked').length;
      showPanel('regions');
      const zones=document.querySelectorAll('.expansion-card').length;
      return {hub,vehicle,chapters,chaptersInitiallyLocked,zones};
    });
    if(screens.hub!==3||!screens.vehicle||screens.chapters!==5||screens.chaptersInitiallyLocked!==4||screens.zones!==5)
      throw Error('v16 module screens or gated progression missing: '+JSON.stringify(screens));
    await expandPage.screenshot({path:require('node:path').join(__dirname,'screenshots','v16-regional-missions-390.png')});
    await expandPage.evaluate(()=>showPanel('vehicles'));
    await expandPage.screenshot({path:require('node:path').join(__dirname,'screenshots','v16-mecha-390.png')});
    const tested=await expandPage.evaluate(()=>{
      showHome();
      window.expansionVehicleTrial();
      const g=game;
      if(!g?.vehicleEnabled||!g.vehicleTrial||g.vehicleLevel!==1)throw Error('Trial cannot enter a real vehicle battle');
      g.spawn=999;g.eliteAt=999;spawnEnemy(0);
      g.vehicleCd=.01;update(.04);
      if(g.vehicleCd<=0)throw Error('Vehicle targeting attack did not trigger');
      showHome();
      // Test-only resources: local page context is isolated from the user's actual save.
      save.vehicleParts=1000;save.petCores=1000;
      window.expansionVehicleUpgrade();
      if(!save.vehicleOwned||!save.vehicleEquipped||save.vehicleLevel!==1)throw Error('Purchase did not unlock and equip');
      window.expansionVehicleUpgrade();
      if(save.vehicleLevel!==2)throw Error('Vehicle upgrade did not consume resources and raise level');
      showHome();startGame('normal');
      const vehicleEnabled=game.vehicleEnabled&&game.vehicleLevel===2;
      for(let i=0;i<50;i++)fireBullet(0,0,1,0,10);
      const stacks=game.vehicleStacks,shotCount=game.vehicleShots;
      if(!vehicleEnabled||stacks!==1||shotCount!==50)throw Error('Vehicle combat passive not applied: '+stacks+'/'+shotCount);
      showHome();showPanel('chapters');
      window.launchExpansionStage('chapter',357);
      if(game)throw Error('Locked chapter started despite missing predecessor');
      window.launchExpansionStage('chapter',356);
      if(!game||game.expedition?.id!==356)throw Error('Chapter launch not wired');
      game.spawn=999;spawnEnemy(0);
      const e=game.enemies.find(e=>e.type===0);
      if(!e||e.maxHp<=35)throw Error('Chapter enemy health modifier not applied');
      game.kills=25;game.bosses=3;game.t=600;game.finalBossDefeated=true;
      endGame(true);
      const cleared=save.chapterWins.includes(356),bonus=game.rewardSnapshot.vehicleParts;
      if(!cleared||!Number.isFinite(bonus)||bonus<20)throw Error('Chapter clear reward was not persisted');
      showHome();showPanel('chapters');window.launchExpansionStage('chapter',357);
      if(!game||game.expedition?.id!==357)throw Error('Next chapter not unlocked after clear');
      showHome();showPanel('regions');
      window.launchExpansionStage('zone',2);
      if(game)throw Error('Locked regional mission started');
      window.launchExpansionStage('zone',1);
      if(!game||game.expedition?.type!=='zone')throw Error('Zone 1 launch failed');
      game.kills=80;game.bosses=3;game.t=600;game.finalBossDefeated=true;
      endGame(true);
      if(!save.zoneWins.includes(1)||!save.zonePoints||save.zoneBest[1]!==80)throw Error('Zone rewards and score not stored');
      const saved=JSON.parse(localStorage.getItem(saveKey));
      if(!saved||!saved.chapterWins.includes(356)||!saved.zoneWins.includes(1)||!saved.vehicleOwned||saved.vehicleLevel!==2)
        throw Error('Storage persistence failed after reward');
      return {screens:3,vehicleLevel:save.vehicleLevel,stacks,chapters:save.chapterWins.slice(),zones:save.zoneWins.slice(),zonePoints:save.zonePoints,persisted:true};
    });
    console.log('V16 EXPANSION REAL GAMEPLAY PASS: '+JSON.stringify(tested));
    await expandPage.evaluate(()=>{showHome();window.expansionVehicleTrial();render()});
    await expandPage.screenshot({path:require('node:path').join(__dirname,'screenshots','v16-vehicle-battle-390.png')});
    const mechaRender=await expandPage.evaluate(()=>({active:!!game?.vehicleEnabled,overlay:typeof window.__expansionVehicleVisualQA==='function',meter:!!document.querySelector('#expansionBattleBadge')}));
    if(!mechaRender.active||!mechaRender.overlay||!mechaRender.meter)
      throw Error('Equipped vehicle does not render in actual battle: '+JSON.stringify(mechaRender));

  }catch(e){failed=true;console.error(e)}
  finally{await expandPage.close()}


  const collectionPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
    await collectionPage.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
    const collection=await collectionPage.evaluate(()=>{
      showPanel('collectionList');
      const count=document.querySelectorAll('.collection-gallery-card').length;
      const falselyOwned=document.querySelectorAll('.collection-gallery-card.owned').length;
      if(count!==24||falselyOwned!==0)throw Error('Collection still marks unearned items as owned: '+count+'/'+falselyOwned);
      save.collectionShards=500;save.collectionOwned.arc=1;save.collectionDuplicate.arc=3;
      window.rankCollectionItem('arc');
      const rank=save.collectionOwned.arc;
      const afterRank=save.collectionShards;
      if(rank!==2||afterRank!==486)throw Error('Collection star upgrade not using real materials');
      window.dismantleAllCollectionDuplicates();
      if(save.collectionDuplicate.arc||save.collectionShards!==498)throw Error('Duplicate dismantle did not convert inventory');
      const value=window.__collectionQA.bonus();
      showHome();startGame('normal');
      const buffed=game.player.damage>weapons[save.weapon].damage&&value.attack>0;
      if(!buffed)throw Error('Owned collection did not affect combat damage');
      game.kills=80;game.bosses=1;endGame(false);
      const shardsFromBattle=game.rewardSnapshot.collectionShards;
      const realDrop=!!game.rewardSnapshot.collectionDrop;
      if(!shardsFromBattle||!realDrop)throw Error('Battle collection drop missing');
      showHome();
      const beforeTreasure=save.collectionTreasures||0;
      window.forgeCollectionTreasure();
      if(save.collectionTreasures!==beforeTreasure)throw Error('Treasure gate should remain closed under 18 legendaries');
      for(const def of window.__collectionQA.defs.slice(0,18))save.collectionOwned[def.id]=5;
      save.collectionShards=250;window.forgeCollectionTreasure();
      if(save.collectionTreasures!==1||save.collectionShards!==175)throw Error('18-item treasure crafting is nonfunctional');
      showPanel('collectionList');
      const legendary=document.querySelectorAll('.collection-gallery-card.legend').length;
      const snapshot=JSON.parse(localStorage.getItem(saveKey));
      if(legendary!==18||snapshot.collectionTreasures!==1||snapshot.collectionOwned.arc!==5)
        throw Error('Real collectible collection is not saved / rendered');
      return {count,firstRank:rank,shardsFromBattle,realDrop,legendary,treasures:save.collectionTreasures,permanentAttack:Math.round(value.attack*1000)/10};
    });
    await collectionPage.screenshot({path:require('node:path').join(__dirname,'screenshots','v16-collection-gallery-390.png')});
    await collectionPage.reload({waitUntil:'load'});
    const persisted=await collectionPage.evaluate(()=>save.collectionTreasures===1&&save.collectionOwned.arc===5&&save.collectionDuplicate.arc===0);
    if(!persisted)throw Error('Collection progression did not survive browser reload');
    console.log('V16 COLLECTION REAL PROGRESSION PASS: '+JSON.stringify(collection));
  }catch(e){failed=true;console.error(e)}
  finally{await collectionPage.close()}


  // Permanent pre-5.x loops: real offline patrol, quick patrol stamina, missions, pass and save.
  // Use a dedicated page so the established 95 game-logic assertions retain their own state.
  const activityPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
    await activityPage.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
    const result=await activityPage.evaluate(()=>{
      const qa=window.__activityQA,read=()=>qa.read();
      if(!qa||document.getElementById('referenceLobby').classList.contains('missing'))throw Error('Activity extension did not initialize');
      const a=qa.ensure();
      save.unlimitedCoins=false;save.coins=250;save.vehicleParts=4;save.gearParts=7;
      a.patrol.last=Date.now()-91*60000;
      const minutes=qa.patrolMinutes();
      showPanel('patrol');
      const patrolButton=!!document.querySelector('.activity-page .activity-button');
      const before={coins:save.coins,parts:save.gearParts,vehicle:save.vehicleParts};
      const claimed=window.claimActivityPatrol();
      const after={coins:save.coins,parts:save.gearParts,vehicle:save.vehicleParts};
      const refusedDuplicate=!window.claimActivityPatrol();
      const previousEnergy=qa.read().energy.value;
      const quick=window.claimActivityQuickPatrol();
      const energy=qa.read().energy.value;
      showPanel('missions');
      const missionUI=document.querySelectorAll('.activity-card').length===5;
      qa.record({runs:1,kills:150,bosses:2,wins:1});
      const daily=window.claimActivityMission('daily','hunt');
      const refusedMissionDuplicate=!window.claimActivityMission('daily','hunt');
      const weekly=window.claimActivityMission('weekly','kills')===false;
      const patTask=window.claimActivityMission('daily','patrol');
      const playTask=window.claimActivityMission('daily','play');
      const seasonXp=qa.read().season.xp;
      const passClaim=window.claimActivitySeason(1);
      const refusedPassDuplicate=!window.claimActivitySeason(1);
      showPanel('challenges');
      const activityHub=document.querySelectorAll('.activity-hub button').length;
      const beforeBattle=qa.read().daily.counts.runs;
      showHome();startGame('normal');game.kills=14;game.bosses=1;endGame(false);
      const afterBattle=qa.read().daily.counts.runs;
      showHome();
      persist();
      return {minutes,patrolButton,claimed,before,after,refusedDuplicate,quick,previousEnergy,energy,
        missionUI,daily,refusedMissionDuplicate,weekly,patTask,playTask,seasonXp,passClaim,refusedPassDuplicate,
        activityHub,beforeBattle,afterBattle,partsNow:save.gearParts,saveRecord:localStorage.getItem(saveKey)};
    });
    if(result.minutes<90||!result.patrolButton||!result.claimed||
      result.after.coins<=result.before.coins||result.after.parts<=result.before.parts||
      !result.refusedDuplicate||!result.quick||result.energy!==result.previousEnergy-8||
      !result.missionUI||!result.daily||!result.refusedMissionDuplicate||
      !result.weekly||!result.patTask||!result.playTask||result.seasonXp<60||!result.passClaim||
      !result.refusedPassDuplicate||result.activityHub!==3||
      result.afterBattle!==result.beforeBattle+1||!result.saveRecord)
      throw Error('Activity reward/patrol/mission/battle regression: '+JSON.stringify({...result,saveRecord:!!result.saveRecord}));
    await activityPage.reload({waitUntil:'load'});
    const afterReload=await activityPage.evaluate(()=>{
      const a=window.__activityQA?.read();
      return {claimed:a?.daily?.claimed||[],seasonClaimed:a?.season?.claimed||[],
        dailyRuns:a?.daily?.counts?.runs,energy:a?.energy?.value,parts:save.gearParts};
    });
    if(!afterReload.claimed.includes('hunt')||!afterReload.seasonClaimed.includes(1)||
       !afterReload.claimed.includes('patrol')||afterReload.dailyRuns<2||
       afterReload.energy>22||afterReload.parts<=7)
      throw Error('Activity localStorage persistence failed: '+JSON.stringify(afterReload));
    await activityPage.evaluate(()=>showPanel('patrol'));
    await activityPage.screenshot({path:require('node:path').join(__dirname,'screenshots','activity-patrol-390.png')});
    await activityPage.evaluate(()=>showPanel('missions'));
    await activityPage.screenshot({path:require('node:path').join(__dirname,'screenshots','activity-missions-390.png')});
    console.log('ACTIVITY PERSISTENCE LOOP PASS: offline claim, one-time guards, 8 stamina, daily/week, battle progress, season claim and reload');
  }catch(e){failed=true;console.error(e)}
  finally{await activityPage.close()}


  // Historical special-operations path: no fake menu; actual timed battle objectives.
  const opsPage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
    await opsPage.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
    const result=await opsPage.evaluate(()=>{
      if(!window.__specialOpsQA||window.__specialOpsQA.defs.length!==3)throw Error('SpecialOps module missing');
      save.gems=100;save.unlimitedCoins=false;
      showPanel('challenges');
      const link=document.querySelector('button[onclick="showPanel(\'specialOps\')"]');
      if(!link)throw Error('No entry in challenges');
      showPanel('specialOps');
      const cards=document.querySelectorAll('.ops-card').length;
      const launched=window.startSpecialOp(0);
      const initial=!!game?.specialOp&&game.specialOp.target===25;
      if(!launched||!initial)throw Error('No actual special battle');
      game.kills=25;
      update(.016);
      const won=!!game?.settled,cleared=window.__specialOpsQA.read().cleared.includes('sweep');
      const gemsAfter=save.gems;
      showHome();const replay=window.startSpecialOp(0);
      game.kills=25;update(.016);
      const gemsReplay=save.gems;
      showHome();
      const loseLaunch=window.startSpecialOp(1);
      game.specialOp.elapsed=game.specialOp.limit-.001;
      update(.016);
      const lost=!!game?.settled&&!window.__specialOpsQA.read().cleared.includes('breach');
      const attempts=window.__specialOpsQA.read().attempts;
      showHome();showPanel('specialOps');persist();
      return {cards,launched,initial,won,cleared,gemsAfter,replay,gemsReplay,loseLaunch,lost,attempts};
    });
    if(result.cards!==3||!result.launched||!result.initial||!result.won||!result.cleared||
      result.gemsAfter!==103||!result.replay||result.gemsReplay!==result.gemsAfter||
      !result.loseLaunch||!result.lost||result.attempts.sweep!==2||result.attempts.breach!==1)
      throw Error('SpecialOps actual win/loss or claim guard broken: '+JSON.stringify(result));
    await opsPage.screenshot({path:require('node:path').join(__dirname,'screenshots','special-operations-390.png')});
    await opsPage.reload({waitUntil:'load'});
    const saved=await opsPage.evaluate(()=>window.__specialOpsQA.read());
    if(!saved.cleared.includes('sweep')||saved.cleared.includes('breach')||saved.attempts.sweep!==2)
      throw Error('SpecialOps daily persistence broken '+JSON.stringify(saved));
    console.log('SPECIAL OPS REAL BATTLE PASS: daily entry, 3 contracts, 25-kill win, timed loss, one-time gems and reload');
  }catch(e){failed=true;console.error(e)}
  finally{await opsPage.close()}


  const forgePage=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  try{
    await forgePage.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
    const crafted=await forgePage.evaluate(()=>{
      if(!window.__forgeQA)throw Error('Forge system missing');
      save.gearParts=600;save.petCores=120;save.vehicleParts=100;
      const main=makeGear('nova_armor',3),donor=makeGear('fort_armor',3);
      if(!main||!donor)throw Error('Legendary gear creation failed');
      equipGear(main.uid);window.__forgeQA.focus(main.uid);showPanel('forge');
      const panel=!!document.querySelector('.forge-page'),base=gearValue(main),bonusBefore=gearBonuses().hp;
      const forge1=window.forgeUpgrade(),forge2=window.forgeUpgrade(),forge3=window.forgeUpgrade();
      const afterForge=gearValue(main),bonusAfter=gearBonuses().hp;
      const xeno=window.xenoUpgrade(),afterXeno=gearValue(main);
      const blockedSalvage=!salvageGear(main.uid);
      const fuse=window.fusionApply(donor.uid),donorConsumed=!save.gearInventory.some(x=>x.uid===donor.uid);
      const afterFusion=gearValue(main);
      persist();showPanel('forge');
      return {main:main.uid,donor:donor.uid,panel,base,bonusBefore,forge1,forge2,forge3,afterForge,bonusAfter,
        xeno,afterXeno,blockedSalvage,fuse,donorConsumed,afterFusion};
    });
    if(!crafted.panel||!crafted.forge1||!crafted.forge2||!crafted.forge3||!crafted.xeno||
       !crafted.fuse||!crafted.donorConsumed||!crafted.blockedSalvage||
       crafted.afterForge<=crafted.base||crafted.bonusAfter<=crafted.bonusBefore||
       crafted.afterXeno<=crafted.afterForge||crafted.afterFusion<=crafted.afterXeno)
      throw Error('Forge real item stats / crafting failed: '+JSON.stringify(crafted));
    await forgePage.screenshot({path:require('node:path').join(__dirname,'screenshots','forge-progression-390.png')});
    await forgePage.reload({waitUntil:'load'});
    const restored=await forgePage.evaluate(uid=>{
      const item=save.gearInventory.find(i=>i.uid===uid),state=window.__forgeQA.read();
      const retained=!!item&&state.forge[uid]===3&&state.xeno[uid]===1&&!!state.fusion[uid];
      window.__forgeQA.focus(uid);
      const undo=window.fusionUndo(),xenoReturn=window.xenoReset(),forgeReturn=window.forgeReset();
      const clean=window.__forgeQA.read();
      const donorExists=save.gearInventory.some(i=>i.uid===state.fusion[uid].uid);
      persist();
      return {retained,undo,xenoReturn,forgeReturn,donorExists,afterReturn:gearValue(item),
        forge:clean.forge[uid]||0,xeno:clean.xeno[uid]||0,fused:!!clean.fusion[uid],
        parts:save.gearParts,cores:save.petCores,vehicle:save.vehicleParts};
    },crafted.main);
    if(!restored.retained||!restored.undo||!restored.xenoReturn||!restored.forgeReturn||
       !restored.donorExists||restored.afterReturn!==crafted.base||
       restored.forge||restored.xeno||restored.fused||
       restored.parts!==600||restored.cores!==120||restored.vehicle!==100)
      throw Error('Forge reload / refunds / fusion rollback failed: '+JSON.stringify(restored));
    console.log('FORGE AND XENO REVERSIBILITY PASS: stats, 3 forge ranks, xeno rank, fusion, materials, reload, dismantle guard, full refunds');
  }catch(e){failed=true;console.error(e)}
  finally{await forgePage.close()}

  // Genuine simultaneous two-contact input, not synthetic DOM PointerEvents.
  // Desktop layout intentionally hides the joystick, so exercise a touch-enabled mobile context.
  const touchContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const touchPage=await touchContext.newPage();
  try{
    await touchPage.goto('http://127.0.0.1:8765/?smoke=1',{waitUntil:'load'});
    await touchPage.evaluate(()=>startGame('normal'));
    const joyRect=await touchPage.locator('#joystick').boundingBox();
    const skillRect=await touchPage.locator('#skill0').boundingBox();
    if(!joyRect?.width||!skillRect?.width)throw Error('Touch controls not visible on mobile');
    const jx=joyRect.x+joyRect.width/2,jy=joyRect.y+joyRect.height/2;
    const sx=skillRect.x+skillRect.width/2,sy=skillRect.y+skillRect.height/2;
    const contact=(id,x,y)=>({id,x,y,radiusX:2,radiusY:2,force:1});
    await touchPage.evaluate(()=>{
      window.__touchTrace=[];
      for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','touchstart','touchmove','touchend','touchcancel']){
        document.addEventListener(type,e=>window.__touchTrace.push({type,target:e.target?.id,pointerId:e.pointerId,changed:e.changedTouches?Array.from(e.changedTouches).map(t=>t.identifier):null,touches:e.touches?Array.from(e.touches).map(t=>t.identifier):null,joyId:joy.id,touchId:joy.touchId}),true);
      }
    });
    const session=await touchContext.newCDPSession(touchPage);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact(11,jx,jy)]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact(11,jx+joyRect.width*.25,jy)]});
    const joystickBefore=await touchPage.evaluate(()=>({id:joy.id,touchId:joy.touchId,x:joy.x,y:joy.y}));
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact(11,jx+joyRect.width*.25,jy),contact(12,sx,sy)]});
    const both=await touchPage.evaluate(()=>({id:joy.id,touchId:joy.touchId,x:joy.x,cooldown:game.player.skillCd[0]}));
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[contact(12,sx,sy)]});
    const afterSkill=await touchPage.evaluate(()=>({id:joy.id,touchId:joy.touchId,x:joy.x}));
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[contact(11,jx+joyRect.width*.25,jy)]});
    const finished=await touchPage.evaluate(()=>({id:joy.id,touchId:joy.touchId,x:joy.x,y:joy.y}));
    if(!(joystickBefore.id!==null&&joystickBefore.x>.15&&both.id===joystickBefore.id&&both.x>.15&&both.cooldown>0&&afterSkill.id===joystickBefore.id&&afterSkill.x>.15&&finished.id===null&&finished.x===0&&finished.y===0)){
      const trace=await touchPage.evaluate(()=>window.__touchTrace);throw Error('Dual-finger mobile input regression: '+JSON.stringify({joystickBefore,both,afterSkill,finished,trace}));
    }
    console.log('MOBILE REAL MULTITOUCH PASS: joystick pointer held during simultaneous skill touch');

    // World touch should relocate the stick to the actual finger, unlike a fixed bottom-left controller.
    const floatingStart=contact(31,292,506);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[floatingStart]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact(31,327,506)]});
    const floating=await touchPage.evaluate(()=>{
      const stick=document.getElementById('joystick'),rect=stick.getBoundingClientRect();
      return {active:window.__floatingJoystickQA.active,left:rect.left,top:rect.top,id:joy.id,touchId:joy.touchId,x:joy.x};
    });
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(!floating.active||Math.abs(floating.left-292+floatingStart.radiusX)>90||
       !Number.isFinite(floating.top)||floating.x<.2)
      throw Error('Floating joystick should follow world contact: '+JSON.stringify(floating));
    console.log('MOBILE FLOATING JOYSTICK PASS: world touch relocates virtual controller and drives movement');

  }catch(e){failed=true;console.error(e)}
  finally{await touchContext.close()}
  await browser.close();
  if(failed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
