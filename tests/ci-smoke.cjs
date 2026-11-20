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
      // Verify the new player sprite atlas loads and actually paints non-transparent pixels.
      await page.waitForFunction(()=>typeof earthHeroAtlas!=='undefined' && earthHeroAtlas.complete && earthHeroAtlas.naturalWidth>0,null,{timeout:15000});
      const hero=await page.evaluate(()=>{
        const off=document.createElement('canvas');off.width=170;off.height=160;
        const c=off.getContext('2d');
        const rendered=drawSelectedHero(c,85,112,1,0);
        const safe=getHeroSafeFrames();
        if(!Array.isArray(safe)||safe.length!==6||safe.some(row=>row.some(f=>f<0||f>7)))throw Error('Invalid sprite safety map');
        const states=['idle','run','shoot','hurt','dash','death'];
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
