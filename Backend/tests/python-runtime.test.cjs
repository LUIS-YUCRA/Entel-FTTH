const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function runtime(platform, configured, exists, execute) {
  const filename = path.resolve(__dirname, '../src/services/PythonRuntime.js');
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module, __dirname: path.dirname(filename), console,
    process: { platform, env: { PYTHON_PATH: configured } },
    require: (name) => name === 'node:fs' ? {existsSync: exists} : name === 'node:child_process' ? {execFile: execute} : require(name),
  });
  return module.exports;
}
test('Linux rejects a copied Windows interpreter path', () => {
  assert.throws(() => runtime('linux', 'C:\\Users\\LUIS\\python.exe', () => false).resolvePythonPath(), /Windows/);
});
test('Linux detects the server virtual environment', () => {
  const result = runtime('linux', '', file => file.endsWith(path.join('.venv', 'bin', 'python'))).resolvePythonPath();
  assert.ok(result.endsWith(path.join('.venv', 'bin', 'python')));
});
test('Linux falls back to python3 when no virtual environment exists', () => {
  assert.equal(runtime('linux', '', () => false).resolvePythonPath(), 'python3');
});
test('Python warnings do not discard a successful JSON response', async () => {
  const api = runtime('linux', '', () => false, (executable, args, options, done) => {
    assert.equal(executable, 'python3');
    assert.equal(options.timeout, 120000);
    assert.equal(options.windowsHide, true);
    assert.equal(options.env.PYTHONIOENCODING, 'utf-8');
    done(null, '{"success":true}\n', 'warning only');
  });
  const lines = await api.runPython(['assistant_runner.py']);
  assert.equal(JSON.parse(lines[0]).success, true);
});
test('Python launch failures remain errors', async () => {
  const api = runtime('linux', '', () => false, (executable, args, options, done) => done(new Error('ENOENT'), '', ''));
  await assert.rejects(() => api.runPython([]), /ENOENT/);
});