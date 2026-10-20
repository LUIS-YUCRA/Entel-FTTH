const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
 const dist=path.resolve(__dirname,'../dist');const artifacts=process.env.ASSISTANT_ARTIFACTS||path.resolve(__dirname,'../../tmp/assistant-ui');fs.mkdirSync(artifacts,{recursive:true});
 try{
  for(const role of ['administrador','cliente']){
   const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const user={id:1,full_name:'Prueba interfaz',user_type:role,email:role==='cliente'?'test@example.com':'test@entel.bo'};
   await page.addInitScript(user=>{sessionStorage.setItem('token','test');sessionStorage.setItem('user',JSON.stringify(user));sessionStorage.setItem('lastActivityAt',String(Date.now()));},user);
   let review,turn,categoryUpdate;const requests=[];const conversation={id:1,status:'ACTIVA',messages:[],updated_at:new Date().toISOString()};
   const customer={id:3,full_name:'Cliente de prueba',email:'cliente@example.test',user_type:'cliente',is_active:true,customer_category:'HOGAR'};
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());const method=route.request().method();
    if(url.pathname.startsWith('/api/')){
     let result={};const endpoint=url.pathname.slice(4);
     if(endpoint==='/auth/profile')result={user};
     else if(endpoint==='/users')result={users:[customer]};
     else if(endpoint==='/users/3'&&method==='PATCH'){categoryUpdate=route.request().postDataJSON();result={user:{...customer,customer_category:categoryUpdate.customerCategory}};}
     else if(endpoint==='/assistant-knowledge')result={items:[{id:1,status:'PENDING',question:'Mi internet está lento.',answer:'¿Ocurre en todos tus dispositivos o solamente en uno?',reply_key:'slow:device_scope',intent:'internet_lento',quality_flags:[]}],metrics:{candidates:1},policy:{slots:{'slow:device_scope':{label:'Lentitud: alcance por dispositivos',intents:['internet_lento']}}}};
     else if(endpoint==='/assistant-knowledge/1/versions')result={versions:[]};
     else if(endpoint==='/assistant-knowledge/1'&&method==='PATCH'){review=route.request().postDataJSON();result={status:review.status};}
     // Reproducir el servidor anterior: respuestas antes de sus preguntas.
     else if(endpoint==='/conversations')result={conversations:[{...conversation,messages:[...conversation.messages].reverse()}]};
     else if(endpoint==='/dashboard/overview')result={metrics:{active:0,resolved:0,closed:0},conversations:{total:1},evidences:{total:0}};
     else if(endpoint==='/conversations/message'){
      requests.push(route.request().postDataJSON());
      if(requests.length===2)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Prueba de interrupcion',code:'ASSISTANT_UNAVAILABLE'})});
      turn=route.request().postDataJSON();
      const id=conversation.messages.length+1,created_at='2026-10-13T18:00:00.000Z';
      conversation.messages.push({id,sender:'usuario',content:turn.message,created_at},{id:id+1,sender:'asistente',content:'Claro, ¿cuál es tu duda?',created_at});
      result={success:true,conversationId:1,messageId:id+1,response:conversation.messages.at(-1).content,dialogState:'START'};
     }
     return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
    }
    const candidate=path.join(dist,url.pathname.replace(/^\//,''));const file=candidate.startsWith(dist)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(dist,'index.html');
    const types={'.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.html':'text/html'};
    return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
   });
   await page.goto('https://ftth.test/'+(role==='administrador'?'ConocimientoAsistente':'dashboard/cliente'));
   await page.locator('#route-content[aria-busy="false"]').waitFor();
   if(role==='administrador'){
    await page.getByRole('button',{name:'Evaluar respuesta'}).click();
    assert.equal(await page.getByRole('button',{name:'Validar y publicar'}).isDisabled(),true);
    await page.getByLabel('Motivo de la evaluación').fill('Pregunta general y técnicamente correcta, sin datos privados.');
    await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Validar y publicar'}).click();
    await page.locator('.knowledge-editor').waitFor({state:'hidden'});assert.equal(review.status,'VALIDATED');assert.equal(review.privacyReviewed,true);
    await page.screenshot({path:path.join(artifacts,'knowledge-desktop.png'),fullPage:true});
   }else{
    await page.locator('.conversation-history-item.active').waitFor();
    await page.getByPlaceholder('Escribe aquí lo que sucede con tu internet...').fill('tengo una duda');
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();await page.getByText('Claro, ¿cuál es tu duda?',{exact:true}).waitFor();
    assert.match(turn.requestId,/^[0-9a-f-]{36}$/);assert.equal(turn.conversationId,1);
    assert.equal(await page.getByRole('button',{name:/^(Me ayudó|No me ayudó)$/}).count(),0);
    await page.getByPlaceholder('Escribe aquí lo que sucede con tu internet...').fill('mi internet esta lento');
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
    await page.locator('.chat-error[role="alert"]').waitFor();
    assert.equal(await page.locator('.chat-message.usuario').filter({hasText:'mi internet esta lento'}).count(),1);
    const assertOrder=async()=>{
      const displayed=await page.locator('.conversation-panel .chat-message').evaluateAll(elements=>elements.map(element=>({
        sender:element.classList.contains('usuario')?'usuario':'asistente',
        content:element.querySelector('p').textContent,top:element.getBoundingClientRect().top,
      })));
      assert.deepEqual(displayed.map(({sender,content})=>({sender,content})),conversation.messages.map(({sender,content})=>({sender,content})));
      for(let index=0;index<displayed.length;index+=2){
        assert.equal(displayed[index].sender,'usuario');assert.equal(displayed[index+1].sender,'asistente');
        assert.ok(displayed[index+1].top>displayed[index].top,'answer must appear below its question');
      }
    };
    const retryId=requests[1].requestId;
    await page.getByPlaceholder('Escribe aquí lo que sucede con tu internet...').evaluate(element=>{
      element.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      element.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    });
    await page.waitForFunction(()=>!document.querySelector('textarea')?.value && !document.querySelector('.chat-message[role="status"]'));
    await page.locator('.chat-error[role="alert"]').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).waitFor();
    assert.equal(requests.length,3);assert.equal(requests[2].requestId,retryId);
    await page.locator('.chat-message.usuario p').filter({hasText:'mi internet esta lento'}).waitFor();
    assert.equal(await page.locator('.chat-message.usuario').filter({hasText:'mi internet esta lento'}).count(),1);
    await assertOrder();
    await page.reload();
    await page.locator('#route-content[aria-busy="false"]').waitFor();
    await page.locator('.chat-message').nth(3).waitFor();
    await assertOrder();
    await page.locator('.conversation-panel').screenshot({path:path.join(artifacts,'message-order-fixed.png')});
    await page.screenshot({path:path.join(artifacts,'chat-desktop.png'),fullPage:true});
   }
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(artifacts,`${role}-mobile.png`),fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${role} overflow`);
   if(role==='administrador'){
    await page.goto('https://ftth.test/GestionUsuarios');
    await page.getByTitle('Editar usuario',{exact:true}).click();
    await page.getByLabel('Tipo de cliente').selectOption('INSTITUCION');
    await page.getByRole('button',{name:'Actualizar usuario',exact:true}).click();
    await page.locator('.modal-overlay').waitFor({state:'hidden'});
    assert.equal(categoryUpdate.customerCategory,'INSTITUCION');
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: question/answer order including reload and equal timestamps, admin review, privacy, UUID retries, rapid Enter blocked, no duplicates, desktop/mobile, no JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
