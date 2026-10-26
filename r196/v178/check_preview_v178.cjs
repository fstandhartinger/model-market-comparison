// Existing shared Chrome only; caller holds chrome-9333.lock. Close the temporary tab in all cases.
const {chromium}=require('/home/flori/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const {writeFileSync}=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9333');let page;
 try{
  page=await browser.contexts()[0].newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1100});
  await page.goto('file://'+path.join(__dirname,'preview/index.html'));
  await page.waitForSelector('#ranking tr');
  const fairness_header=await page.locator('main > small').innerText();
  if(!fairness_header.includes('fairness FAIR'))throw Error('wrong fairness header: '+fairness_header);
  const initial=await page.locator('#summary').innerText();
  if(!initial.includes('share / open / official / capability'))throw Error('wrong initial view: '+initial);
  if(await page.locator('#radar polygon').count()!==6)throw Error('missing radar');
  const official=await page.locator('#ranking tr').count();
  await page.locator('#model').fill('Jeff-1.1-Medium');if(await page.locator('#ranking tr').count()!==1)throw Error('model search');
  await page.locator('#model').fill('');await page.locator('#only').uncheck();if(await page.locator('#list option').count()!==544)throw Error('full list options');
  await page.locator('#query').fill('share / open / official / view/Intelligence only');
  const intelligence=await page.locator('#pair').innerText();if(!intelligence.includes('DOPEST'))throw Error('displaced model: '+intelligence);
  await page.locator('#query').fill('share / open / official / view/Capability only');
  const custom=await page.locator('#pair').innerText();if(!custom.includes('Sieve'))throw Error('displaced model: '+custom);
  await page.locator('#query').fill('share / open / none / custom/I10 Calibration60 Speed0 Cost20');
  const legacy=await page.locator('#pair').innerText();if(!/torchcast/i.test(legacy))throw Error('legacy displaced model: '+legacy);
  await page.locator('#query').fill('share / open / official / capability');
  await page.screenshot({path:path.join(__dirname,'preview/browser-check.png'),fullPage:false});
  if(errors.length)throw Error(errors.join('\n'));
  writeFileSync(path.join(__dirname,'receipts/preview-browser.json'),JSON.stringify({status:'PASS',fairness_header,initial,official_rows:official,all_lists:544,intelligence,custom,legacy,page_errors:errors,tab_closed_in_finally:true},null,1)+'\n');
  console.log('PASS preview default view, 544 lists, model search, displaced-model radar and no page errors');
 }finally{if(page)await page.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
