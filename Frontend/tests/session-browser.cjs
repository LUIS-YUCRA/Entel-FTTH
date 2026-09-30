const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
 try{
  for(const role of ['cliente','tecnico','operador','administrador']){
   const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.clock.install();
   const user={id:1,user_type:role,full_name:'Prueba sesión',email:'test@gmail.com'};
   await page.addInitScript(user=>{
    if(!sessionStorage.getItem('qa-seeded')){
     sessionStorage.setItem('token','qa-token');sessionStorage.setItem('user',JSON.stringify(user));sessionStorage.setItem('lastActivityAt',String(Date.now()));sessionStorage.setItem('qa-seeded','true');
    }
   },user);
   await page.route('**/api/**',async route=>{
    const endpoint=new URL(route.request().url()).pathname.replace('/api','');
    let body={success:true};
    if(endpoint==='/auth/profile')body={user};
    else if(endpoint==='/tickets')body={tickets:[]};
    else if(endpoint==='/users')body={users:[]};
    else if(endpoint==='/tickets/technicians/available')body={technicians:[]};
    else if(endpoint.includes('technicians'))body={technicians:[]};
    else if(endpoint==='/conversations')body={conversations:[]};
    else if(endpoint==='/dashboard/overview')body={metrics:{active:0,resolved:0,closed:0},conversations:{total:0},evidences:{total:0}};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   });
   const url=`${process.env.PORTAL_URL||'http://127.0.0.1:5174'}/dashboard/${role}`;
   await page.goto(url);await page.locator('main').waitFor();await page.reload();await page.locator('main').waitFor();assert.equal(page.url(),url);
   await page.clock.fastForward(119000);assert.equal(page.url(),url);
   if(role === 'administrador'){
    await page.keyboard.press('Shift');await page.clock.fastForward(119000);assert.equal(page.url(),url);
    await page.clock.fastForward(2000);await page.waitForURL('**/login');assert.equal(await page.evaluate(()=>sessionStorage.getItem('token')),null);
   }else{await page.clock.fastForward(180000);assert.equal(page.url(),url);}
   assert.deepEqual(errors,[]);console.log(`Session browser checks passed: ${role}`);await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
