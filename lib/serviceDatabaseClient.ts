import type { ServiceItem } from "@/types/quote";

type ServiceSyncResult = {
  ok: boolean;
  error?: string;
};

export async function syncServiceToDatabase(service: ServiceItem): Promise<ServiceSyncResult> {
  try {
    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(service),
    });
    const payload = (await response.json().catch(() => null)) as ServiceSyncResult | null;

    if (!response.ok || !payload?.ok) {
      return { ok: false, error: payload?.error ?? "No se pudo sincronizar el catálogo." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo sincronizar el catálogo." };
  }
}

export async function deleteServiceFromDatabase(serviceId: string): Promise<ServiceSyncResult> {
  try {
    const response = await fetch(`/api/services?id=${encodeURIComponent(serviceId)}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as ServiceSyncResult | null;

    if (!response.ok || !payload?.ok) {
      return { ok: false, error: payload?.error ?? "No se pudo eliminar el servicio." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo eliminar el servicio." };
  }
}
