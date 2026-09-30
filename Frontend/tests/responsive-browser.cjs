const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});const failures=[];fs.mkdirSync('artifacts/responsive',{recursive:true});
 const profiles={cliente:'/PerfilCliente',tecnico:'/dashboard/tecnico',operador:'/PerfilOperador',administrador:'/PerfilAdmin'};
 try{
 for(const role of Object.keys(profiles)){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const user={id:1,full_name:'Usuario de prueba',email:'usuario@gmail.com',user_type:role,created_at:'2026-01-01',is_active:true,has_profile_photo:['cliente','administrador'].includes(role),service_number:'123456'};
  await page.addInitScript(user=>{sessionStorage.setItem('token','test-token');sessionStorage.setItem('user',JSON.stringify(user));sessionStorage.setItem('lastActivityAt',String(Date.now()));},user);
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url());const endpoint=url.pathname.replace('/api','');let body={success:true};
   if(endpoint==='/auth/profile/photo'){await route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});return;}
   if(endpoint==='/auth/profile')body={user};
   else if(endpoint==='/tickets')body={tickets:[]};else if(endpoint==='/users')body={users:[]};
   else if(endpoint.includes('technicians'))body={technicians:[]};
   else if(endpoint==='/conversations')body={conversations:[{id:1,status:'ACTIVA',messages:[],updated_at:new Date().toISOString()}]};
   else if(endpoint==='/conversations/message')body={conversationId:1,response:'¿El módem tiene una luz roja?',dialogState:'GUIDED_DIAGNOSIS'};
   else if(endpoint==='/notifications')body={notifications:[]};
   else if(endpoint==='/dashboard/overview')body={metrics:{active:0,resolved:0,closed:0,total:0},conversations:{total:0},evidences:{total:0},users:{total:0,technicians:0},activity:[],recentTickets:[],technicianPerformance:[]};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  for(const width of [320,390,768,1024,1366,1920]){
   await page.setViewportSize({width,height:width<600?844:900});
   await page.goto(`${process.env.PORTAL_URL||'http://127.0.0.1:5174'}/dashboard/${role}`);await page.locator('main').waitFor();
   await page.waitForTimeout(300);
   async function check(label){
    const issues=await page.evaluate(()=>{
     const bad=[];const w=innerWidth;
     for(const el of document.querySelectorAll('main, main input:not([type=hidden]), main select, .sidebar-avatar, .sidebar-user button')){
      if(!el.getClientRects().length)continue;
      const r=el.getBoundingClientRect();if(r.left < -1 || r.right > w+1)bad.push(`${el.className||el.tagName} ${Math.round(r.left)}..${Math.round(r.right)}`);
     }
     return bad;
    });if(issues.length)failures.push(`${role} ${width} ${label}: ${issues.join(', ')}`);
   }
   await check('dashboard');
   if(role==='cliente'){
    assert.ok((await page.locator('.quick-actions-card').boundingBox()).width<=461);
    const toggle=page.getByRole('button',{name:/historial de conversaciones/});await toggle.click();await page.waitForTimeout(250);
    if(width<=640){
     const panel=await page.locator('.conversation-history').boundingBox();const card=await page.locator('.assistant-card').boundingBox();assert.ok(Math.abs(panel.width-card.width/2)<2);assert.ok(Math.abs(panel.x-card.x)<2);assert.ok(Math.abs(panel.y-card.y)<2);assert.ok(panel.y+panel.height<=card.y+card.height+1);assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
      if(width===390)await page.screenshot({path:'artifacts/responsive/assistant-history-390.png',fullPage:true});
     const heading=await page.locator('.client-page-heading > div:first-child').boundingBox();const status=await page.locator('.network-health').boundingBox();assert.ok(status.x>=heading.x+heading.width);assert.ok(status.y<heading.y+heading.height);
    }
    await toggle.click();await page.waitForTimeout(300);
    if(width<=640)assert.equal(await page.locator('.conversation-history').isVisible(),false);
await page.evaluate(()=>window.scrollTo(0,0));
    if(width===390||width===1366)await page.screenshot({path:`artifacts/responsive/assistant-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Sin internet',exact:true}).click();await page.getByText('¿El módem tiene una luz roja?',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Enviar mensaje',exact:true}).isVisible(),true);
   }
   const profile=page.getByRole('link',{name:'Abrir mi perfil',exact:true});
   if(role==='cliente'){
    await page.getByRole('link',{name:'Mis tickets',exact:true}).click();await page.locator('.client-account-label').waitFor();
    const account=await page.locator('.client-account-label').boundingBox();const heading=await page.locator('.client-tickets-heading > div:first-child').boundingBox();
    if(width<=640){assert.ok(account.y+account.height<=heading.y);assert.ok(account.x>width/2);}else if(width>=1024){assert.ok(account.x>heading.x+heading.width-1);}
   }
   await profile.click();await page.waitForURL(`**${profiles[role]}`);await page.locator('main').waitFor();await page.waitForTimeout(100);await check('profile');await page.evaluate(()=>window.scrollTo(0,0));
   if(width===390)await page.screenshot({path:`artifacts/responsive/profile-${role}-390.png`,fullPage:true});
  }
  assert.deepEqual(errors,[],`${role}: browser errors`);await page.close();console.log(`${role}: profile navigation and responsive checks completed`);
 }
 if(failures.length)throw new Error(failures.join('\n'));
 console.log('Responsive checks passed at 320, 390, 768, 1024, 1366 and 1920px for all four roles.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
