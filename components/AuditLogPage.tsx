"use client";

import { useEffect, useMemo, useState } from "react";
import { companyProfile } from "@/data/company";
import type { UserRole } from "@/types/quote";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type AuditActor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
} | null;

type AuditQuote = {
  id: string;
  folio: string;
  projectName: string;
  clientName: string;
  status: string;
} | null;

type AuditLog = {
  id: string;
  actorUserId: string | null;
  actor: AuditActor;
  quoteId: string | null;
  quote: AuditQuote;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

const roleLabels: Record<UserRole, string> = {
  admin: "ADMIN",
  supervisor: "SUPERVISOR",
  ventas: "VENTAS",
  operacion: "OPERACIÓN",
  lectura: "LECTURA",
};

const actionLabels: Record<string, string> = {
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  archive: "Archivado",
  status_change: "Cambio de estado",
  create_revision: "Revisión creada",
  login: "Login correcto",
  logout: "Logout",
  login_failed: "Login fallido",
  user_create: "Usuario creado",
  user_update: "Usuario actualizado",
  user_disable: "Usuario desactivado",
  user_enable: "Usuario reactivado",
  password_reset: "Reset de contraseña",
  permission_update: "Permisos actualizados",
  discount_applied: "Descuento aplicado",
  discount_approval_requested: "Solicitud de descuento",
  discount_approved: "Descuento aprobado",
  discount_rejected: "Descuento rechazado",
  price_change_requested: "Solicitud cambio de precio",
  price_change_approved: "Cambio de precio aprobado",
  price_change_rejected: "Cambio de precio rechazado",
  manual_item_requested: "Solicitud concepto manual",
  manual_item_approved: "Concepto manual aprobado",
  manual_item_rejected: "Concepto manual rechazado",
  catalog_price_change_requested: "Solicitud cambio catálogo",
  catalog_price_change_approved: "Cambio catálogo aprobado",
  catalog_price_change_rejected: "Cambio catálogo rechazado",
  pricing_rule_change_requested: "Solicitud reglas comerciales",
  pricing_rule_change_approved: "Reglas comerciales aprobadas",
  pricing_rule_change_rejected: "Reglas comerciales rechazadas",
  approval_requested: "Autorización solicitada",
  approval_approved: "Autorización aprobada",
  approval_rejected: "Autorización rechazada",
  approval_cancelled: "Autorización cancelada",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getActionLabel(action: string) {
  return actionLabels[action] ?? action.replaceAll("_", " ");
}

function getActionClass(action: string) {
  if (action.includes("failed") || action.includes("rejected") || action.includes("disable")) return "rejected";
  if (action.includes("approved") || action.includes("login") || action.includes("enable") || action.includes("create")) return "accepted";
  return "draft";
}

function safeJson(value: unknown) {
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value, null, 2);
}

export function AuditLogPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      if (!matchesAction) return false;

      if (!normalizedSearch) return true;

      return [
        log.action,
        getActionLabel(log.action),
        log.entityType,
        log.entityId ?? "",
        log.actor?.name ?? "",
        log.actor?.email ?? "",
        log.quote?.folio ?? "",
        log.quote?.clientName ?? "",
        log.quote?.projectName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [actionFilter, logs, search]);

  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action))).sort(), [logs]);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = (await meResponse.json()) as { ok?: boolean; user?: CurrentUser | null; error?: string };

      if (!meResponse.ok || !meData.ok || !meData.user) {
        setCurrentUser(null);
        setError(meData.error ?? "Sesión requerida.");
        return;
      }

      setCurrentUser({ ...meData.user, role: meData.user.role.toLowerCase() as UserRole });

      const logsResponse = await fetch("/api/audit-logs?take=100", { cache: "no-store" });
      const logsData = (await logsResponse.json()) as { ok?: boolean; logs?: AuditLog[]; error?: string };

      if (!logsResponse.ok || !logsData.ok || !Array.isArray(logsData.logs)) {
        setError(logsData.error ?? "No se pudo cargar la bitácora.");
        return;
      }

      setLogs(logsData.logs);
    } catch (loadError) {
      console.error("No se pudo cargar bitácora.", loadError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <section className="brand">
          <div className="brand-mark">PW</div>
          <div>
            <h1 className="brand-title">Bitácora de movimientos</h1>
            <p className="brand-subtitle">{companyProfile.name} · Actividad de usuarios, autorizaciones y cambios críticos</p>
          </div>
        </section>
        <div className="pill-row">
          <a className="pill" href="/">Volver al cotizador</a>
          <a className="pill" href="/users">Usuarios</a>
          {currentUser && <span className="pill">Sesión: {currentUser.name}</span>}
          {currentUser && <span className="pill">Rol: {roleLabels[currentUser.role]}</span>}
        </div>
      </header>

      {loading ? (
        <section className="card">
          <h2>Cargando bitácora...</h2>
          <p>Validando sesión y permisos.</p>
        </section>
      ) : error ? (
        <section className="card">
          <div className="card-title">
            <div>
              <h2>No se pudo abrir la bitácora</h2>
              <p>Sólo ADMIN o usuarios con permiso especial pueden verla.</p>
            </div>
          </div>
          <div className="form-alert danger">{error}</div>
          <a className="btn primary" href="/">Volver al cotizador</a>
        </section>
      ) : (
        <section className="grid">
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Movimientos recientes</h2>
                <p>Últimos {logs.length} movimientos registrados en backend.</p>
              </div>
              <button className="btn ghost" type="button" onClick={() => void loadLogs()}>Recargar</button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Buscar</label>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Usuario, acción, folio, correo o entidad" />
              </div>
              <div className="field">
                <label>Acción</label>
                <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
                  <option value="all">Todas</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>{getActionLabel(action)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="table-like">
              {filteredLogs.length === 0 ? (
                <article className="history-row">
                  <div>
                    <h4>Sin resultados</h4>
                    <p>No hay movimientos que coincidan con los filtros.</p>
                  </div>
                </article>
              ) : (
                filteredLogs.map((log) => (
                  <article className="history-row audit-row" key={log.id}>
                    <div>
                      <div className="history-heading">
                        <h4>{getActionLabel(log.action)}</h4>
                        <span className={`status-badge ${getActionClass(log.action)}`}>{log.action}</span>
                      </div>
                      <p>
                        <strong>{log.actor?.name ?? "Sistema"}</strong>
                        {log.actor?.email ? ` · ${log.actor.email}` : ""}
                      </p>
                      <div className="meta-row">
                        <span className="meta">Fecha: {formatDateTime(log.createdAt)}</span>
                        <span className="meta">Entidad: {log.entityType}</span>
                        {log.entityId && <span className="meta">ID: {log.entityId}</span>}
                        {log.quote?.folio && <span className="meta">Cotización: {log.quote.folio}</span>}
                      </div>

                      <details className="audit-details">
                        <summary>Ver detalle técnico</summary>
                        <div className="audit-json-grid">
                          <div>
                            <strong>Antes</strong>
                            <pre>{safeJson(log.before)}</pre>
                          </div>
                          <div>
                            <strong>Después</strong>
                            <pre>{safeJson(log.after)}</pre>
                          </div>
                          <div>
                            <strong>Metadata</strong>
                            <pre>{safeJson(log.metadata)}</pre>
                          </div>
                        </div>
                      </details>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
