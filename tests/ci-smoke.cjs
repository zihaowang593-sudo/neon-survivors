const { chromium } = require('playwright');
const fs = require('node:fs');
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
      const comboHud=await page.evaluate(()=>document.getElementById('comboHud')!==null);
      if(!comboHud)throw Error('Combo HUD missing');
      const threatHud=await page.evaluate(()=>document.getElementById('battleThreat')!==null);
      if(!threatHud)throw Error('Battle threat HUD missing');
      const cooldownButtons=await page.evaluate(()=>[0,1].every(i=>document.getElementById('skill'+i)!==null));
      if(!cooldownButtons)throw Error('Cooldown ring buttons missing');
      const homeFeatures=await page.evaluate(()=>['homeBrief','dailyBar'].every(id=>document.getElementById(id)!==null));
      if(!homeFeatures)throw Error('Home command center elements missing');
      const missionPreview=await page.evaluate(()=>document.querySelectorAll('.arcade-bottom button').length===5&&document.querySelector('.arcade-play')!==null&&['homeWeaponDamage','homeWeaponRate','homeWeaponIcon'].every(id=>document.getElementById(id)!==null));
      if(!missionPreview)throw Error('Arcade lobby or weapon preview missing');
      const equipmentStyle=await page.evaluate(()=>{showPanel('armory');const ok=document.querySelectorAll('.equipment-item').length===4&&document.querySelector('.equipment-slots')!==null&&document.getElementById('subpage').classList.contains('active')&&!document.getElementById('home').classList.contains('active');showHome();return ok});
      if(!equipmentStyle)throw Error('Equipment inventory or unified arcade panel missing');
      const independentTabs=await page.evaluate(()=>{for(const tab of ['shop','talents','challenges','records']){showPanel(tab);if(!document.getElementById('subpage').classList.contains('active')||document.getElementById('overlay').classList.contains('show')||document.getElementById('home').classList.contains('active'))return false;}showHome();return document.getElementById('home').classList.contains('active')&&!document.getElementById('subpage').classList.contains('active')});
      if(!independentTabs)throw Error('Bottom navigation is not independent full-screen pages');
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
  await browser.close();
  if(failed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
