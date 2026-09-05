import { describe, expect, it } from "vitest";
import { buildProductSavePayload } from "./productSavePayload";

const baseForm = {
  name: "Oil filter",
  sku: "OF-100",
  barcodeType: "C128",
  unit: "Single",
  brand: "Bosch",
  category: "Filters",
  subCategory: "",
  description: "",
  weight: "",
  carModel: "Camry",
  enableImei: false,
  preparationMinutes: "",
  purchaseExcTax: "2500",
  sellingExcTax: "4000",
  alertQuantity: "2",
  manageStock: true,
  notForSelling: false,
};

const vispLocation = {
  locationCode: "VISP",
  rack: "",
  row: "",
  position: "",
  quantity: "12",
};

describe("buildProductSavePayload smoke — create / edit writes", () => {
  it("create without a location does not require locationCode", () => {
    const payload = buildProductSavePayload({
      form: baseForm,
      mode: "save",
      isEdit: false,
      selectedLocationCodes: [],
      locationDetails: [vispLocation],
      skuFallback: "PRD-TEST",
    });

    expect(payload.locationCode).toBeUndefined();
    expect(payload.locationStock).toBeUndefined();
    expect(payload.quantity).toBe(0);
    expect(payload.costPrice).toBe(2500);
    expect(payload.sellPrice).toBe(4000);
    expect(payload.name).toBe("Oil filter");
  });

  it("edit save does not send quantity 0 or wipe location stock", () => {
    const payload = buildProductSavePayload({
      form: { ...baseForm, sellingExcTax: "4500" },
      mode: "save",
      isEdit: true,
      selectedLocationCodes: ["VISP"],
      locationDetails: [vispLocation],
    });

    expect(payload).not.toHaveProperty("quantity");
    expect(payload.locationStock).toBeUndefined();
    expect(payload.locationCode).toBeUndefined();
    expect(payload.sellPrice).toBe(4500);
    expect(payload.costPrice).toBe(2500);
  });

  it("edit rehome writes remapped location stock without inventing qty 0 wipe", () => {
    const payload = buildProductSavePayload({
      form: baseForm,
      mode: "save",
      isEdit: true,
      rehomeForeignLocation: true,
      selectedLocationCodes: ["VISP"],
      locationDetails: [
        {
          locationCode: "VISP",
          rack: "P",
          row: "1",
          position: "3",
          quantity: "8",
        },
      ],
    });

    expect(payload.locationCode).toBe("VISP");
    expect(payload.locationStock).toEqual([
      {
        locationCode: "VISP",
        binLocation: "Rack P · Row 1 · Pos 3",
        quantity: 8,
      },
    ]);
    expect(payload).not.toHaveProperty("quantity");
  });

  it("keeps cost and sell independent on edit", () => {
    const payload = buildProductSavePayload({
      form: { ...baseForm, purchaseExcTax: "100", sellingExcTax: "900" },
      mode: "save",
      isEdit: true,
      selectedLocationCodes: [],
      locationDetails: [],
    });

    expect(payload.costPrice).toBe(100);
    expect(payload.sellPrice).toBe(900);
    expect(payload.sellPrice).not.toBe(payload.costPrice);
  });

  it("omits sellPrice when selling field is blank", () => {
    const payload = buildProductSavePayload({
      form: { ...baseForm, sellingExcTax: "" },
      mode: "save",
      isEdit: true,
      selectedLocationCodes: [],
      locationDetails: [],
    });

    expect(payload.sellPrice).toBeUndefined();
  });

  it("create with a selected location can attach empty stock rows", () => {
    const payload = buildProductSavePayload({
      form: baseForm,
      mode: "save",
      isEdit: false,
      selectedLocationCodes: ["VISP"],
      locationDetails: [vispLocation],
    });

    expect(payload.locationCode).toBe("VISP");
    expect(payload.locationStock).toEqual([
      { locationCode: "VISP", binLocation: undefined, quantity: 0 },
    ]);
    expect(payload.quantity).toBeUndefined();
  });

  it("opening-stock save on edit sends location quantities", () => {
    const payload = buildProductSavePayload({
      form: baseForm,
      mode: "saveOpeningStock",
      isEdit: true,
      selectedLocationCodes: ["VISP"],
      locationDetails: [vispLocation],
    });

    expect(payload.locationStock?.[0]?.quantity).toBe(12);
    expect(payload.locationCode).toBe("VISP");
  });

  it("price-catalog create defaults blank sell to 0 and skips stock", () => {
    const payload = buildProductSavePayload({
      form: {
        ...baseForm,
        purchaseExcTax: "",
        sellingExcTax: "",
        manageStock: false,
      },
      mode: "save",
      isEdit: false,
      priceCatalogOnly: true,
      selectedLocationCodes: ["VA"],
      locationDetails: [
        {
          locationCode: "VA",
          rack: "A",
          row: "1",
          position: "2",
          quantity: "99",
        },
      ],
    });

    expect(payload.costPrice).toBe(0);
    expect(payload.sellPrice).toBe(0);
    expect(payload.quantity).toBe(0);
    expect(payload.locationStock).toBeUndefined();
    // Own-home location is stamped so VP/VA lists show Business Location.
    expect(payload.locationCode).toBe("VA");
    expect(payload.reorderPoint).toBeUndefined();
  });

  it("edit with cleared image sends null imageUrl", () => {
    const payload = buildProductSavePayload({
      form: baseForm,
      mode: "save",
      isEdit: true,
      selectedLocationCodes: [],
      locationDetails: [],
      imageUrl: null,
    });

    expect(payload.imageUrl).toBeNull();
  });

  it("create omits imageUrl when none uploaded", () => {
    const payload = buildProductSavePayload({
      form: baseForm,
      mode: "save",
      isEdit: false,
      selectedLocationCodes: [],
      locationDetails: [],
      imageUrl: null,
    });

    expect(payload.imageUrl).toBeNull();
  });
});
