# Reglas de seguridad y operación

Proyecto: Pragma Works - Cotizador comercial  
Versión del documento: Sprint 1.5  
Estado: Base obligatoria antes de backend, login, base de datos y producción.

---

## 1. Objetivo

Este documento define las reglas mínimas de seguridad, operación y control interno para el cotizador de Pragma Works.

La aplicación manejará información comercial, montos de cotizaciones, datos de clientes, condiciones de pago, vencimientos, servicios contratados y posiblemente información sensible de proyectos. Por eso, antes de migrar a backend y base de datos, se establecen candados para reducir riesgos como:

- Robo de información comercial.
- Modificación no autorizada de precios.
- Eliminación accidental o maliciosa de cotizaciones.
- Inyección SQL.
- Ataques de fuerza bruta.
- Abuso de API.
- Exposición de secretos.
- Accesos indebidos por usuarios internos.
- Pérdida de datos por fallas o errores operativos.

Ningún control elimina el riesgo al 100%. El objetivo es que la app no quede “pelada” y que el sistema tenga capas de defensa.

---

## 2. Roles autorizados

Los roles iniciales serán:

| Rol | Uso principal |
|---|---|
| ADMIN | Dueño del sistema. Control total. |
| SUPERVISOR | Revisión, aprobación, reportes y control comercial. |
| VENTAS | Crear cotizaciones y dar seguimiento a clientes. |
| OPERACION | Ver proyectos aceptados y actualizar avance operativo. |
| LECTURA | Consulta sin permisos de modificación. |

---

## 3. Permisos por rol

| Acción | ADMIN | SUPERVISOR | VENTAS | OPERACION | LECTURA |
|---|---:|---:|---:|---:|---:|
| Crear cotización | Sí | Sí | Sí | No | No |
| Editar cotización en borrador | Sí | Sí | Sí, sólo propias | No | No |
| Cambiar cotización a enviada | Sí | Sí | Sí | No | No |
| Cambiar cotización a aceptada | Sí | Sí | No, requiere aprobación | No | No |
| Cambiar cotización a rechazada | Sí | Sí | Sí, sólo propias | No | No |
| Ver todas las cotizaciones | Sí | Sí | No, sólo propias | Sólo aceptadas/asignadas | Sí, si se autoriza |
| Eliminar cotizaciones | No directo | No directo | No | No | No |
| Archivar cotizaciones | Sí | Sí | No | No | No |
| Editar precios base | Sí | No | No | No | No |
| Editar catálogo | Sí | Con permiso | No | No | No |
| Aprobar descuentos | Sí | Sí, hasta límite | No | No | No |
| Ver reportes financieros | Sí | Sí | Limitado | No | No |
| Exportar PDF cliente | Sí | Sí | Sí | No | No |
| Exportar CSV financiero | Sí | Sí | No | No | No |
| Administrar usuarios | Sí | No | No | No | No |

Regla crítica: el rol se valida en el servidor. No basta con ocultar botones en la pantalla.

---

## 4. Estados de cotización

Estados permitidos:

| Estado | Significado |
|---|---|
| BORRADOR | Se está armando. Puede cambiar. |
| ENVIADA | Ya se presentó al cliente. Debe quedar congelada. |
| ACEPTADA | Cliente aprobó. Debe pasar a operación. |
| RECHAZADA | Cliente no aceptó. Queda como historial. |
| ARCHIVADA | Se oculta de operación diaria, pero no se elimina. |

---

## 5. Reglas de edición de cotizaciones

1. Una cotización en BORRADOR se puede editar libremente según permisos.
2. Una cotización ENVIADA no se debe editar directamente.
3. Si una cotización ENVIADA necesita cambios, se crea una revisión nueva.
4. Formato sugerido de revisión: `PW-000015-R2`, `PW-000015-R3`.
5. Una cotización ACEPTADA no se puede editar en precio, conceptos ni condiciones comerciales.
6. Si una cotización ACEPTADA cambia, debe crearse una orden de cambio o nueva cotización.
7. Una cotización RECHAZADA no se borra; se conserva para historial.
8. No se permite eliminar cotizaciones ENVIADAS o ACEPTADAS.
9. El folio nunca debe cambiar.
10. El total enviado al cliente debe quedar congelado aunque después cambie el catálogo.

---

## 6. Reglas de descuentos

| Descuento | Regla |
|---|---|
| 0% a 10% | Puede aplicarlo VENTAS si captura motivo. |
| Más de 10% y hasta 20% | Requiere aprobación de SUPERVISOR. |
| Más de 20% | Sólo ADMIN. |
| Servicios críticos | No aceptan descuento libre. |
| Descuento sin motivo | No permitido. |

Todo descuento debe guardar:

- Usuario que lo aplicó.
- Fecha y hora.
- Motivo.
- Porcentaje.
- Monto descontado.
- Usuario que lo aprobó, si aplica.

---

## 7. Reglas del PDF de cliente

El PDF enviado al cliente debe incluir:

- Nombre comercial de la empresa.
- Folio.
- Fecha de emisión.
- Vigencia.
- Datos del cliente.
- Nombre del proyecto.
- Conceptos cotizados.
- Totales.
- Mensualidad, si aplica.
- Renovación anual, si aplica.
- Condiciones de pago.
- Qué incluye.
- Qué no incluye.
- Cláusula de confidencialidad.

El PDF enviado al cliente NO debe incluir:

- Costos internos.
- Margen de ganancia.
- Fórmulas internas.
- Horas internas si se decide manejarlas como dato privado.
- Notas privadas.
- Comentarios internos de negociación.

---

## 8. Reglas del catálogo y precios

1. Sólo ADMIN puede cambiar precios base.
2. SUPERVISOR puede proponer cambios, pero no publicarlos sin autorización.
3. VENTAS no puede modificar precios globales.
4. Un servicio usado en cotizaciones anteriores no debe eliminarse físicamente.
5. Los servicios se desactivan, no se borran.
6. Si cambia el precio de un servicio, el nuevo precio sólo aplica a cotizaciones nuevas.
7. La cotización debe guardar una copia del precio, nombre y descripción usados al momento de cotizar.
8. Todo cambio de catálogo debe registrar auditoría.

---

## 9. Datos sensibles

Se consideran datos sensibles o protegidos dentro de la aplicación:

- Información de clientes.
- Correos, teléfonos y contactos.
- Montos cotizados.
- Condiciones de pago.
- Descuentos.
- Servicios contratados.
- Fechas de entrega.
- Datos internos de operación.
- Usuarios y permisos.
- Logs de auditoría.
- Tokens, contraseñas, claves API y secretos.

Regla: los datos sensibles no deben exponerse en consola del navegador, URLs, mensajes de error públicos ni repositorios.

---

## 10. Antídoto contra SQL Injection

Cuando exista backend y base de datos:

1. No se permite construir queries concatenando texto con datos del usuario.
2. Se deben usar consultas parametrizadas, ORM seguro o prepared statements.
3. Si se usa Prisma, Drizzle u otro ORM, se debe evitar SQL raw salvo justificación técnica.
4. Si se usa SQL raw, debe usar parámetros, nunca concatenación directa.
5. Toda entrada del usuario debe validarse antes de llegar a la base de datos.
6. Los campos tipo fecha, número, moneda, booleano y enum deben convertirse a su tipo real antes de procesarse.
7. Los filtros dinámicos deben usar listas permitidas, no nombres libres de columnas enviados por usuario.
8. El usuario de base de datos usado por la app debe tener privilegios mínimos.
9. La app no debe conectarse a la base de datos con usuario root/admin.
10. Los errores SQL no se muestran al usuario final.

Regla técnica: si un dato viene del usuario, se trata como peligroso hasta que se valide.

---

## 11. Antídoto contra DDoS y abuso de API

Un ataque DDoS no se resuelve sólo con código de la app. Se necesita defensa por capas:

### Capa pública

- Usar CDN/WAF delante de la aplicación cuando esté en producción.
- Activar protección contra bots y tráfico sospechoso.
- Bloquear países o regiones si el negocio no los necesita.
- Aplicar reglas contra requests anormales.

### Capa de aplicación

- Rate limit por IP.
- Rate limit por usuario autenticado.
- Límite de intentos de login.
- Bloqueo temporal por intentos fallidos.
- Límite de tamaño de payload.
- Timeout de requests lentos.
- Paginación obligatoria en listados.
- No permitir exportaciones masivas sin permisos.

### Capa de servidor

- Logs de tráfico.
- Alertas por picos de requests.
- Recursos separados para app y base de datos.
- Base de datos no expuesta públicamente.
- Backups fuera del servidor principal.

Regla: el sistema debe poder bloquear abuso sin tirar la aplicación completa.

---

## 12. Autenticación

Cuando se implemente login:

1. Las contraseñas nunca se guardan en texto plano.
2. Las contraseñas deben almacenarse con hashing seguro.
3. Debe existir política de longitud mínima.
4. Debe existir bloqueo temporal por intentos fallidos.
5. Se recomienda 2FA para ADMIN y SUPERVISOR.
6. Las sesiones deben expirar.
7. El logout debe invalidar la sesión.
8. No se deben revelar mensajes como “usuario existe” o “correo no registrado” en login público.
9. El reset de contraseña debe usar token temporal.
10. Los tokens de recuperación deben expirar.

---

## 13. Autorización

Autenticación significa saber quién es el usuario.  
Autorización significa validar qué puede hacer.

Reglas:

1. Todas las acciones críticas deben validar permisos en backend.
2. No se debe confiar en permisos del frontend.
3. Cada endpoint debe revisar rol y propiedad del recurso.
4. VENTAS sólo puede ver sus cotizaciones, salvo permiso especial.
5. OPERACION sólo ve cotizaciones aceptadas o proyectos asignados.
6. LECTURA no puede editar aunque modifique manualmente el frontend.
7. Las exportaciones deben validar permisos.

---

## 14. Seguridad de API

La API debe implementar:

- Validación de entrada.
- Sanitización cuando aplique.
- Rate limit.
- CORS restrictivo.
- Respuestas de error controladas.
- Logs de eventos críticos.
- Validación de sesión en cada endpoint privado.
- Protección contra CSRF si se usan cookies.
- Protección contra XSS en campos mostrados al usuario.
- Límite de tamaño para archivos y JSON.
- Paginación en consultas grandes.

---

## 15. Auditoría obligatoria

Se debe guardar auditoría de:

- Login exitoso.
- Login fallido.
- Creación de cotización.
- Cambio de estado.
- Cambio de precio.
- Aplicación de descuento.
- Aprobación de descuento.
- Exportación de PDF.
- Exportación de CSV.
- Cambio de catálogo.
- Cambio de permisos.
- Archivado de cotización.

Cada log debe incluir:

- Usuario.
- Fecha y hora.
- Acción.
- Recurso afectado.
- Valor anterior cuando aplique.
- Valor nuevo cuando aplique.
- IP aproximada o metadata de sesión cuando aplique.

---

## 16. Secretos y variables de entorno

Nunca deben subirse a GitHub:

- Contraseñas.
- Tokens.
- API keys.
- Cadenas de conexión.
- Llaves privadas.
- Secretos JWT.
- Credenciales de correo.
- Credenciales de base de datos.

Reglas:

1. Usar `.env` local.
2. Subir sólo `.env.example` sin secretos reales.
3. Agregar `.env*` al `.gitignore`, excepto `.env.example`.
4. Rotar secretos si se filtran.
5. Separar secretos de desarrollo, pruebas y producción.

---

## 17. Base de datos

Reglas mínimas:

1. La base de datos no debe estar pública en internet.
2. Usuario de app con permisos mínimos.
3. Usuario admin sólo para mantenimiento.
4. Backups automáticos.
5. Prueba periódica de restauración.
6. Índices en campos de búsqueda.
7. Migraciones controladas.
8. No borrar datos críticos físicamente; usar archivado o soft delete.
9. Cifrado en tránsito.
10. Cifrado en reposo cuando el proveedor lo soporte.

---

## 18. Backups y recuperación

Se debe definir:

- Backup diario de base de datos.
- Retención mínima de 30 días.
- Backup antes de migraciones importantes.
- Procedimiento de restauración documentado.
- Prueba de restauración al menos cada cierto periodo.
- Exportación manual para emergencia.

Regla: un backup que nunca se ha probado no cuenta como backup confiable.

---

## 19. Ambientes

Deben existir ambientes separados:

| Ambiente | Uso |
|---|---|
| Local | Desarrollo individual. |
| Staging / Pruebas | Validación antes de producción. |
| Producción | Datos reales. |

Reglas:

1. No probar cambios peligrosos directo en producción.
2. No usar datos reales en local sin autorización.
3. No mezclar credenciales de producción con desarrollo.
4. No subir dumps reales a GitHub.

---

## 20. Seguridad del frontend

Aunque el frontend no es la seguridad principal, debe cumplir:

- No mostrar botones no autorizados.
- No guardar secretos reales en localStorage.
- No confiar en localStorage para permisos reales.
- No mostrar errores técnicos internos.
- Escapar o controlar texto que viene de usuarios.
- No insertar HTML libre de usuarios.
- No exponer tokens largos innecesariamente.

Regla: el frontend mejora la experiencia, pero la seguridad real se valida en backend.

---

## 21. Reglas para exportaciones

### PDF de cliente

- Puede usarlo VENTAS, SUPERVISOR y ADMIN.
- No incluye datos internos.
- Debe registrar auditoría.

### CSV financiero

- Sólo SUPERVISOR y ADMIN.
- Debe registrar auditoría.
- Debe incluir sólo columnas autorizadas.

### Reportes internos

- No se envían a clientes.
- Pueden contener información operativa.
- No deben incluir secretos ni información técnica sensible.

---

## 22. Producción: checklist obligatorio

Antes de publicar una versión productiva:

- [ ] Login implementado.
- [ ] Roles implementados en backend.
- [ ] Contraseñas con hash seguro.
- [ ] Sesiones seguras.
- [ ] Variables sensibles fuera de GitHub.
- [ ] Base de datos privada.
- [ ] Consultas parametrizadas / ORM seguro.
- [ ] Validación de entradas.
- [ ] Rate limiting.
- [ ] Protección anti abuso.
- [ ] Backups configurados.
- [ ] Restauración probada.
- [ ] Auditoría activa.
- [ ] Logs de errores.
- [ ] Manejo seguro de errores.
- [ ] CORS restrictivo.
- [ ] HTTPS activo.
- [ ] WAF/CDN definido si la app será pública.
- [ ] Usuario ADMIN inicial protegido.
- [ ] 2FA recomendado para usuarios críticos.

---

## 23. Decisiones técnicas sugeridas para Sprint 2

Para backend y base de datos se recomienda:

- Next.js para frontend.
- API backend controlada.
- PostgreSQL como base de datos.
- ORM con consultas parametrizadas.
- Validación de datos con schemas.
- Autenticación segura.
- RBAC real.
- Auditoría en tabla dedicada.
- Docker sólo cuando el flujo ya esté estable.

No se debe meter Docker, Prisma, PostgreSQL y login todos juntos sin validar por partes.

---

## 24. Reglas de avance del proyecto

Orden recomendado:

1. Documentar reglas de seguridad y operación.
2. Ajustar la UI para respetar reglas de negocio locales.
3. Diseñar modelo de datos.
4. Crear backend mínimo.
5. Crear base de datos.
6. Implementar login.
7. Implementar roles.
8. Migrar cotizaciones de localStorage a servidor.
9. Implementar auditoría.
10. Preparar deploy seguro.

---

## 25. Fuentes técnicas base

Estas reglas se basan en prácticas comunes de seguridad web y controles recomendados por OWASP, especialmente para prevención de inyección SQL, autenticación, control de acceso, validación de entradas, gestión de secretos, monitoreo y defensa por capas.

Referencias útiles:

- OWASP SQL Injection Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Top 10: https://owasp.org/Top10/

---

## 26. Regla final

Si una función maneja dinero, clientes, usuarios, precios, descuentos, permisos o archivos exportados, debe considerarse crítica.

Ninguna función crítica se libera a producción sin:

- Validación.
- Permisos.
- Auditoría.
- Manejo de errores.
- Prueba de abuso básico.
- Plan de respaldo.
