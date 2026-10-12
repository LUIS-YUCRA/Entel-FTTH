const path = require('path');
const { runPython } = require('./PythonRuntime');

const parseLastJsonLine = (lines) => {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Los módulos heredados imprimen mensajes de carga; se ignoran.
    }
  }
  throw new Error('El asistente no devolvió una respuesta JSON válida');
};

const processAssistantMessage = async ({ message, customerId, customer, context }) => {
  const chatDirectory = path.resolve(__dirname, '../../chat');
  const safeContext = context && typeof context === 'object' ? context : {};
  const enrichedContext = {
    ...safeContext,
    customer: {
      ...(safeContext.customer || {}),
      ...(customer || {}),
      id: customerId,
    },
  };
  const encodedContext = Buffer.from(
    JSON.stringify(enrichedContext),
    'utf8',
  ).toString('base64url');

  try {
    const lines = await runPython([
      path.join(chatDirectory, 'assistant_runner.py'),
      message, String(customerId), encodedContext,
    ]);
    const result = parseLastJsonLine(lines);
    if (!result.success || typeof result.response !== 'string' || !result.response.trim()) {
      throw new Error(result.traceback || result.error || 'Respuesta vacía del asistente');
    }
    return result;
  } catch (cause) {
    console.error('Fallo del asistente Python:', cause);
    const error = new Error('El asistente no está disponible en el servidor. Intenta más tarde o contacta al soporte.');
    error.status = 503;
    error.code = 'ASSISTANT_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
};

module.exports = { processAssistantMessage };
