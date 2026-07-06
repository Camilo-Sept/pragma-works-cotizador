import fs from "node:fs";

const filePath = "components/CotizadorApp.tsx";
let source = fs.readFileSync(filePath, "utf8");

function cut(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("No se encontro bloque esperado");
  source = source.slice(0, start) + source.slice(end);
}

cut('      {activeTab === "security" && (', '      {activeTab === "catalog" && (');
cut('      {activeTab === "rules" && (', '      {activeTab === "quote" && (');

source = source.replace(
  'Array<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github" | "users">',
  'Array<"quote" | "history" | "reports" | "preview" | "catalog" | "users">',
);
source = source.replace(
  'useState<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github" | "users">("quote")',
  'useState<"quote" | "history" | "reports" | "preview" | "catalog" | "users">("quote")',
);

fs.writeFileSync(filePath, source);
console.log("Limpieza aplicada.");
