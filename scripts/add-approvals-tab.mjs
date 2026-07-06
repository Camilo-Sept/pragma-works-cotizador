import fs from "node:fs";

const filePath = "components/CotizadorApp.tsx";
let source = fs.readFileSync(filePath, "utf8");

if (source.includes('availableTabs.includes("approvals")')) {
  console.log("La pestaña Autorizaciones ya existe. No se aplicaron cambios.");
  process.exit(0);
}

const replacements = [
  [
    'Array<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit">',
    'Array<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit" | "approvals">',
  ],
  [
    'admin: ["quote", "history", "reports", "preview", "catalog", "users", "audit"],',
    'admin: ["quote", "history", "reports", "preview", "catalog", "users", "audit", "approvals"],',
  ],
  [
    'useState<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit">("quote")',
    'useState<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit" | "approvals">("quote")',
  ],
  [
    `        {availableTabs.includes("audit") && (
          <button className="tab-button" onClick={() => window.location.assign("/audit")}>
            Bitácora
          </button>
        )}`,
    `        {availableTabs.includes("audit") && (
          <button className="tab-button" onClick={() => window.location.assign("/audit")}>
            Bitácora
          </button>
        )}
        {availableTabs.includes("approvals") && (
          <button className="tab-button" onClick={() => window.location.assign("/approvals")}>
            Autorizaciones
          </button>
        )}`,
  ],
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) {
    throw new Error(`No se encontró bloque esperado:\n${from}`);
  }
  source = source.replace(from, to);
}

fs.writeFileSync(filePath, source);
console.log("Pestaña Autorizaciones agregada al menú principal.");
