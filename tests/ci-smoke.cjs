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
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
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
      const result=await page.evaluate(()=>window.__gameQA.run());
      console.log(viewport.width+'px: '+result.passed+'/'+result.total);
      for(const r of result.results)console.log((r.ok?'PASS':'FAIL')+' '+r.name+(r.error?' — '+r.error:''));
      if(result.passed!==result.total||errors.length){failed=true;console.error('Runtime errors:',errors)}
    }catch(e){failed=true;console.error(e)}
    if(failed){fs.mkdirSync('tests/screenshots',{recursive:true});await page.screenshot({path:'tests/screenshots/'+viewport.width+'.png',fullPage:true}).catch(()=>{})}
    await page.close();
  }
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
  }catch(e){failed=true;console.error(e)}
  finally{await touchContext.close()}
  await browser.close();
  if(failed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
