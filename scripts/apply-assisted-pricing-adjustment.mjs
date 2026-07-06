import fs from "node:fs";

const self = "scripts/apply-assisted-pricing-adjustment.mjs";
const edits = [
  ["types/quote.ts", "  discountPercent: number;\n  sourceDeliveryPercent: number;", "  discountPercent: number;\n  aiEfficiencyPercent?: number;\n  sourceDeliveryPercent: number;"],
  ["types/quote.ts", "  discountAmount: number;\n  sourceCodeCharge: number;", "  discountAmount: number;\n  aiEfficiencyAdjustment: number;\n  marketOneTimePrice: number;\n  sourceCodeCharge: number;"],
  ["data/pricingRules.ts", "  discountPercent: 0,\n  sourceDeliveryPercent: 25,", "  discountPercent: 0,\n  aiEfficiencyPercent: 20,\n  sourceDeliveryPercent: 25,"],
  ["app/api/pricing-rules/default/route.ts", "      discountPercent: Number(ruleSet.discountPercent),\n      sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),", "      discountPercent: Number(ruleSet.discountPercent),\n      aiEfficiencyPercent: 20,\n      sourceDeliveryPercent: Number(ruleSet.sourceDeliveryPercent),"],
  ["app/api/quotes/route.ts", "    discountPercent: numberValue(\"discountPercent\"),\n    sourceDeliveryPercent: numberValue(\"sourceDeliveryPercent\"),", "    discountPercent: numberValue(\"discountPercent\"),\n    aiEfficiencyPercent: numberValue(\"aiEfficiencyPercent\"),\n    sourceDeliveryPercent: numberValue(\"sourceDeliveryPercent\"),"],
];

for (const [path, from, to] of edits) {
  let text = fs.readFileSync(path, "utf8");
  if (!text.includes(to)) {
    if (!text.includes(from)) throw new Error(`No encontré bloque esperado en ${path}`);
    text = text.replace(from, to);
    fs.writeFileSync(path, text);
  }
}

let pricing = fs.readFileSync("lib/pricing.ts", "utf8");
if (!pricing.includes("aiEfficiencyAdjustment")) {
  pricing = pricing.replace(
    `  const riskCharge = oneTimeSubtotal * (rules.riskPercent / 100);\n  const urgencyCharge = oneTimeSubtotal * (rules.urgencyPercent / 100);\n  const commissionCharge = oneTimeSubtotal * (rules.commissionPercent / 100);\n  const discountAmount = oneTimeSubtotal * (rules.discountPercent / 100);\n\n  const adjustedOneTimeSubtotal = Math.max(\n    oneTimeSubtotal + riskCharge + urgencyCharge + commissionCharge - discountAmount,\n    oneTimeSubtotal > 0 ? rules.minimumOneTimePrice : 0,\n  );`,
    `  const riskCharge = oneTimeSubtotal * (rules.riskPercent / 100);\n  const urgencyCharge = oneTimeSubtotal * (rules.urgencyPercent / 100);\n  const commissionCharge = oneTimeSubtotal * (rules.commissionPercent / 100);\n  const discountAmount = oneTimeSubtotal * (rules.discountPercent / 100);\n  const aiEfficiencyPercent = Math.max(0, Math.min(40, rules.aiEfficiencyPercent ?? 0));\n\n  const marketOneTimePrice = Math.max(\n    oneTimeSubtotal + riskCharge + urgencyCharge + commissionCharge - discountAmount,\n    oneTimeSubtotal > 0 ? rules.minimumOneTimePrice : 0,\n  );\n  const aiEfficiencyAdjustment = marketOneTimePrice * (aiEfficiencyPercent / 100);\n\n  const adjustedOneTimeSubtotal = Math.max(\n    marketOneTimePrice - aiEfficiencyAdjustment,\n    oneTimeSubtotal > 0 ? rules.minimumOneTimePrice : 0,\n  );`,
  );
  pricing = pricing.replace("    discountAmount,\n    sourceCodeCharge,", "    discountAmount,\n    aiEfficiencyAdjustment,\n    marketOneTimePrice,\n    sourceCodeCharge,");
  fs.writeFileSync("lib/pricing.ts", pricing);
}

let app = fs.readFileSync("components/CotizadorApp.tsx", "utf8");
if (!app.includes("Eficiencia por desarrollo asistido")) {
  app = app.replace(
    `                <div className="field">\n                  <label>Código fuente</label>`,
    `                <div className="field">\n                  <label>Eficiencia por desarrollo asistido (%)</label>\n                  <input\n                    disabled={!canEditCurrentQuote}\n                    type="number"\n                    min="0"\n                    max="40"\n                    value={rules.aiEfficiencyPercent ?? 0}\n                    onChange={(event) => setRules({ ...rules, aiEfficiencyPercent: Math.max(0, Math.min(40, safeNumber(event.target.value))) })}\n                  />\n                </div>\n                <div className="field">\n                  <label>Código fuente</label>`,
  );
  app = app.replace(
    `<strong>{formatCurrency(totals.riskCharge + totals.urgencyCharge + totals.commissionCharge - totals.discountAmount + totals.sourceCodeCharge)}</strong>`,
    `<strong>{formatCurrency(totals.riskCharge + totals.urgencyCharge + totals.commissionCharge - totals.discountAmount - totals.aiEfficiencyAdjustment + totals.sourceCodeCharge)}</strong>`,
  );
  fs.writeFileSync("components/CotizadorApp.tsx", app);
}

fs.rmSync(self, { force: true });
console.log("Ajuste interno de eficiencia por desarrollo asistido aplicado.");
