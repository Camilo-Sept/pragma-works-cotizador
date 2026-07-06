"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { companyProfile } from "@/data/company";
import type { UserRole } from "@/types/quote";

type UserPermissionKey =
  | "canApproveDiscountsOver10"
  | "canApprovePriceChanges"
  | "canApproveManualPricedItems"
  | "canApproveCatalogPriceChanges"
  | "canViewAuditLogs"
  | "canExportAuditLogs";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
  canApproveDiscountsOver10: boolean;
  canApprovePriceChanges: boolean;
  canApproveManualPricedItems: boolean;
  canApproveCatalogPriceChanges: boolean;
  canViewAuditLogs: boolean;
  canExportAuditLogs: boolean;
  createdAt: string;
  updatedAt: string;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type NewUserDraft = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
} & Record<UserPermissionKey, boolean>;

const roleLabels: Record<UserRole, string> = {
  admin: "ADMIN",
  supervisor: "SUPERVISOR",
  ventas: "VENTAS",
  operacion: "OPERACIÓN",
  lectura: "LECTURA",
};

const permissionLabels: Record<UserPermissionKey, string> = {
  canApproveDiscountsOver10: "Autorizar descuentos mayores al 10%",
  canApprovePriceChanges: "Autorizar cambios manuales de precio",
  canApproveManualPricedItems: "Autorizar conceptos manuales con precio",
  canApproveCatalogPriceChanges: "Autorizar cambios de precio de catálogo / reglas",
  canViewAuditLogs: "Ver bitácora",
  canExportAuditLogs: "Exportar bitácora",
};

const permissionKeys = Object.keys(permissionLabels) as UserPermissionKey[];

const emptyDraft: NewUserDraft = {
  name: "",
  email: "",
  password: "",
  role: "ventas",
  canApproveDiscountsOver10: false,
  canApprovePriceChanges: false,
  canApproveManualPricedItems: false,
  canApproveCatalogPriceChanges: false,
  canViewAuditLogs: false,
  canExportAuditLogs: false,
};

function formatDateTime(value: string | null) {
  if (!value) return "Nunca";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeUser(user: AdminUser): AdminUser {
  return {
    ...user,
    role: user.role.toLowerCase() as UserRole,
  };
}

export function UserAdminPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [draft, setDraft] = useState<NewUserDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const isAdmin = currentUser?.role === "admin";

  const filteredUsers = useMemo(() => {
    const search = filter.trim().toLowerCase();
    if (!search) return users;

    return users.filter((user) =>
      [user.name, user.email, roleLabels[user.role], user.active ? "activo" : "inactivo"]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [filter, users]);

  function showMessage(value: string) {
    setMessage(value);
    window.setTimeout(() => setMessage(""), 2400);
  }

  async function loadData() {
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

      const usersResponse = await fetch("/api/users", { cache: "no-store" });
      const usersData = (await usersResponse.json()) as { ok?: boolean; users?: AdminUser[]; error?: string };

      if (!usersResponse.ok || !usersData.ok || !Array.isArray(usersData.users)) {
        setError(usersData.error ?? "No se pudieron cargar los usuarios.");
        return;
      }

      setUsers(usersData.users.map(normalizeUser));
    } catch (loadError) {
      console.error("No se pudo cargar administración de usuarios.", loadError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateDraftPermission(key: UserPermissionKey, value: boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as { ok?: boolean; user?: AdminUser; error?: string };

      if (!response.ok || !data.ok || !data.user) {
        setError(data.error ?? "No se pudo crear el usuario.");
        return;
      }

      setUsers((current) => [normalizeUser(data.user as AdminUser), ...current]);
      setDraft(emptyDraft);
      showMessage("Usuario creado correctamente.");
    } catch (createError) {
      console.error("No se pudo crear usuario.", createError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function patchUser(userId: string, payload: Partial<AdminUser>) {
    setError("");

    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { ok?: boolean; user?: AdminUser; error?: string };

    if (!response.ok || !data.ok || !data.user) {
      throw new Error(data.error ?? "No se pudo actualizar el usuario.");
    }

    setUsers((current) => current.map((user) => (user.id === userId ? normalizeUser(data.user as AdminUser) : user)));
  }

  async function updateUserField(userId: string, payload: Partial<AdminUser>, successMessage: string) {
    setSaving(true);

    try {
      await patchUser(userId, payload);
      showMessage(successMessage);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/users/${user.id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = (await response.json()) as { ok?: boolean; user?: AdminUser; error?: string };

      if (!response.ok || !data.ok || !data.user) {
        setError(data.error ?? "No se pudo cambiar el estado del usuario.");
        return;
      }

      setUsers((current) => current.map((item) => (item.id === user.id ? normalizeUser(data.user as AdminUser) : item)));
      showMessage(data.user.active ? "Usuario reactivado." : "Usuario desactivado.");
    } catch (toggleError) {
      console.error("No se pudo cambiar estado.", toggleError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(user: AdminUser) {
    const password = window.prompt(`Nueva contraseña temporal para ${user.name}`);
    if (!password) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setError(data.error ?? "No se pudo resetear la contraseña.");
        return;
      }

      showMessage("Contraseña temporal actualizada.");
    } catch (resetError) {
      console.error("No se pudo resetear contraseña.", resetError);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <section className="brand">
          <div className="brand-mark">PW</div>
          <div>
            <h1 className="brand-title">Administración de usuarios</h1>
            <p className="brand-subtitle">{companyProfile.name} · Usuarios reales, permisos y checks de autorización</p>
          </div>
        </section>
        <div className="pill-row">
          <a className="pill" href="/">Volver al cotizador</a>
          <a className="pill" href="/audit">Bitácora</a>
          {currentUser && <span className="pill">Sesión: {currentUser.name}</span>}
          {currentUser && <span className="pill">Rol: {roleLabels[currentUser.role]}</span>}
        </div>
      </header>

      {message && <div className="toast-message">{message}</div>}

      {loading ? (
        <section className="card">
          <h2>Cargando usuarios...</h2>
          <p>Validando sesión y permisos de administrador.</p>
        </section>
      ) : !isAdmin ? (
        <section className="card">
          <div className="card-title">
            <div>
              <h2>Acceso restringido</h2>
              <p>Sólo usuarios ADMIN pueden administrar usuarios.</p>
            </div>
          </div>
          {error && <div className="form-alert danger">{error}</div>}
          <a className="btn primary" href="/">Volver al cotizador</a>
        </section>
      ) : (
        <section className="grid">
          {error && <div className="form-alert danger">{error}</div>}

          <section className="card">
            <div className="card-title">
              <div>
                <h2>Crear usuario</h2>
                <p>Los usuarios se desactivan, no se borran, para conservar la bitácora.</p>
              </div>
            </div>

            <form className="form-grid" onSubmit={createUser}>
              <div className="field">
                <label>Nombre</label>
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Ernesto" />
              </div>
              <div className="field">
                <label>Correo</label>
                <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="usuario@empresa.com" />
              </div>
              <div className="field">
                <label>Contraseña temporal</label>
                <input type="password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="Mínimo 10 caracteres" />
              </div>
              <div className="field">
                <label>Rol</label>
                <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}>
                  {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>

              <div className="field full">
                <label>Permisos especiales tipo check</label>
                <div className="permission-grid">
                  {permissionKeys.map((key) => (
                    <label className="permission-card" key={key}>
                      <input type="checkbox" checked={draft[key]} onChange={(event) => updateDraftPermission(key, event.target.checked)} />
                      <strong>{permissionLabels[key]}</strong>
                    </label>
                  ))}
                </div>
              </div>

              <div className="split-actions full">
                <button className="btn success" disabled={saving} type="submit">Crear usuario</button>
                <button className="btn ghost" disabled={saving} type="button" onClick={() => setDraft(emptyDraft)}>Limpiar</button>
              </div>
            </form>
          </section>

          <section className="card">
            <div className="card-title">
              <div>
                <h2>Usuarios</h2>
                <p>{users.length} usuarios registrados. Los permisos especiales permiten autorizar sin convertir a alguien en admin.</p>
              </div>
              <button className="btn ghost" disabled={saving} type="button" onClick={() => void loadData()}>Recargar</button>
            </div>

            <div className="field">
              <label>Buscar</label>
              <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Nombre, correo, rol o estatus" />
            </div>

            <div className="table-like">
              {filteredUsers.map((user) => (
                <article className="history-row" key={user.id}>
                  <div>
                    <div className="history-heading">
                      <h4>{user.name}</h4>
                      <span className={`status-badge ${user.active ? "accepted" : "rejected"}`}>{user.active ? "Activo" : "Inactivo"}</span>
                    </div>
                    <p><strong>{user.email}</strong></p>
                    <div className="meta-row">
                      <span className="meta">Rol: {roleLabels[user.role]}</span>
                      <span className="meta">Último login: {formatDateTime(user.lastLoginAt)}</span>
                      <span className="meta">Actualizado: {formatDateTime(user.updatedAt)}</span>
                    </div>
                    <div className="permission-list">
                      {permissionKeys.filter((key) => user[key]).length === 0 ? (
                        <span>Sin permisos especiales</span>
                      ) : (
                        permissionKeys.filter((key) => user[key]).map((key) => <span key={key}>{permissionLabels[key]}</span>)
                      )}
                    </div>
                  </div>

                  <div className="history-actions">
                    <select
                      disabled={saving}
                      value={user.role}
                      onChange={(event) => void updateUserField(user.id, { role: event.target.value as UserRole }, "Rol actualizado.")}
                    >
                      {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                        <option key={role} value={role}>{roleLabels[role]}</option>
                      ))}
                    </select>

                    {permissionKeys.map((key) => (
                      <label className="compact-check" key={key} title={permissionLabels[key]}>
                        <input
                          disabled={saving}
                          type="checkbox"
                          checked={user[key]}
                          onChange={(event) => void updateUserField(user.id, { [key]: event.target.checked }, "Permiso actualizado.")}
                        />
                        {permissionLabels[key].replace("Autorizar ", "")}
                      </label>
                    ))}

                    <button className="btn ghost" disabled={saving} type="button" onClick={() => resetPassword(user)}>Reset password</button>
                    <button className={user.active ? "btn danger" : "btn success"} disabled={saving} type="button" onClick={() => toggleActive(user)}>
                      {user.active ? "Desactivar" : "Reactivar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
