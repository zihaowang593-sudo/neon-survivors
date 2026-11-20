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
