const path = require('path');
const { PythonShell } = require('python-shell');

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

  const lines = await PythonShell.run('assistant_runner.py', {
    mode: 'text',
    pythonPath: process.env.PYTHON_PATH || 'python',
    pythonOptions: ['-u'],
    scriptPath: chatDirectory,
    args: [message, String(customerId), encodedContext],
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });

  const result = parseLastJsonLine(lines);
  if (!result.success) {
    throw new Error(result.error || 'No se pudo procesar el mensaje');
  }
  return result;
};

module.exports = { processAssistantMessage };
