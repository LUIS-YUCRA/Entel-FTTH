// Pruebas reproducibles; --database activa las pruebas PostgreSQL con limpieza.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
require('../src/config/env');
const {resolvePythonPath}=require('../src/services/PythonRuntime');
const root=path.resolve(__dirname,'..');
const env={...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',ASSISTANT_PROVIDER:'local'};
if(process.argv.includes('--database')){env.FTTH_TEST_DATABASE='1';env.ASSISTANT_DB_TEST='1';}
const steps=[
  ['Python',resolvePythonPath(),['-m','unittest','discover','-s','chat','-p','test_*.py']],
  ['Node',process.execPath,['--test',...fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.cjs')).map(n=>path.join('tests',n))]],
];
const results=[];
for(const [name,command,args] of steps){
  const started=Date.now();
  const result=spawnSync(command,args,{cwd:root,env,windowsHide:true,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
  process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
  const exitCode=result.status??1;
  const output=(result.stdout||'')+'\n'+(result.stderr||'');
  const tests=Number(output.match(name==='Python'?/Ran (\d+) tests/:/ℹ tests (\d+)/)?.[1]||0);
  const skipped=Number(output.match(name==='Python'?/skipped=(\d+)/:/ℹ skipped (\d+)/)?.[1]||0);
  const passed=name==='Python'?(exitCode===0?tests-skipped:null):Number(output.match(/ℹ pass (\d+)/)?.[1]||0);
  results.push({name,exitCode,tests,passed,skipped,durationMs:Date.now()-started,errorCode:result.error?.code||null});
}
const report={timestamp:new Date().toISOString(),database:process.argv.includes('--database'),steps:results};
const reportPath=path.resolve(root,'../deploy/ASISTENTE-validacion-real.json');
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('Informe:',reportPath);
process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
