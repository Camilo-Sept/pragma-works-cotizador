# Checklist de seguridad por sprint

Proyecto: Pragma Works - Cotizador comercial

Este checklist se usa antes de cerrar cada sprint que toque datos, dinero, usuarios, precios o exportaciones.

---

## Checklist general

- [ ] La funcionalidad tiene permisos definidos.
- [ ] La funcionalidad respeta los roles ADMIN, SUPERVISOR, VENTAS, OPERACION y LECTURA.
- [ ] No expone secretos en frontend.
- [ ] No sube secretos al repositorio.
- [ ] No muestra errores técnicos al usuario final.
- [ ] No permite borrar información crítica sin control.
- [ ] No permite modificar cotizaciones aceptadas directamente.
- [ ] No permite modificar cotizaciones enviadas sin crear revisión.
- [ ] Congela precios usados en cotizaciones enviadas/aceptadas.
- [ ] Registra auditoría cuando aplique.

---

## Checklist para backend

- [ ] Endpoint protegido por sesión si es privado.
- [ ] Endpoint valida rol en servidor.
- [ ] Endpoint valida propiedad del recurso cuando aplique.
- [ ] Entrada validada con schema.
- [ ] No concatena SQL con entradas del usuario.
- [ ] Usa ORM seguro o consultas parametrizadas.
- [ ] Maneja errores sin revelar detalles internos.
- [ ] Tiene rate limit cuando aplica.
- [ ] Tiene paginación en listados.
- [ ] Tiene límite de tamaño de request.

---

## Checklist para base de datos

- [ ] Usuario de app no es root/admin.
- [ ] Permisos mínimos.
- [ ] Migración revisada.
- [ ] Backup antes de migración importante.
- [ ] Datos críticos usan soft delete o archivado.
- [ ] Tablas críticas tienen timestamps.
- [ ] Tablas críticas tienen created_by / updated_by cuando aplique.
- [ ] Índices en búsquedas frecuentes.

---

## Checklist para login

- [ ] Password hash seguro.
- [ ] Bloqueo temporal por intentos fallidos.
- [ ] Sesión expira.
- [ ] Logout invalida sesión.
- [ ] No se revela si el usuario existe.
- [ ] Reset de contraseña usa token temporal.
- [ ] 2FA recomendado para ADMIN y SUPERVISOR.

---

## Checklist para PDF y CSV

- [ ] PDF cliente no muestra datos internos.
- [ ] PDF cliente no muestra costos internos ni margen.
- [ ] CSV financiero limitado a ADMIN/SUPERVISOR.
- [ ] Exportación registra auditoría.
- [ ] Exportación respeta filtros visibles.
- [ ] Exportación no incluye secretos ni tokens.

---

## Checklist antes de producción

- [ ] HTTPS activo.
- [ ] Variables de entorno configuradas.
- [ ] Base de datos privada.
- [ ] Backups automáticos.
- [ ] Restauración probada.
- [ ] Logs activos.
- [ ] Alertas básicas.
- [ ] WAF/CDN definido si la app es pública.
- [ ] Rate limiting activo.
- [ ] CORS restrictivo.
- [ ] Usuario ADMIN inicial protegido.
- [ ] Documentación de recuperación lista.
