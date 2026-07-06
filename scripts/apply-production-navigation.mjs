import fs from "node:fs";

const filePath = "components/CotizadorApp.tsx";
let source = fs.readFileSync(filePath, "utf8");

function fail(label) {
  throw new Error(`No se pudo aplicar cambio: ${label}`);
}

const tabsStart = source.indexOf("const tabsByRole:");
const tabsEndMarker = "const categoryLabels:";
const tabsEnd = source.indexOf(tabsEndMarker, tabsStart);
if (tabsStart < 0 || tabsEnd < 0) fail("tabsByRole");

const newTabs = [
  'const tabsByRole: Record<UserRole, Array<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github" | "users">> = {',
  '  admin: ["quote", "history", "reports", "preview", "catalog", "users"],',
  '  supervisor: ["quote", "history", "reports", "preview"],',
  '  ventas: ["quote", "history", "reports", "preview"],',
  '  operacion: ["history", "reports"],',
  '  lectura: ["history", "reports"],',
  '};',
  '',
].join("\n");
source = source.slice(0, tabsStart) + newTabs + source.slice(tabsEnd);

const oldActive = 'const [activeTab, setActiveTab] = useState<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github">("quote");';
const newActive = 'const [activeTab, setActiveTab] = useState<"quote" | "history" | "reports" | "preview" | "catalog" | "rules" | "security" | "github" | "users">("quote");';
if (!source.includes(oldActive) && !source.includes(newActive)) fail("activeTab");
source = source.replace(oldActive, newActive);

const navStart = source.indexOf('        {availableTabs.includes("rules") && (');
const navEndMarker = '      </nav>';
const navEnd = source.indexOf(navEndMarker, navStart);
if (navStart < 0 || navEnd < 0) fail("navigation");

const usersTab = [
  '        {availableTabs.includes("users") && (',
  '          <button className="tab-button" onClick={() => window.location.assign("/users")}>',
  '            Usuarios',
  '          </button>',
  '        )}',
].join("\n") + "\n";
source = source.slice(0, navStart) + usersTab + source.slice(navEnd);

fs.writeFileSync(filePath, source);
console.log("Navegacion productiva aplicada.");
