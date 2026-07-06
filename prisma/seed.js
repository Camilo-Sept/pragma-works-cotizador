const {
  Prisma,
  PrismaClient,
  BillingType,
  ServiceCategory,
  ServiceSource,
  UserRole,
} = require("@prisma/client");
const { pbkdf2Sync, randomBytes } = require("crypto");

const prisma = new PrismaClient();

const categoryMap = {
  web: ServiceCategory.WEB,
  system: ServiceCategory.SYSTEM,
  mobile: ServiceCategory.MOBILE,
  desktop: ServiceCategory.DESKTOP,
  automation: ServiceCategory.AUTOMATION,
  ai: ServiceCategory.AI,
  support: ServiceCategory.SUPPORT,
  infrastructure: ServiceCategory.INFRASTRUCTURE,
  other: ServiceCategory.OTHER,
};

const billingTypeMap = {
  one_time: BillingType.ONE_TIME,
  monthly: BillingType.MONTHLY,
  annual: BillingType.ANNUAL,
  hourly: BillingType.HOURLY,
};

const defaultPricingRules = {
  name: "Reglas comerciales base",
  isDefault: true,
  riskPercent: 10,
  urgencyPercent: 0,
  commissionPercent: 5,
  discountPercent: 0,
  sourceDeliveryPercent: 25,
  sourceBuyoutPercent: 50,
  rentalInitialPercent: 30,
  rentalMonthlyPercent: 8,
  hybridInitialPercent: 55,
  hybridMonthlyPercent: 4,
  minimumOneTimePrice: 3500,
  minimumMonthlyPrice: 900,
  websiteAnnualRenewal: 4900,
};

const services = [
  {
    id: "svc-web-fixed",
    name: "Página web fija",
    category: "web",
    descriptionClient:
      "Sitio informativo básico con hasta 5 secciones, diseño responsivo, botón de WhatsApp, formulario simple, publicación inicial, 1 año de servicio básico y 3 mantenimientos simples.",
    descriptionInternal:
      "No incluye base de datos, panel administrativo, campañas, tienda, SEO avanzado ni servicios externos.",
    billingType: "one_time",
    basePrice: 10000,
    estimatedHours: 18,
    active: true,
    requiresApproval: false,
  },
  {
    id: "svc-corporate-site",
    name: "Página corporativa",
    category: "web",
    descriptionClient:
      "Sitio empresarial con varias secciones, imagen profesional, formularios, estructura comercial y optimización básica para presentación de servicios.",
    billingType: "one_time",
    basePrice: 18900,
    estimatedHours: 32,
    active: true,
    requiresApproval: false,
  },
  {
    id: "svc-web-system-db",
    name: "Sistema web con base de datos",
    category: "system",
    descriptionClient:
      "Aplicación web con captura, consulta, catálogos, administración de registros y estructura preparada para procesos del negocio.",
    billingType: "one_time",
    basePrice: 29900,
    estimatedHours: 50,
    active: true,
    requiresApproval: false,
  },
  {
    id: "svc-android-app",
    name: "App móvil Android básica",
    category: "mobile",
    descriptionClient:
      "Aplicación Android para captura, consulta o flujo operativo sencillo, preparada para crecer hacia conexión con API o base de datos.",
    billingType: "one_time",
    basePrice: 24900,
    estimatedHours: 42,
    active: true,
    requiresApproval: false,
  },
  {
    id: "svc-desktop-app",
    name: "Aplicación de escritorio",
    category: "desktop",
    descriptionClient:
      "Herramienta local para captura, procesamiento, consulta o generación de archivos/reportes.",
    billingType: "one_time",
    basePrice: 14900,
    estimatedHours: 28,
    active: true,
    requiresApproval: false,
  },
  {
    id: "svc-excel-automation",
    name: "Automatización Excel / PDF / TXT",
    category: "automation",
    descriptionClient:
      "Automatización para transformar, validar o generar archivos de operación como Excel, PDF, CSV o TXT.",
    billingType: "one_time",
    basePrice: 7500,
    estimatedHours: 14,
    active: true,
    requiresApproval: false,
  },
  {
    id: "svc-ai-docs",
    name: "Extracción inteligente de documentos con IA",
    category: "ai",
    descriptionClient:
      "Solución para analizar documentos, extraer datos, clasificar información o generar resúmenes apoyados con inteligencia artificial.",
    billingType: "one_time",
    basePrice: 39900,
    estimatedHours: 60,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-login-users",
    name: "Login de usuarios",
    category: "system",
    descriptionClient:
      "Acceso con usuarios para proteger la información y separar el uso del sistema por persona.",
    billingType: "one_time",
    basePrice: 5000,
    estimatedHours: 8,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-roles-permissions",
    name: "Roles y permisos",
    category: "system",
    descriptionClient:
      "Permisos por perfil, por ejemplo administrador, vendedor, consulta o usuario operativo.",
    billingType: "one_time",
    basePrice: 6500,
    estimatedHours: 10,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-clients-patients",
    name: "Módulo de clientes o pacientes",
    category: "system",
    descriptionClient:
      "Registro, búsqueda, actualización y consulta de información de clientes, pacientes o contactos.",
    billingType: "one_time",
    basePrice: 8500,
    estimatedHours: 14,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-visits-records",
    name: "Control de visitas o registros",
    category: "system",
    descriptionClient:
      "Captura y seguimiento de visitas, entradas, salidas, citas o registros operativos.",
    billingType: "one_time",
    basePrice: 8000,
    estimatedHours: 14,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-public-form",
    name: "Formulario público de registro",
    category: "web",
    descriptionClient:
      "Formulario público para que clientes o prospectos dejen información desde una liga o página.",
    billingType: "one_time",
    basePrice: 5500,
    estimatedHours: 9,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-whatsapp-button",
    name: "Botón de WhatsApp",
    category: "web",
    descriptionClient:
      "Botón directo para contacto por WhatsApp desde la página o aplicación.",
    billingType: "one_time",
    basePrice: 1500,
    estimatedHours: 2,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-whatsapp-campaigns",
    name: "Campañas por WhatsApp o publicidad básica",
    category: "automation",
    descriptionClient:
      "Estructura básica para preparar mensajes, segmentos o seguimiento comercial. No incluye consumo de API oficial ni campañas pagadas.",
    billingType: "one_time",
    basePrice: 8500,
    estimatedHours: 15,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-dashboard",
    name: "Dashboard con indicadores",
    category: "system",
    descriptionClient:
      "Pantalla con métricas, conteos, tarjetas y resumen visual de información clave.",
    billingType: "one_time",
    basePrice: 7500,
    estimatedHours: 12,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-reports",
    name: "Reportes en pantalla",
    category: "system",
    descriptionClient:
      "Reportes consultables con filtros por fecha, estatus, cliente, usuario u otros criterios.",
    billingType: "one_time",
    basePrice: 7000,
    estimatedHours: 12,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-export-excel-pdf",
    name: "Exportación Excel / PDF",
    category: "automation",
    descriptionClient:
      "Generación de archivos Excel o PDF a partir de información capturada en el sistema.",
    billingType: "one_time",
    basePrice: 6500,
    estimatedHours: 10,
    active: true,
    requiresApproval: false,
  },
  {
    id: "mod-audit-history",
    name: "Historial y auditoría",
    category: "system",
    descriptionClient:
      "Registro de cambios, movimientos y responsables para trazabilidad del sistema.",
    billingType: "one_time",
    basePrice: 7500,
    estimatedHours: 12,
    active: true,
    requiresApproval: false,
  },
  {
    id: "infra-hosting-admin",
    name: "Hosting administrado",
    category: "infrastructure",
    descriptionClient:
      "Administración básica del servicio donde se publica la página o aplicación. No incluye licencias o APIs externas de terceros.",
    billingType: "monthly",
    basePrice: 900,
    estimatedHours: 1,
    active: true,
    requiresApproval: false,
  },
  {
    id: "support-essential",
    name: "Mantenimiento mensual esencial",
    category: "support",
    descriptionClient:
      "Soporte mensual limitado para cambios menores, revisión general y acompañamiento básico.",
    billingType: "monthly",
    basePrice: 1500,
    estimatedHours: 2,
    active: true,
    requiresApproval: false,
  },
  {
    id: "support-hour",
    name: "Hora técnica de soporte/desarrollo",
    category: "support",
    descriptionClient:
      "Hora técnica para ajustes, cambios, diagnóstico, soporte o desarrollo adicional fuera del alcance original.",
    billingType: "hourly",
    basePrice: 650,
    estimatedHours: 1,
    active: true,
    requiresApproval: false,
  },
];

const demoUsers = [
  {
    name: "Administrador Pragma Works",
    email: "admin@pragmaworks.mx",
    role: UserRole.ADMIN,
    password: "Pragma2026!",
  },
  {
    name: "Ventas Pragma Works",
    email: "ventas@pragmaworks.mx",
    role: UserRole.VENTAS,
    password: "Ventas2026!",
  },
  {
    name: "Lectura Pragma Works",
    email: "lectura@pragmaworks.mx",
    role: UserRole.LECTURA,
    password: "Lectura2026!",
  },
];

function isProductionSeed() {
  return process.env.NODE_ENV === "production";
}

function getSeedUsers() {
  if (!isProductionSeed()) return demoUsers;

  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) return [];

  return [
    {
      name: process.env.SEED_ADMIN_NAME?.trim() || "Administrador",
      email,
      role: UserRole.ADMIN,
      password,
    },
  ];
}

function decimal(value) {
  return new Prisma.Decimal(value);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("base64url");
  return `pbkdf2$120000$${salt}$${hash}`;
}

function serviceData(service) {
  return {
    name: service.name,
    category: categoryMap[service.category],
    descriptionClient: service.descriptionClient,
    descriptionInternal: service.descriptionInternal ?? null,
    billingType: billingTypeMap[service.billingType],
    basePrice: decimal(service.basePrice),
    estimatedHours: decimal(service.estimatedHours),
    active: service.active,
    source: ServiceSource.CATALOG,
    requiresApproval: service.requiresApproval,
  };
}

async function seedPricingRules() {
  await prisma.pricingRuleSet.updateMany({
    where: {
      isDefault: true,
      NOT: { name: defaultPricingRules.name },
    },
    data: { isDefault: false },
  });

  const existing = await prisma.pricingRuleSet.findFirst({
    where: { name: defaultPricingRules.name },
  });

  const data = Object.fromEntries(
    Object.entries(defaultPricingRules).map(([key, value]) => {
      if (typeof value === "number") return [key, decimal(value)];
      return [key, value];
    }),
  );

  if (existing) {
    await prisma.pricingRuleSet.update({
      where: { id: existing.id },
      data,
    });
    return "updated";
  }

  await prisma.pricingRuleSet.create({ data });
  return "created";
}

async function seedServices() {
  let created = 0;
  let updated = 0;

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: {
        name: service.name,
        source: ServiceSource.CATALOG,
      },
    });

    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: serviceData(service),
      });
      updated += 1;
      continue;
    }

    await prisma.service.create({
      data: serviceData(service),
    });
    created += 1;
  }

  return { created, updated };
}

async function seedUsers() {
  let created = 0;
  let updated = 0;
  const users = getSeedUsers();

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: user.name,
          role: user.role,
          active: true,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        active: true,
        passwordHash: hashPassword(user.password),
      },
    });
    created += 1;
  }

  return { created, updated, skipped: users.length === 0 };
}

async function main() {
  console.log("🌱 Iniciando seed de Pragma Works...");

  const pricingRulesResult = await seedPricingRules();
  const servicesResult = await seedServices();
  const usersResult = await seedUsers();
  const userLabel = isProductionSeed() ? "Admin seed" : "Usuarios demo";

  console.log(`✅ Reglas comerciales: ${pricingRulesResult}`);
  console.log(
    `✅ Servicios de catálogo: ${servicesResult.created} creados, ${servicesResult.updated} actualizados`,
  );
  if (usersResult.skipped) {
    console.log("✅ Admin seed: omitido; faltan SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD");
  } else {
    console.log(`✅ ${userLabel}: ${usersResult.created} creados, ${usersResult.updated} actualizados`);
  }
  console.log("🌱 Seed terminado");
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
