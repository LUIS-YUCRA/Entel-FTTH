require('../src/config/env');
const { resolvePythonPath } = require('../src/services/PythonRuntime');
const { processAssistantMessage } = require('../src/services/AssistantBridge');
(async () => {
  try {
    console.log('Python seleccionado:', resolvePythonPath());
    const started = Date.now();
    const response = await processAssistantMessage({ message: 'Mi internet está lento', customerId: 'diagnostico', customer: {}, context: {} });
    console.log('Asistente OK en', Date.now() - started, 'ms');
    console.log(response.response);
  } catch (error) {
    console.error(error.cause?.message || error.message);
    process.exitCode = 1;
  }
})();