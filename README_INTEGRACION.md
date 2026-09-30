# Sistema FTTH integrado

La solución usa React como interfaz, Node/Express como API principal,
PostgreSQL como única fuente de datos y Python/spaCy como motor del asistente.
El backend persiste usuarios, sesiones, conversaciones, mensajes, tickets,
historial de estados y evidencias.

## 1. PostgreSQL y backend

1. Crear una base de datos vacía llamada `ftth_entel_db`.
2. En `Backend`, copiar `.env.example` como `.env` y reemplazar todas las
   claves de ejemplo.
3. Instalar y preparar:

```powershell
cd Backend
npm ci
python -m pip install -r requirements.txt
python -m spacy download es_core_news_md
npm run db.migrate
npm run db.seed-admin
npm run dev
```

El modelo mediano de spaCy es recomendado. Si no está instalado, el asistente
arranca con el modelo básico y conserva sus reglas, aunque la similitud
semántica será menor.

## 2. Frontend

En otra terminal:

```powershell
cd Frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Abrir `http://localhost:5173`.

## 3. Flujo integrado

1. El cliente se registra e inicia sesión.
2. El token JWT protege las rutas y el frontend verifica la sesión contra la API.
3. Cada mensaje se guarda en `conversation_messages`.
4. Node envía el mensaje y el contexto PostgreSQL al asistente Python.
5. Python devuelve respuesta, diagnóstico y, cuando corresponde, una propuesta
   de ticket.
6. Node guarda el ticket en `support_tickets` y lo relaciona con la conversación.
7. El operador asigna un técnico; el técnico actualiza el avance; cada cambio
   queda registrado en `ticket_history`.

Las cuentas de operador, técnico y administrador solo se crean desde el panel
administrativo. El registro público crea únicamente clientes.
