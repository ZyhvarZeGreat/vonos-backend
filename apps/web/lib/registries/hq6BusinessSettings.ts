import type { Hq6BusinessSettings } from "@vonos/types";

/** HQ6 Settings → sidebar `enabledModules` keys we can toggle from Modules tab. */
export const HQ6_MODULE_TO_ENABLED: Record<string, string> = {
  purchases: "purchases",
  addSale: "sales",
  pos: "pos",
  stockTransfers: "movements",
  stockAdjustment: "movements",
  expenses: "finance",
  account: "paymentAccounts",
  tables: "tables",
  enableBookings: "appointments",
  serviceStaff: "hrm",
};

export const HQ6_MODULE_KEYS = [
  "purchases",
  "addSale",
  "pos",
  "stockTransfers",
  "stockAdjustment",
  "expenses",
  "account",
  "tables",
  "modifiers",
  "serviceStaff",
  "enableSubscription",
  "enableBookings",
  "kitchen",
  "typesOfService",
] as const;

export type Hq6ModuleKey = (typeof HQ6_MODULE_KEYS)[number];

export function defaultHq6BusinessSettings(
  businessName: string,
  tenantCode?: string | null,
): Hq6BusinessSettings {
  const isVa = tenantCode === "VA";

  return {
    business: {
      startDate: "01-01-2023",
      defaultProfitPercent: "0.00",
      currency: "NGN",
      currencySymbolPlacement: "before",
      timeZone: "Africa/Lagos",
      financialYearStartMonth: "1",
      stockAccountingMethod: "fifo",
      transactionEditDays: "720",
      dateFormat: "dd-mm-yyyy",
      timeFormat: "24",
      currencyPrecision: "2",
      quantityPrecision: "2",
    },
    tax: {
      tax1Name: "",
      tax1No: "",
      tax2Name: "",
      tax2No: "",
      enableInlineTax: false,
    },
    product: {
      skuPrefix: isVa ? "VONOS AUTO-" : "",
      enableProductExpiry: "add",
      defaultUnit: "sng",
      onProductExpiry: "keep",
      enableBrand: true,
      enableCategory: true,
      enableSubCategory: false,
      enablePriceTaxInfo: true,
      enableWarranty: false,
      enableSecondaryUnit: false,
      isProductImageRequired: false,
    },
    contact: {
      defaultCreditLimit: "10000",
    },
    sale: {
      defaultSaleDiscount: "0.00",
      defaultSaleTax: "",
      salesItemAdditionMethod: "add",
      amountRoundingMethod: "none",
      salesPriceIsMinimum: false,
      allowOverselling: true,
      enableSalesOrder: false,
      salesCommissionAgent: "disable",
      commissionCalculationType: "invoice",
      commissionAgentRequired: false,
      paymentLink: "razorpay",
      razorpayKeyId: "",
      razorpayKeySecret: "",
      stripePublicKey: "",
      stripeSecretKey: "",
    },
    pos: {
      addKeyboardShortcuts: false,
      disableMultiplePay: false,
      disableDraft: false,
      disableExpressCheckout: false,
      dontShowProductSuggestion: false,
      dontShowRecentTransactions: false,
      disableDiscount: false,
      disableOrderTax: false,
      disableCreditSaleButton: false,
      showBillingAddressAboveServiceStaff: false,
      disableQuantity: false,
      isServiceStaffRequired: false,
      disableQuotation: false,
      showInvoiceScheme: false,
      showInvoiceLayoutDropdown: false,
      printInvoiceOnSuspend: false,
      showPricingOnProductSuggestion: false,
      barcodePrefix: "",
      productSkuLength: "5",
      qtyIntegerLength: "4",
      qtyFractionalLength: "3",
    },
    displayScreen: {
      heading: "Welcome",
      subHeading: "Thank you for shopping with us",
      showQuoteToCustomers: true,
    },
    purchases: {
      enableEditProductPrice: true,
      enablePurchaseStatus: true,
      enableLotNumber: false,
      enablePurchaseOrder: true,
      enablePurchaseRequisition: false,
    },
    payment: {
      cashDenominations: "5,10,20,50,100,200,500,1000",
      enableCashDenominationOn: "pos",
      cashDenominationPaymentMethods: "cash",
      strictCheck: false,
    },
    dashboard: {
      stockExpiryAlertDays: "365",
    },
    system: {
      themeColor: "green",
      defaultDatatableEntries: "50",
      showHelpText: true,
    },
    prefixes: {
      purchase: "",
      purchaseOrder: "",
      purchaseReturn: "",
      stockTransfer: "",
      stockAdjustment: "",
      sellReturn: "",
      expenses: "",
      contacts: "",
      purchasePayment: "",
      sellPayment: "",
      expensePayment: "",
      businessLocation: "",
      username: "",
      subscriptionNo: "",
      draft: "",
      salesOrder: "",
    },
    email: {
      mailDriver: "smtp",
      mailHost: "",
      mailPort: "",
      mailUsername: "",
      mailPassword: "",
      mailEncryption: "tls",
      mailFromAddress: "",
      mailFromName: businessName,
    },
    sms: {
      smsService: "nexmo",
      smsUrl: "",
      sendToParamName: "",
      messageParamName: "",
      requestMethod: "post",
    },
    rewardPoints: {
      enableRewardPoint: true,
      displayName: "",
      amountSpendForUnitPoint: "1000.00",
      minOrderTotalToEarn: "1.00",
      maxPointsPerOrder: "10",
      redeemAmountPerUnitPoint: "0.10",
      minOrderTotalToRedeem: "100000.00",
      minRedeemPoint: "1000",
      maxRedeemPointPerOrder: "",
      expiryPeriod: "",
      expiryPeriodUnit: "year",
    },
    modules: {
      purchases: true,
      addSale: true,
      pos: true,
      stockTransfers: false,
      stockAdjustment: false,
      expenses: true,
      account: true,
      tables: false,
      modifiers: false,
      serviceStaff: true,
      enableSubscription: false,
      enableBookings: false,
      kitchen: false,
      typesOfService: false,
    },
    customLabels: isVa
      ? {
          payments: [
            "POS 1",
            "FCMB (Bank Transfer)",
            "GTB (Bank Transfer)",
            "Zenith (Bank Transfer)",
            "POS 2",
            "Discount",
            "Exchange",
          ],
          contact: [
            "Mileage",
            "VIN Number",
            "Car Model & Year",
            "Customer Location",
            "Referral source",
            "",
            "",
            "",
            "",
            "",
          ],
          product: ["Car Model", "", "", "", "", ""],
          location: ["", "", ""],
          user: ["", "", ""],
          purchase: ["", "", ""],
          purchaseShipping: ["", "", ""],
          sell: [
            { label: "Vehicle Time In (Date entered)", required: true },
            { label: "Vehicle Release Date", required: true },
            { label: "Customer Location", required: true },
          ],
          saleShipping: ["", "", ""],
          typesOfService: ["", "", ""],
        }
      : {
          payments: ["", "", "", "", "", "", ""],
          contact: ["", "", "", "", "", "", "", "", "", ""],
          product: ["", "", "", "", "", ""],
          location: ["", "", ""],
          user: ["", "", ""],
          purchase: ["", "", ""],
          purchaseShipping: ["", "", ""],
          sell: [
            { label: "", required: false },
            { label: "", required: false },
            { label: "", required: false },
          ],
          saleShipping: ["", "", ""],
          typesOfService: ["", "", ""],
        },
  };
}

export function mergeBusinessSettingsDraft(
  defaults: Hq6BusinessSettings,
  saved?: Hq6BusinessSettings | null,
): Hq6BusinessSettings {
  if (!saved) return defaults;
  return {
    ...defaults,
    ...saved,
    business: { ...defaults.business, ...saved.business },
    tax: { ...defaults.tax, ...saved.tax },
    product: { ...defaults.product, ...saved.product },
    contact: { ...defaults.contact, ...saved.contact },
    sale: { ...defaults.sale, ...saved.sale },
    pos: { ...defaults.pos, ...saved.pos },
    displayScreen: { ...defaults.displayScreen, ...saved.displayScreen },
    purchases: { ...defaults.purchases, ...saved.purchases },
    payment: { ...defaults.payment, ...saved.payment },
    dashboard: { ...defaults.dashboard, ...saved.dashboard },
    system: { ...defaults.system, ...saved.system },
    prefixes: { ...defaults.prefixes, ...saved.prefixes },
    email: { ...defaults.email, ...saved.email },
    sms: { ...defaults.sms, ...saved.sms },
    rewardPoints: { ...defaults.rewardPoints, ...saved.rewardPoints },
    modules: { ...defaults.modules, ...saved.modules },
    customLabels: {
      ...defaults.customLabels,
      ...saved.customLabels,
      payments: saved.customLabels?.payments ?? defaults.customLabels?.payments,
      contact: saved.customLabels?.contact ?? defaults.customLabels?.contact,
      product: saved.customLabels?.product ?? defaults.customLabels?.product,
      location: saved.customLabels?.location ?? defaults.customLabels?.location,
      user: saved.customLabels?.user ?? defaults.customLabels?.user,
      purchase: saved.customLabels?.purchase ?? defaults.customLabels?.purchase,
      purchaseShipping:
        saved.customLabels?.purchaseShipping ??
        defaults.customLabels?.purchaseShipping,
      sell: saved.customLabels?.sell ?? defaults.customLabels?.sell,
      saleShipping:
        saved.customLabels?.saleShipping ?? defaults.customLabels?.saleShipping,
      typesOfService:
        saved.customLabels?.typesOfService ??
        defaults.customLabels?.typesOfService,
    },
  };
}

/** Apply Modules-tab toggles onto the tenant enabledModules list. */
export function applyHq6ModulesToEnabled(
  currentModules: string[],
  hq6Modules: Record<string, boolean> | undefined,
): string[] {
  if (!hq6Modules) return currentModules;
  const next = new Set(currentModules);

  for (const [key, enabled] of Object.entries(hq6Modules)) {
    const mapped = HQ6_MODULE_TO_ENABLED[key];
    if (!mapped) continue;
    if (enabled) next.add(mapped);
    else {
      // Only remove when no sibling toggle still needs the same module.
      const stillNeeded = Object.entries(hq6Modules).some(
        ([otherKey, otherOn]) =>
          otherOn &&
          otherKey !== key &&
          HQ6_MODULE_TO_ENABLED[otherKey] === mapped,
      );
      if (!stillNeeded) next.delete(mapped);
    }
  }

  return [...next];
}

export function str(
  bag: Record<string, string | boolean | number> | undefined,
  key: string,
  fallback = "",
): string {
  const value = bag?.[key];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export function bool(
  bag: Record<string, string | boolean | number> | undefined,
  key: string,
  fallback = false,
): boolean {
  const value = bag?.[key];
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return fallback;
  return value === "true" || value === 1 || value === "1";
}
