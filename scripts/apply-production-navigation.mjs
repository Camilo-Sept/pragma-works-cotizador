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
  "tabsByRole",
  String.raw`const tabsByRole: Record<UserRole, Array<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github">> = {
  admin: ["quote", "history", "reports", "preview", "catalog", "rules", "security", "github"],
  supervisor: ["quote", "history", "reports", "preview", "security"],
  ventas: ["quote", "history", "reports", "preview", "security"],
  operacion: ["history", "reports", "security"],
  lectura: ["history", "reports", "security"],
};`,
  String.raw`const tabsByRole: Record<UserRole, Array<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github" | "users">> = {
  admin: ["quote", "history", "reports", "preview", "catalog", "users"],
  supervisor: ["quote", "history", "reports", "preview"],
  ventas: ["quote", "history", "reports", "preview"],
  operacion: ["history", "reports"],
  lectura: ["history", "reports"],
};`,
);

replaceOnce(
  "activeTab type",
  String.raw`const [activeTab, setActiveTab] = useState<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github">("quote");`,
  String.raw`const [activeTab, setActiveTab] = useState<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github" | "users">("quote");`,
);

replaceOnce(
  "navigation tabs",
  String.raw`        {availableTabs.includes("rules") && (
          <button className={\`tab-button ${activeTab === "rules" ? "active" : ""}\`} onClick={() => setActiveTab("rules")}>
            Reglas de precio
          </button>
        )}
        {availableTabs.includes("security") && (
          <button className={\`tab-button ${activeTab === "security" ? "active" : ""}\`} onClick={() => setActiveTab("security")}>
            Seguridad / roles
          </button>
        )}
        {availableTabs.includes("github") && (
          <button className={\`tab-button ${activeTab === "github" ? "active" : ""}\`} onClick={() => setActiveTab("github")}>
            GitHub / siguiente sprint
          </button>
        )}`,
  String.raw`        {availableTabs.includes("users") && (
          <button className="tab-button" onClick={() => window.location.assign("/users")}>
            Usuarios
          </button>
        )}`,
);

fs.writeFileSync(filePath, source);
console.log("Navegación productiva aplicada en components/CotizadorApp.tsx");
console.log("Menú productivo: Nueva cotización, Historial, Reportes, Vista / PDF, Catálogo local, Usuarios.");
