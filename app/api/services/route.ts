import { NextResponse } from "next/server";
import {
  AuditAction,
  BillingType as DatabaseBillingType,
  ServiceCategory as DatabaseServiceCategory,
  ServiceSource,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/serverAuth";
import type { BillingType, ServiceCategory, ServiceItem } from "@/types/quote";

export const dynamic = "force-dynamic";

function mapCategory(value: string): ServiceCategory {
  return value.toLowerCase() as ServiceCategory;
}

function mapBillingType(value: string): BillingType {
  if (value === "ONE_TIME") return "one_time";
  return value.toLowerCase() as BillingType;
}

function mapServiceSource(value: string): "catalog" | "manual" {
  return value.toLowerCase() as "catalog" | "manual";
}

const categoryMap: Record<ServiceCategory, DatabaseServiceCategory> = {
  web: DatabaseServiceCategory.WEB,
  system: DatabaseServiceCategory.SYSTEM,
  mobile: DatabaseServiceCategory.MOBILE,
  desktop: DatabaseServiceCategory.DESKTOP,
  automation: DatabaseServiceCategory.AUTOMATION,
  ai: DatabaseServiceCategory.AI,
  support: DatabaseServiceCategory.SUPPORT,
  infrastructure: DatabaseServiceCategory.INFRASTRUCTURE,
  other: DatabaseServiceCategory.OTHER,
};

const billingTypeMap: Record<BillingType, DatabaseBillingType> = {
  one_time: DatabaseBillingType.ONE_TIME,
  monthly: DatabaseBillingType.MONTHLY,
  annual: DatabaseBillingType.ANNUAL,
  hourly: DatabaseBillingType.HOURLY,
};

function parseService(payload: unknown): ServiceItem | null {
  if (!payload || typeof payload !== "object") return null;

  const service = payload as Partial<ServiceItem>;
  if (
    typeof service.id !== "string" ||
    typeof service.name !== "string" ||
    typeof service.descriptionClient !== "string" ||
    typeof service.category !== "string" ||
    typeof service.billingType !== "string" ||
    typeof service.basePrice !== "number" ||
    typeof service.estimatedHours !== "number" ||
    typeof service.active !== "boolean" ||
    typeof service.requiresApproval !== "boolean" ||
    !categoryMap[service.category as ServiceCategory] ||
    !billingTypeMap[service.billingType as BillingType]
  ) {
    return null;
  }

  return {
    id: service.id.trim(),
    name: service.name.trim(),
    category: service.category as ServiceCategory,
    descriptionClient: service.descriptionClient.trim(),
    descriptionInternal: service.descriptionInternal?.trim() || undefined,
    billingType: service.billingType as BillingType,
    basePrice: Math.max(0, service.basePrice),
    estimatedHours: Math.max(0, service.estimatedHours),
    active: service.active,
    source: "catalog",
    requiresApproval: service.requiresApproval,
    visibleToClient: service.visibleToClient ?? true,
  };
}

export async function GET() {
  try {
    const auth = await requireAuth();

    if (!auth.ok) {
      return auth.response;
    }

    const services = await prisma.service.findMany({
      orderBy: [
        { active: "desc" },
        { category: "asc" },
        { name: "asc" },
      ],
    });

    const mappedServices: ServiceItem[] = services.map((service) => ({
      id: service.id,
      name: service.name,
      category: mapCategory(service.category),
      descriptionClient: service.descriptionClient,
      descriptionInternal: service.descriptionInternal ?? undefined,
      billingType: mapBillingType(service.billingType),
      basePrice: Number(service.basePrice),
      estimatedHours: Number(service.estimatedHours),
      active: service.active,
      source: mapServiceSource(service.source),
      requiresApproval: service.requiresApproval,
      visibleToClient: service.visibleToClient,
    }));

    return NextResponse.json({ services: mappedServices });
  } catch (error) {
    console.error("Error loading services from database", error);

    return NextResponse.json(
      { error: "No se pudo cargar el catálogo desde la base de datos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const service = parseService(await request.json().catch(() => null));
    if (!service || !service.id || !service.name) {
      return NextResponse.json({ ok: false, error: "Datos de servicio inválidos." }, { status: 400 });
    }

    const existing = await prisma.service.findUnique({ where: { id: service.id } });
    const data = {
      name: service.name,
      category: categoryMap[service.category],
      descriptionClient: service.descriptionClient,
      descriptionInternal: service.descriptionInternal ?? null,
      billingType: billingTypeMap[service.billingType],
      basePrice: service.basePrice,
      estimatedHours: service.estimatedHours,
      active: service.active,
      source: ServiceSource.CATALOG,
      requiresApproval: service.requiresApproval,
      visibleToClient: service.visibleToClient ?? true,
    };

    const saved = await prisma.$transaction(async (tx) => {
      const result = existing
        ? await tx.service.update({ where: { id: service.id }, data })
        : await tx.service.create({
            data: {
              id: service.id,
              ...data,
              createdByUserId: auth.user.id,
            },
          });

      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
          entityType: "service",
          entityId: result.id,
          before: existing
            ? {
                name: existing.name,
                basePrice: Number(existing.basePrice),
                active: existing.active,
                visibleToClient: existing.visibleToClient,
              }
            : undefined,
          after: {
            name: result.name,
            basePrice: Number(result.basePrice),
            active: result.active,
            visibleToClient: result.visibleToClient,
          },
        },
      });

      return result;
    });

    return NextResponse.json({ ok: true, service: saved });
  } catch (error) {
    console.error("Error saving service", error);
    return NextResponse.json({ ok: false, error: "No se pudo guardar el servicio." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const serviceId = new URL(request.url).searchParams.get("id")?.trim();
    if (!serviceId) {
      return NextResponse.json({ ok: false, error: "Falta el ID del servicio." }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ ok: true });
    }

    if (!service.createdByUserId) {
      return NextResponse.json(
        { ok: false, error: "Los servicios base se restauran o desactivan; no se eliminan." },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorUserId: auth.user.id,
          action: AuditAction.DELETE,
          entityType: "service",
          entityId: service.id,
          before: {
            name: service.name,
            basePrice: Number(service.basePrice),
            visibleToClient: service.visibleToClient,
          },
        },
      });
      await tx.service.delete({ where: { id: service.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting service", error);
    return NextResponse.json({ ok: false, error: "No se pudo eliminar el servicio." }, { status: 500 });
  }
}
