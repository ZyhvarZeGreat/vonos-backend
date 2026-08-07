import { describe, expect, it } from "vitest";
import {
  formatSaleNotesForDisplay,
  parseSaleInvoiceNotes,
  sellNoteOnly,
} from "./saleInvoiceNotes";

describe("parseSaleInvoiceNotes", () => {
  it("restores every structured field written by the sale form", () => {
    const notes = [
      "Customer asked for morning pickup",
      "Customer location: Ikeja workshop",
      "Pay term: 14 days",
      "Shipping details: Leave at gate",
      "Delivered to: Front desk",
      "Delivery person: Musa",
      "Shipping charges: 1500.00",
      "Additional expense: Installation (2500.00)",
      "Additional expense: Handling (100.00)",
      "Redeemed points: 40",
      "Invoice scheme: custom",
      "Sales person: Ada",
      "Service staff: Bode",
      "Mileage: 88210",
      "Vehicle time in: 2026-08-01T09:30",
      "Vehicle release: 2026-08-01T16:00",
    ].join("\n");

    expect(parseSaleInvoiceNotes(notes)).toEqual({
      salesPerson: "Ada",
      serviceStaff: "Bode",
      mileage: "88210",
      plateNumber: null,
      carModelYear: null,
      vehicleTimeIn: "2026-08-01T09:30",
      vehicleRelease: "2026-08-01T16:00",
      customerLocation: "Ikeja workshop",
      payTermValue: "14",
      payTermUnit: "days",
      invoiceScheme: "custom",
      shippingDetails: "Leave at gate",
      deliveredTo: "Front desk",
      deliveryPerson: "Musa",
      shippingCharges: "1500.00",
      redeemedPoints: "40",
      additionalExpenses: [
        { name: "Installation", amount: "2500.00" },
        { name: "Handling", amount: "100.00" },
      ],
    });
  });

  it("reads plate and car model & year lines", () => {
    const notes = [
      "Plate number: GWA-425SF",
      "Car model & year: COROLLA 2009",
      "Mileage: 120000",
    ].join("\n");

    expect(parseSaleInvoiceNotes(notes)).toMatchObject({
      plateNumber: "GWA-425SF",
      carModelYear: "COROLLA 2009",
      mileage: "120000",
    });
  });
});

describe("formatSaleNotesForDisplay", () => {
  it("rewrites ISO and datetime-local stamps to HQ6 dates", () => {
    const notes = [
      "Customer asked for morning pickup",
      "Vehicle time in: 2026-08-01T09:30",
      "Vehicle release: 2026-08-01T16:00:00.000Z",
    ].join("\n");

    const formatted = formatSaleNotesForDisplay(notes);
    expect(formatted).toContain("Customer asked for morning pickup");
    expect(formatted).toMatch(/Vehicle time in: \d{2}-\d{2}-2026 \d{2}:\d{2}/);
    expect(formatted).toMatch(/Vehicle release: \d{2}-\d{2}-2026 \d{2}:\d{2}/);
    expect(formatted).not.toContain("T09:30");
    expect(formatted).not.toContain(".000Z");
  });

  it("sellNoteOnly drops structured meta lines", () => {
    expect(
      sellNoteOnly(
        "Thanks\nVehicle time in: 2026-08-01T09:30\nSales person: Ada",
      ),
    ).toBe("Thanks");
  });
});
