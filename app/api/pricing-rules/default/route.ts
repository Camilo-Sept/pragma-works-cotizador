import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PricingRules } from "@/types/quote";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    const rules: PricingRules = {
      riskPercent: Number(ruleSet.riskPercent),
      urgencyPercent: Number(ruleSet.urgencyPercent),
      commissionPercent: Number(ruleSet.commissionPercent),
      discountPercent: Number(ruleSet.discountPercent),
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

    return NextResponse.json({ rules, ruleSetName: ruleSet.name });
  } catch (error) {
    console.error("Error loading pricing rules from database", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las reglas de precio desde la base de datos." },
      { status: 500 },
    );
  }
}
