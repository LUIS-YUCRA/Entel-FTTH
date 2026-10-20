# Asistente sin límite diario interno

El backend admite `OPENAI_DAILY_BUDGET_USD=0` para desactivar el límite interno.
El consumo sigue registrado en PostgreSQL. No cambia el modelo ni sus instrucciones.

## Producción

1. Subir `Backend/src/services/OpenAIUsage.js` actualizado junto con los demás cambios de la aplicación.
2. En el archivo `Backend/.env` DEL SERVIDOR, cambiar únicamente:

```dotenv
OPENAI_DAILY_BUDGET_USD=0
```

3. Si el proceso tiene esa variable configurada en el servicio, Docker o PM2, cambiarla también allí: las variables del proceso tienen prioridad sobre `.env`.
4. Reiniciar el backend con el gestor que utiliza el servidor y comprobar una consulta real.

Conservar el `.env`, la base de datos y los archivos de evidencias del servidor; no reemplazarlos por los locales.
No se requiere migración de base de datos para este cambio.

Para restaurar un límite interno, configurar un importe mayor que cero y reiniciar.
Los límites y el saldo de la cuenta de OpenAI siguen siendo independientes de este control.
