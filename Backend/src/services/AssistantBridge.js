const path = require('path');
const { runPython, runAssistant } = require('./PythonRuntime');

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

const processLocalAssistantMessage = async ({ message, customerId, customer, context, knowledge = [], privateHistory = [], ticketLookup = {} }) => {
  const chatDirectory = path.resolve(__dirname, '../../chat');
  const ownedContext = !context?.customer?.id || String(context.customer.id)===String(customerId);
  const safeContext = ownedContext && context && typeof context === 'object' ? context : {};
  const enrichedContext = {
    ...safeContext,
    _knowledge_snapshot: knowledge,
    _private_history: privateHistory,
    _ticket_lookup: ticketLookup,
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
    const payload={message,customerId:String(customerId),encodedContext};
    const lines = runAssistant ? await runAssistant(payload) : await runPython([
      path.join(chatDirectory, 'assistant_runner.py'),
      '--stdin',
    ], JSON.stringify(payload));
    const result = parseLastJsonLine(lines);
    if (!result.success || typeof result.response !== 'string' || !result.response.trim()) {
      throw new Error(result.traceback || result.error || 'Respuesta vacía del asistente');
    }
    return result;
  } catch (cause) {
    console.error('Fallo del asistente Python:', cause.code || cause.name || 'UNAVAILABLE');
    const error = new Error('El asistente no está disponible en el servidor. Intenta más tarde o contacta al soporte.');
    error.status = 503;
    error.code = 'ASSISTANT_UNAVAILABLE';
    error.cause = cause;
    throw error;
  }
};

let openAIProcessor;
const processAssistantMessage = async (payload) => {
  // Test suites never spend API credits implicitly, even with a configured .env.
  if(process.env.ASSISTANT_PROVIDER!=='openai'||process.env.NODE_TEST_CONTEXT)return processLocalAssistantMessage(payload);
  if(!openAIProcessor){
    const {createOpenAIAssistant}=require('./IntelligentSupportAssistant');
    openAIProcessor=createOpenAIAssistant({localProcessor:processLocalAssistantMessage,
      usage:require('./OpenAIUsage').usage,apiKey:process.env.OPENAI_API_KEY,
      model:process.env.OPENAI_MODEL||'gpt-6.1-sol',dailyBudget:process.env.OPENAI_DAILY_BUDGET_USD||1,
      webEnabled:process.env.OPENAI_WEB_SEARCH!=='false',
      maxOutputTokens:process.env.OPENAI_MAX_OUTPUT_TOKENS||1024,timeoutMs:process.env.OPENAI_TIMEOUT_MS||45000});
  }
  return openAIProcessor(payload);
};
module.exports = { processAssistantMessage, processLocalAssistantMessage };
