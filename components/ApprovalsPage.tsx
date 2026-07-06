"use client";

import { useEffect, useMemo, useState } from "react";
import { companyProfile } from "@/data/company";
import type { UserRole } from "@/types/quote";

type CurrentUser = { id: string; name: string; email: string; role: UserRole };
type ApprovalUser = { id: string; name: string; email: string; role: UserRole };
type ApprovalQuote = { id: string; folio: string } | null;
type ApprovalQuoteItem = { id: string; name: string; unitPrice: number } | null;

type Approval = {
  id: string;
  quoteId: string | null;
  quote: ApprovalQuote;
  quoteItemId: string | null;
  quoteItem: ApprovalQuoteItem;
  requestedByUserId: string;
  requestedBy: ApprovalUser;
  resolvedByUserId: string | null;
  resolvedBy: ApprovalUser | null;
  type: string;
  status: string;
  reason: string | null;
  resolutionNotes: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  requestedAt: string;
  resolvedAt: string | null;
};

const roleLabels: Record<UserRole, string> = {
  admin: "ADMIN",
  supervisor: "SUPERVISOR",
  ventas: "VENTAS",
  operacion: "OPERACIÓN",
  lectura: "LECTURA",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const typeLabels: Record<string, string> = {
  discount_over_10: "Descuento mayor a 10%",
  quote_item_price_change: "Cambio de precio en cotización",
  manual_priced_item: "Concepto manual con precio",
  catalog_price_change: "Cambio de precio en catálogo",
  pricing_rule_change: "Cambio en reglas comerciales",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function safeJson(value: unknown) {
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value, null, 2);
}

function getStatusClass(status: string) {
  if (status === "approved") return "accepted";
  if (status === "rejected" || status === "cancelled") return "rejected";
  return "draft";
}

export function ApprovalsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => typeFilter === "all" || approval.type === typeFilter);
  }, [approvals, typeFilter]);

  const pendingCount = approvals.filter((approval) => approval.status === "pending").length;

  async function loadApprovals(nextStatus = statusFilter) {
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

      const params = new URLSearchParams({ take: "100" });
      if (nextStatus !== "all") params.set("status", nextStatus);

      const response = await fetch(`/api/approvals?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { ok?: boolean; approvals?: Approval[]; error?: string };

      if (!response.ok || !data.ok || !Array.isArray(data.approvals)) {
        setError(data.error ?? "No se pudieron cargar las autorizaciones.");
        return;
      }

      setApprovals(data.approvals);
    } catch (loadError) {
      console.error("No se pudieron cargar autorizaciones.", loadError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveApproval(approval: Approval, status: "approved" | "rejected") {
    setSavingId(approval.id);
    setError("");

    try {
      const response = await fetch(`/api/approvals/${approval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolutionNotes: notesById[approval.id] ?? "",
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "No se pudo resolver la autorización.");
        return;
      }

      await loadApprovals(statusFilter);
    } catch (saveError) {
      console.error("No se pudo resolver autorización.", saveError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    void loadApprovals("pending");
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <section className="brand">
          <div className="brand-mark">PW</div>
          <div>
            <h1 className="brand-title">Autorizaciones</h1>
            <p className="brand-subtitle">{companyProfile.name} · Solicitudes de aprobación comercial y cambios sensibles</p>
          </div>
        </section>
        <div className="pill-row">
          <a className="pill" href="/">Volver al cotizador</a>
          <a className="pill" href="/users">Usuarios</a>
          <a className="pill" href="/audit">Bitácora</a>
          {currentUser && <span className="pill">Sesión: {currentUser.name}</span>}
          {currentUser && <span className="pill">Rol: {roleLabels[currentUser.role]}</span>}
        </div>
      </header>

      {loading && approvals.length === 0 ? (
        <section className="card">
          <h2>Cargando autorizaciones...</h2>
          <p>Validando sesión, permisos y solicitudes pendientes.</p>
        </section>
      ) : error ? (
        <section className="card">
          <div className="form-alert danger">{error}</div>
          <button className="btn ghost" type="button" onClick={() => void loadApprovals(statusFilter)}>Reintentar</button>
        </section>
      ) : (
        <section className="grid">
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Panel de autorizaciones</h2>
                <p>{pendingCount} pendientes en la vista actual. Filtra por estatus y tipo de solicitud.</p>
              </div>
              <button className="btn ghost" disabled={loading} type="button" onClick={() => void loadApprovals(statusFilter)}>Recargar</button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Estatus</label>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    setStatusFilter(nextStatus);
                    void loadApprovals(nextStatus);
                  }}
                >
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                  <option value="cancelled">Canceladas</option>
                  <option value="all">Todas</option>
                </select>
              </div>
              <div className="field">
                <label>Tipo</label>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="table-like">
              {filteredApprovals.length === 0 ? (
                <article className="history-row">
                  <div>
                    <h4>Sin autorizaciones</h4>
                    <p>No hay solicitudes que coincidan con los filtros actuales.</p>
                  </div>
                </article>
              ) : (
                filteredApprovals.map((approval) => (
                  <article className="history-row audit-row" key={approval.id}>
                    <div>
                      <div className="history-heading">
                        <h4>{typeLabels[approval.type] ?? approval.type.replaceAll("_", " ")}</h4>
                        <span className={`status-badge ${getStatusClass(approval.status)}`}>{statusLabels[approval.status] ?? approval.status}</span>
                      </div>
                      <p>
                        <strong>{approval.requestedBy.name}</strong> · {approval.requestedBy.email}
                      </p>
                      <div className="meta-row">
                        <span className="meta">Solicitada: {formatDateTime(approval.requestedAt)}</span>
                        {approval.quote?.folio && <span className="meta">Cotización: {approval.quote.folio}</span>}
                        {approval.quoteItem?.name && <span className="meta">Concepto: {approval.quoteItem.name}</span>}
                        {approval.resolvedBy && <span className="meta">Resolvió: {approval.resolvedBy.name}</span>}
                        {approval.resolvedAt && <span className="meta">Resuelta: {formatDateTime(approval.resolvedAt)}</span>}
                      </div>

                      {approval.reason && <p><strong>Motivo:</strong> {approval.reason}</p>}
                      {approval.resolutionNotes && <p><strong>Notas de resolución:</strong> {approval.resolutionNotes}</p>}

                      {approval.status === "pending" && (
                        <div className="form-grid">
                          <div className="field full">
                            <label>Notas de resolución</label>
                            <textarea
                              value={notesById[approval.id] ?? ""}
                              onChange={(event) => setNotesById({ ...notesById, [approval.id]: event.target.value })}
                              placeholder="Opcional: motivo de aprobación o rechazo"
                            />
                          </div>
                          <div className="split-actions full">
                            <button className="btn success" disabled={savingId === approval.id} type="button" onClick={() => void resolveApproval(approval, "approved")}>Aprobar</button>
                            <button className="btn danger" disabled={savingId === approval.id} type="button" onClick={() => void resolveApproval(approval, "rejected")}>Rechazar</button>
                          </div>
                        </div>
                      )}

                      <details className="audit-details">
                        <summary>Ver detalle técnico</summary>
                        <div className="audit-json-grid">
                          <div><strong>Antes</strong><pre>{safeJson(approval.before)}</pre></div>
                          <div><strong>Después</strong><pre>{safeJson(approval.after)}</pre></div>
                          <div><strong>Metadata</strong><pre>{safeJson(approval.metadata)}</pre></div>
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
