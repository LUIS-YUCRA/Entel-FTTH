const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge'});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:1,full_name:'Cliente de prueba',email:'cliente@gmail.com',user_type:'cliente',service_number:'123456',phone:'70000000'};
 let conversations=[];let nextId=1;let summaryQueries=[];let notificationQueries=[];
 const tickets=Array.from({length:12},(_,i)=>({id:i+1,ticket_code:`FTTH-${String(i+1).padStart(4,'0')}`,title:'Sin internet',priority:'MEDIA',status:'PENDIENTE',created_at:'2026-09-23T12:00:00Z'}));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());const endpoint=url.pathname.replace('/api','');let result={};
  if(endpoint==='/auth/login') result={user,token:'test-token'};
  else if(endpoint==='/auth/profile') result={user};
  else if(endpoint==='/dashboard/overview'){summaryQueries.push(url.search);result={metrics:{active:2,resolved:3,closed:1},conversations:{total:5},evidences:{total:2}};}
  else if(endpoint==='/conversations' && route.request().method()==='GET')result={conversations};
  else if(endpoint==='/conversations' && route.request().method()==='POST'){const conversation={id:nextId++,status:'ACTIVA',messages:[],updated_at:new Date().toISOString()};conversations.unshift(conversation);result={conversation};}
  else if(endpoint==='/conversations/message'){
   const body=route.request().postDataJSON();const c=conversations.find(c=>c.id===body.conversationId);
   const finished=body.message.includes('no quiero')||body.message==='sí';
   c.messages.push({id:c.messages.length+1,sender:'usuario',content:body.message});
   c.messages.push({id:c.messages.length+1,sender:'asistente',content:finished?'Conversación finalizada.':'¿El módem tiene una luz roja?'});
   if(finished)c.status='FINALIZADA';
   await new Promise(resolve=>setTimeout(resolve,600));
   result={conversationId:c.id,response:c.messages.at(-1).content,dialogState:finished?'FINISHED':'GUIDED_DIAGNOSIS',ticket:body.message==='sí'?{id:1}:null};
  }
  else if(endpoint==='/tickets') result={tickets};
  else if(endpoint.startsWith('/tickets/')) result={ticket:{...tickets[Number(endpoint.split('/').at(-1))-1],history:[],evidences:[]}};
  else if(endpoint==='/notifications'){notificationQueries.push(url.search);result={notifications:[{id:1,title:'Ticket registrado',message:'Tu solicitud está en atención',created_at:new Date().toISOString(),email_status:'ENVIADA'}]};}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.goto(process.env.PORTAL_URL||'http://127.0.0.1:5174');
 await page.locator('#email').fill(user.email);await page.locator('#password').fill('TestPassword1!');await page.getByRole('button',{name:/Iniciar Sesión/}).click();
 await page.getByRole('heading',{name:'Soluciones rápidas'}).waitFor();
 fs.mkdirSync('artifacts/customer-portal',{recursive:true});
 await page.screenshot({path:'artifacts/customer-portal/dashboard-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Esta semana',exact:true}).click();await page.waitForTimeout(100);assert.ok(summaryQueries.at(-1).includes('from='));
 await page.getByLabel('Fecha inicio',{exact:true}).fill('2026-08-03');await page.getByLabel('Fecha fin',{exact:true}).fill('2026-08-03');await page.getByRole('button',{name:'Aplicar filtro'}).click();await page.waitForTimeout(100);assert.ok(decodeURIComponent(summaryQueries.at(-1)).includes('2026-08-04'));
 await page.getByRole('button',{name:'Sin internet',exact:true}).click();await page.getByText('Analizando tu servicio...',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Cargando página',{exact:true}).count(),0);
 await page.getByText('¿El módem tiene una luz roja?',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Nueva conversación',exact:true}).click();
 await page.getByRole('button',{name:/No tengo internet.*En curso/}).click();
 assert.equal(await page.getByPlaceholder('Escribe aquí lo que sucede con tu internet...').isDisabled(),false);
 await page.reload();await page.getByRole('button',{name:/No tengo internet.*En curso/}).click();await page.getByText('¿El módem tiene una luz roja?',{exact:true}).waitFor();
 assert.ok(page.url().includes('/dashboard/cliente'));

 await page.getByPlaceholder('Escribe aquí lo que sucede con tu internet...').fill('no quiero generar ticket');await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
 await page.getByText('Abre un nuevo chat si deseas describir otro problema.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Enviar mensaje',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Nuevo chat',exact:true}).click();await page.getByPlaceholder('Escribe aquí lo que sucede con tu internet...').fill('sí');await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();await page.getByText('Abre un nuevo chat si deseas describir otro problema.',{exact:true}).waitFor();
 await page.getByRole('link',{name:'Mis tickets',exact:true}).click();await page.getByText('Mostrando 1–5 de 12 tickets',{exact:true}).waitFor();assert.equal(await page.locator('tbody tr').count(),5);
 await page.getByRole('button',{name:'Página siguiente',exact:true}).click();await page.getByRole('button',{name:'Página siguiente',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),2);
 await page.getByLabel('Tickets por página').selectOption('8');assert.equal(await page.locator('tbody tr').count(),8);await page.getByText('Mostrando 1–8 de 12 tickets',{exact:true}).waitFor();await page.screenshot({path:'artifacts/customer-portal/tickets-pagination.png',fullPage:true});
 await page.getByPlaceholder('Buscar por ID de ticket').fill('FTTH-0001');assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('link',{name:'Mi perfil',exact:true}).click();await page.locator('input[aria-describedby="instance-note"]').waitFor();assert.equal(await page.locator('input[aria-describedby="instance-note"]').isDisabled(),true);
 await page.getByRole('link',{name:'Notificaciones',exact:true}).click();await page.getByRole('button',{name:'Este mes',exact:true}).click();await page.waitForTimeout(100);assert.ok(notificationQueries.at(-1).includes('from='));
 await page.screenshot({path:'artifacts/customer-portal/notifications-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'Asistente',exact:true}).click();await page.getByRole('button',{name:'Nueva conversación',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/customer-portal/dashboard-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile must not overflow');
 await page.getByRole('link',{name:'Mis tickets',exact:true}).click();await page.getByText('Mostrando 1–5 de 12 tickets',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Ver detalle',exact:true}).first().click();await page.locator('.client-ticket-detail').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile tickets must not overflow');
 await page.getByRole('link',{name:'Notificaciones',exact:true}).click();await page.getByLabel('Fecha inicio',{exact:true}).fill('2026-08-03');await page.getByLabel('Fecha fin',{exact:true}).fill('2026-08-04');await page.getByRole('button',{name:'Aplicar filtro'}).click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile notifications must not overflow');
 assert.deepEqual(errors,[]);console.log('Browser checks passed: dates, analyzing indicator, both closed-chat states, pagination, profile, notifications, mobile width.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

