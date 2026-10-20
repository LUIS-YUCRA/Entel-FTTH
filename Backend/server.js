require('./src/config/env');
require('./src/utils/jwtHelper').validateJwtConfiguration();
const { pool } = require('./src/config/db');
const app = require('./src/App');
const Ticket = require('./src/models/Ticket');
const Notification = require('./src/models/Notification');

require('./src/services/AssistantKnowledgeService').startKnowledgeWorker();

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
let cleaningNotifications = false;
const cleanNotifications = async () => {
  if (cleaningNotifications) return;
  cleaningNotifications = true;
  try { await Notification.purgeExpired(); }
  catch (error) { console.error('No se pudo limpiar notificaciones vencidas:', error.message); }
  finally { cleaningNotifications = false; }
};
// Retry independently of the initial database check, including after an outage.
const notificationRetentionMonitor = setInterval(cleanNotifications, 60 * 60 * 1000);
notificationRetentionMonitor.unref();


app.listen(PORT, HOST, async () => {
  console.log(`Servidor FTTH disponible en http://localhost:${PORT} y en la red local`);

  await cleanNotifications();
  try {
    const result = await pool.query('SELECT NOW() AS now');
    console.log(`PostgreSQL verificado: ${result.rows[0].now.toISOString()}`);
    await Ticket.markOverdueReprogrammedVisits();
    const overdueVisitMonitor = setInterval(() => {
      Ticket.markOverdueReprogrammedVisits().catch((error) => {
        console.error('No se pudo verificar visitas reprogramadas:', error.message);
      });
    }, 60_000);
    overdueVisitMonitor.unref();
  } catch (error) {
    console.error('No se pudo conectar con PostgreSQL:', error.message);
    process.exitCode = 1;
  }
});
