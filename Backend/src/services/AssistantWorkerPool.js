const {spawn} = require('node:child_process');
const path = require('node:path');

class AssistantWorkerPool {
  constructor(resolvePythonPath, size = 2) {
    this.resolvePythonPath = resolvePythonPath;
    this.size = Math.max(1,Math.min(4,Number(size)||2));
    this.workers = [];
    this.queue = [];
    process.once('exit',()=>this.close());
  }
  run(payload) {
    if(this.queue.length>=32)return Promise.reject(Object.assign(new Error('Cola del asistente completa.'),{code:'ASSISTANT_BUSY'}));
    return new Promise((resolve,reject)=>{
      const job={payload,resolve,reject};
      job.timer=setTimeout(()=>{
        const waiting=this.queue.indexOf(job);
        if(waiting>=0){this.queue.splice(waiting,1);reject(Object.assign(new Error('Tiempo del asistente agotado.'),{code:'ASSISTANT_TIMEOUT'}));}
        else {const worker=this.workers.find(w=>w.job===job);if(worker){worker.child.kill();this.failed(worker,Object.assign(new Error('Tiempo del asistente agotado.'),{code:'ASSISTANT_TIMEOUT'}));}}
      },120000);
      this.queue.push(job);
      this.dispatch();
    });
  }
  create() {
    const root=path.resolve(__dirname,'../..');
    const child=spawn(this.resolvePythonPath(),['-u',path.join(root,'chat/assistant_runner.py'),'--worker'],{
      cwd:root,windowsHide:true,stdio:['pipe','pipe','pipe'],
      env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONUTF8:'1'},
    });
    const worker={child,job:null,buffer:''};
    this.workers.push(worker);
    child.unref();child.stdin.unref?.();child.stdout.unref?.();child.stderr.unref?.();
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{
      // A terminated worker can still flush buffered stdout on Windows.
      // Never accept that response for an interrupted request.
      if(child.killed)return;
      worker.buffer+=chunk;
      if(worker.buffer.length>8*1024*1024){child.kill();this.failed(worker,new Error('Respuesta excesiva del asistente.'));return;}
      let index;
      while((index=worker.buffer.indexOf('\n'))>=0){
        const line=worker.buffer.slice(0,index).trim();worker.buffer=worker.buffer.slice(index+1);
        let result;try{result=JSON.parse(line);}catch{continue;}
        if(typeof result.success!=='boolean'||!worker.job)continue;
        const job=worker.job;worker.job=null;clearTimeout(job.timer);
        job.resolve([JSON.stringify(result)]);
        this.dispatch();
      }
    });
    // Nunca registrar mensajes privados ni trazas completas del trabajador.
    child.stderr.on('data',()=>{});
    child.stdin.on('error',error=>{child.kill();this.failed(worker,error);});
    child.on('error',error=>this.failed(worker,error));
    child.on('exit',()=>this.failed(worker,Object.assign(new Error('El trabajador Python terminó.'),{code:'PYTHON_EXIT'})));
    return worker;
  }
  failed(worker,error) {
    if(!this.workers.includes(worker))return;
    this.workers=this.workers.filter(w=>w!==worker);
    if(worker.job){clearTimeout(worker.job.timer);worker.job.reject(error);worker.job=null;}
    this.dispatch();
  }
  dispatch() {
    while(this.queue.length){
      let worker=this.workers.find(w=>!w.job&&!w.child.killed);
      if(!worker && this.workers.length<this.size){
        try{worker=this.create();}catch(error){const job=this.queue.shift();clearTimeout(job.timer);job.reject(error);continue;}
      }
      if(!worker)return;
      worker.job=this.queue.shift();
      worker.child.stdin.write(JSON.stringify(worker.job.payload)+'\n');
    }
  }
  close() {
    for(const job of this.queue){clearTimeout(job.timer);job.reject(new Error('Asistente detenido.'));}
    this.queue=[];
    for(const worker of [...this.workers]){worker.child.kill();this.failed(worker,new Error('Asistente detenido.'));}
  }
}
module.exports={AssistantWorkerPool};
