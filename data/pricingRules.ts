import type { PricingRules } from "@/types/quote";

export const defaultPricingRules: PricingRules = {
  riskPercent: 10,
  urgencyPercent: 0,
  commissionPercent: 5,
  discountPercent: 0,
  aiEfficiencyPercent: 20,
  deliveryMarginMultiplier: 2,
  developerCount: 2,
  hoursPerDeveloperDay: 5,
  deliveryAvailabilityPercent: 70,
  deliveryBacklogHours: 0,
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
