import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
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
