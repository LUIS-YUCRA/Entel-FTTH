const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const backendRoot = path.resolve(__dirname, '../..');

const resolvePythonPath = () => {
  const configured = String(process.env.PYTHON_PATH || '').trim();
  if (configured) {
    if (process.platform !== 'win32' && /^[A-Za-z]:[\\/]/.test(configured)) {
      throw new Error('PYTHON_PATH apunta a Windows. Configura el Python del servidor o deja PYTHON_PATH vacío para detectarlo.');
    }
    return configured;
  }
  const executable = process.platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python'];
  for (const directory of ['.venv312', '.venv', 'venv']) {
    const candidate = path.join(backendRoot, directory, ...executable);
    if (fs.existsSync(candidate)) return candidate;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
};

const runPython = (args, input) => new Promise((resolve, reject) => {
  let executable;
  try { executable = resolvePythonPath(); } catch (error) { reject(error); return; }
  const child = execFile(executable, ['-u', ...args], {
    cwd: backendRoot,
    windowsHide: true,
    timeout: 120000,
    killSignal: 'SIGKILL',
    maxBuffer: 8 * 1024 * 1024,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  }, (error, stdout, stderr) => {
    if (error) {
      error.message = `Python: ${error.message}\n${stderr || ''}`;
      reject(error);
    } else {
      if (stderr.trim()) console.warn('Diagnóstico de Python:', stderr.trim());
      resolve(stdout.split(/\r?\n/).filter(Boolean));
    }
  });
  child.stdin.on('error', () => {});
  child.stdin.end(input || '');
});
let assistantPool;
const runAssistant = payload => {
  if(process.env.ASSISTANT_PROCESS_MODE==='oneshot')return runPython([path.join(backendRoot,'chat/assistant_runner.py'),'--stdin'],JSON.stringify(payload));
  if(!assistantPool){const {AssistantWorkerPool}=require('./AssistantWorkerPool');assistantPool=new AssistantWorkerPool(resolvePythonPath,process.env.ASSISTANT_WORKERS);}
  return assistantPool.run(payload);
};
const closeAssistantWorkers = () => {assistantPool?.close();assistantPool=null;};
module.exports = { resolvePythonPath, runPython, runAssistant, closeAssistantWorkers };
