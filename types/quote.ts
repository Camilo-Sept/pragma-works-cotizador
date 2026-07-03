export type BillingType = "one_time" | "monthly" | "annual" | "hourly";

export type QuoteMode = "one_time" | "rental" | "hybrid";

export type SourceCodeOption = "none" | "delivery_after_payment" | "full_buyout";

export type ServiceCategory =
  | "web"
  | "system"
  | "mobile"
  | "desktop"
  | "automation"
  | "ai"
  | "support"
  | "infrastructure"
  | "other";

export type ServiceItem = {
  id: string;
  name: string;
  category: ServiceCategory;
  descriptionClient: string;
  descriptionInternal?: string;
  billingType: BillingType;
  basePrice: number;
  estimatedHours: number;
  active: boolean;
  source: "catalog" | "manual";
  requiresApproval: boolean;
};

export type QuoteItem = {
  id: string;
  serviceId?: string;
  name: string;
  category: ServiceCategory;
  billingType: BillingType;
  unitPrice: number;
  quantity: number;
  estimatedHours: number;
  source: "catalog" | "manual";
  requiresApproval: boolean;
  notes?: string;
};

export type ClientDraft = {
  clientName: string;
  company: string;
  phone: string;
  email: string;
  projectName: string;
  notes: string;
};

export type PricingRules = {
  riskPercent: number;
  urgencyPercent: number;
  commissionPercent: number;
  discountPercent: number;
  sourceDeliveryPercent: number;
  sourceBuyoutPercent: number;
  rentalInitialPercent: number;
  rentalMonthlyPercent: number;
  hybridInitialPercent: number;
  hybridMonthlyPercent: number;
  minimumOneTimePrice: number;
  minimumMonthlyPrice: number;
  websiteAnnualRenewal: number;
};

export type QuoteTotals = {
  oneTimeSubtotal: number;
  monthlySubtotal: number;
  annualSubtotal: number;
  hoursSubtotal: number;
  riskCharge: number;
  urgencyCharge: number;
  commissionCharge: number;
  discountAmount: number;
  sourceCodeCharge: number;
  suggestedInitialPayment: number;
  suggestedMonthlyPayment: number;
  suggestedAnnualRenewal: number;
  estimatedHours: number;
  effectiveHourlyRate: number;
  commercialNotes: string[];
};
