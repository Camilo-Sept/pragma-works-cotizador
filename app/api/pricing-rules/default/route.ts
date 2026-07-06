import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/serverAuth";
import type { PricingRules } from "@/types/quote";

export const dynamic = "force-dynamic";

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rulesFromRuleSet(ruleSet: {
  riskPercent: unknown;
  urgencyPercent: unknown;
  commissionPercent: unknown;
  discountPercent: unknown;
  aiEfficiencyPercent: unknown;
  deliveryMarginMultiplier: unknown;
  developerCount: unknown;
  hoursPerDeveloperDay: unknown;
  deliveryAvailabilityPercent: unknown;
  deliveryBacklogHours: unknown;
  sourceDeliveryPercent: unknown;
  sourceBuyoutPercent: unknown;
  rentalInitialPercent: unknown;
  rentalMonthlyPercent: unknown;
  hybridInitialPercent: unknown;
  hybridMonthlyPercent: unknown;
  minimumOneTimePrice: unknown;
  minimumMonthlyPrice: unknown;
  websiteAnnualRenewal: unknown;
}): PricingRules {
  return {
    riskPercent: Number(ruleSet.riskPercent),
    urgencyPercent: Number(ruleSet.urgencyPercent),
    commissionPercent: Number(ruleSet.commissionPercent),
    discountPercent: Number(ruleSet.discountPercent),
    aiEfficiencyPercent: Number(ruleSet.aiEfficiencyPercent),
    deliveryMarginMultiplier: Number(ruleSet.deliveryMarginMultiplier),
    developerCount: Number(ruleSet.developerCount),
    hoursPerDeveloperDay: Number(ruleSet.hoursPerDeveloperDay),
    deliveryAvailabilityPercent: Number(ruleSet.deliveryAvailabilityPercent),
    deliveryBacklogHours: Number(ruleSet.deliveryBacklogHours),
    sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),
    sourceBuyoutPercent: Number(ruleSet.sourceBuyoutPercent),
    rentalInitialPercent: Number(ruleSet.rentalInitialPercent),
    rentalMonthlyPercent: Number(ruleSet.rentalMonthlyPercent),
    hybridInitialPercent: Number(ruleSet.hybridInitialPercent),
    hybridMonthlyPercent: Number(ruleSet.hybridMonthlyPercent),
    minimumOneTimePrice: Number(ruleSet.minimumOneTimePrice),
    minimumMonthlyPrice: Number(ruleSet.minimumMonthlyPrice),
    websiteAnnualRenewal: Number(ruleSet.websiteAnnualRenewal),
  };
}

export async function GET() {
  try {
    const auth = await requireAuth();

    if (!auth.ok) {
      return auth.response;
    }

    const ruleSet = await prisma.pricingRuleSet.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!ruleSet) {
      return NextResponse.json(
        { error: "No hay reglas de precio marcadas como default." },
        { status: 404 },
      );
    }

    return NextResponse.json({ rules: rulesFromRuleSet(ruleSet), ruleSetName: ruleSet.name });
  } catch (error) {
    console.error("Error loading pricing rules from database", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las reglas de precio desde la base de datos." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(["admin"]);

    if (!auth.ok) {
      return auth.response;
    }

    const payload = (await request.json().catch(() => null)) as Partial<PricingRules> | null;

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
    }

    const existing = await prisma.pricingRuleSet.findFirst({
      where: { isDefault: true },
      orderBy: { updatedAt: "desc" },
    });

    const data = {
      riskPercent: numeric(payload.riskPercent),
      urgencyPercent: numeric(payload.urgencyPercent),
      commissionPercent: numeric(payload.commissionPercent),
      discountPercent: numeric(payload.discountPercent),
      aiEfficiencyPercent: Math.max(0, Math.min(40, numeric(payload.aiEfficiencyPercent, 20))),
      deliveryMarginMultiplier: Math.max(1, numeric(payload.deliveryMarginMultiplier, 2)),
      developerCount: Math.max(1, numeric(payload.developerCount, 2)),
      hoursPerDeveloperDay: Math.max(1, numeric(payload.hoursPerDeveloperDay, 5)),
      deliveryAvailabilityPercent: Math.max(10, Math.min(100, numeric(payload.deliveryAvailabilityPercent, 70))),
      deliveryBacklogHours: Math.max(0, numeric(payload.deliveryBacklogHours, 0)),
      sourceDeliveryPercent: numeric(payload.sourceDeliveryPercent),
      sourceBuyoutPercent: numeric(payload.sourceBuyoutPercent),
      rentalInitialPercent: numeric(payload.rentalInitialPercent),
      rentalMonthlyPercent: numeric(payload.rentalMonthlyPercent),
      hybridInitialPercent: numeric(payload.hybridInitialPercent),
      hybridMonthlyPercent: numeric(payload.hybridMonthlyPercent),
      minimumOneTimePrice: numeric(payload.minimumOneTimePrice),
      minimumMonthlyPrice: numeric(payload.minimumMonthlyPrice),
      websiteAnnualRenewal: numeric(payload.websiteAnnualRenewal),
    };

    const ruleSet = existing
      ? await prisma.pricingRuleSet.update({ where: { id: existing.id }, data })
      : await prisma.pricingRuleSet.create({ data: { name: "Default", isDefault: true, ...data } });

    return NextResponse.json({ ok: true, rules: rulesFromRuleSet(ruleSet) });
  } catch (error) {
    console.error("Error saving pricing rules", error);
    return NextResponse.json({ ok: false, error: "No se pudieron guardar las reglas default." }, { status: 500 });
  }
}
