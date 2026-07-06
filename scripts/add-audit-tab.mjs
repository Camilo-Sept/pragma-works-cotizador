import fs from "node:fs";

const filePath = "components/CotizadorApp.tsx";
let source = fs.readFileSync(filePath, "utf8");

function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`No se encontró bloque esperado: ${label}`);
  }
  source = source.replace(from, to);
}

replaceOnce(
  "tabs type",
  'Array<"quote" | "history" | "reports" | "preview" | "catalog" | "users">',
  'Array<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit">',
);

replaceOnce(
  "tabs admin",
  'admin: ["quote", "history", "reports", "preview", "catalog", "users"],',
  'admin: ["quote", "history", "reports", "preview", "catalog", "users", "audit"],',
);

replaceOnce(
  "active tab type",
  'useState<"quote" | "history" | "reports" | "preview" | "catalog" | "users">("quote")',
  'useState<"quote" | "history" | "reports" | "preview" | "catalog" | "users" | "audit">("quote")',
);

replaceOnce(
  "users nav button",
  `        {availableTabs.includes("users") && (
          <button className="tab-button" onClick={() => window.location.assign("/users")}>
            Usuarios
          </button>
        )}`,
  `        {availableTabs.includes("users") && (
          <button className="tab-button" onClick={() => window.location.assign("/users")}>
            Usuarios
          </button>
        )}
        {availableTabs.includes("audit") && (
          <button className="tab-button" onClick={() => window.location.assign("/audit")}>
            Bitácora
          </button>
        )}`,
);

fs.writeFileSync(filePath, source);
console.log("Pestaña Bitácora agregada al menú principal.");
