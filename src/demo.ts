import type { Sale } from "./data";

// Entirely invented from fixed arithmetic. No company workbook is read here.
export const DEMO_NAME = "Demonstration data — fictional sales";
export const DEMO_START = "2024-01-01";
export const DEMO_END = "2025-12-29";
export function demonstrationSales(): Sale[] {
  const products = [
    ["Demo liquid nutrition", "Demo Crop Nutrition", "GALLON"],
    ["Demo soil blend", "Demo Crop Nutrition", "TON"],
    ["Demo cover crop seed", "Demo Seed", "BAG"],
  ];
  const records: Sale[] = [];
  for (let week = 0; week < 105; week++) {
    const day = new Date(DEMO_START + "T00:00:00Z");
    day.setUTCDate(day.getUTCDate() + week * 7);
    for (const [region, location] of ["93206", "93901"].entries()) {
      products.forEach(([product, category, unit], productIndex) => {
        records.push({
          product,
          category,
          unit,
          location,
          date: day.toISOString().slice(0, 10),
          quantity: 25 + productIndex * 10 + region * 5 + ((week * 7) % 40),
        });
      });
    }
  }
  return records;
}
