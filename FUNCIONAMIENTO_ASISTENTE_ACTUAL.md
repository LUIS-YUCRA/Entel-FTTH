# Funcionamiento actual del asistente FTTH

1. El administrador registra la relación real entre instancia y categoría, con referencia al contrato o padrón. No se inventan reglas numéricas. La categoría desconocida queda pendiente de verificación.
2. El cliente se registra con instancia, correo y contraseña. En el login se consulta de nuevo el padrón. Instancia y categoría son de solo lectura para el cliente.
3. Al abrir una conversación nueva, GPT recibe la categoría verificada y los indicadores de campos faltantes. Ofrece completar teléfono, domicilio, zona o CI mediante un formulario conectado. El soporte no depende de completar todos esos campos.
4. GPT mantiene el historial y los hechos del problema, responde preguntas dentro de FTTH y adapta la siguiente pregunta a lo ya dicho. El backend valida propuestas y datos; no se otorga acceso arbitrario a la base de datos ni a secretos.
5. Para requisitos públicos puede utilizar investigación web configurada, con fuentes oficiales y sin enviar datos privados del cliente. La búsqueda no es acceso automático a Google ni a sistemas comerciales de ENTEL. Datos de cuenta y tickets proceden del backend autorizado; las explicaciones técnicas también usan conocimiento del modelo y conocimiento aprobado del sistema.
6. Si una prueba segura resuelve la falla, se confirma la solución. Si requiere revisión, se propone un reclamo. El backend solo confirma el registro después de guardar el ticket real; una duda o una negativa no equivale a autorización.
7. El backend calcula prioridad por gravedad, tipo de falla y categoría verificada. Daño eléctrico tiene prioridad alta incluso en hogar. Una institución con lentitud no desplaza automáticamente una emergencia. En igualdad se utiliza antigüedad. No se usan importes, facturación ni pagos.
8. Consultas ajenas a internet, FTTH o a las funciones del portal se redirigen al ámbito del servicio.

## Diez conversaciones que puede probar el cliente

Estos son escenarios y comportamientos esperados, no diez nuevas ejecuciones pagadas de GPT ni textos exactos garantizados.

| Inicio del cliente | Continuación esperada |
|---|---|
| Buenos días, ¿qué puedes hacer? | Explica soporte FTTH, perfil y consulta de reclamos, y pregunta qué necesita. |
| Mi router huele a quemado | Atiende primero la seguridad; evita pruebas de reinicio y orienta a revisión técnica. |
| Entonces, ¿tiene que venir alguien? | Explica que puede requerir revisión del equipo; no promete visita o fecha no registrada y responde antes de pedir autorización. |
| Me mudé, ¿puedo llevarme el equipo? | Explica que el traslado requiere validar nueva dirección, cobertura y gestión con el operador; no lo confunde con un cable roto. |
| Tengo luz LOS roja y no hay internet | Investiga pérdida óptica con comprobaciones seguras y escala si persiste. |
| Internet lento por WiFi y por cable | Distingue cobertura WiFi de lentitud general y evita repetir pruebas ya realizadas. |
| Solo falla mi celular | Investiga ese dispositivo antes de concluir que todo el servicio está caído. |
| Ya funciona, gracias | Reconoce la solución sin crear un ticket innecesario. |
| No registres reclamo por ahora | Respeta la negativa y permite retomar el caso. |
| ¿Cómo va mi reclamo y quién es el técnico? | Consulta únicamente tickets del cliente autenticado y no inventa asignaciones o fechas. |

## Verificación del cambio

- Suite general: 151 pruebas, 144 correctas, siete opcionales omitidas.
- PostgreSQL real: dos pruebas adicionales correctas, con rollback.
- Regresión económica: dos pruebas correctas; los importes inyectados no cambian prioridad y el código activo ya no lee columnas económicas.
- Frontend: compilación correcta.
- Backend local reiniciado y salud de PostgreSQL comprobada.
- Capturas: login real, guardado real del teléfono, perfil bloqueado y conversación reproducida de la validación anterior. Cero llamadas nuevas a OpenAI en este recorrido visual; cero imágenes generadas.
- No se afirma ausencia absoluta de errores del modelo. Las pruebas posteriores del usuario con GPT activo sí pueden consumir tokens.

La migración 015 elimina exclusivamente los campos económicos añadidos para priorización. El registro de consumo de la API permanece, porque controla el presupuesto de OpenAI y no la prioridad de los clientes.
