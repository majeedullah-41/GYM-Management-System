import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  DEFAULT_MEMBER_DUES_TEMPLATE,
  DEFAULT_SUPPLIER_DUES_TEMPLATE,
  normalizeWhatsAppPhone,
  renderTemplate,
} from "../whatsapp";

describe("whatsapp utilities", () => {
  describe("normalizeWhatsAppPhone", () => {
    it("normalizes local Pakistani 03XX numbers to 923XX", () => {
      expect(normalizeWhatsAppPhone("03001234567", "92")).toBe("923001234567");
      expect(normalizeWhatsAppPhone("0300-1234567", "92")).toBe("923001234567");
    });

    it("preserves international +92 numbers without duplicate prefix", () => {
      expect(normalizeWhatsAppPhone("+92 321 9876543", "92")).toBe("923219876543");
      expect(normalizeWhatsAppPhone("00923219876543", "92")).toBe("923219876543");
      expect(normalizeWhatsAppPhone("923219876543", "92")).toBe("923219876543");
    });

    it("normalizes 10-digit mobile numbers starting with 3", () => {
      expect(normalizeWhatsAppPhone("3001234567", "92")).toBe("923001234567");
    });

    it("returns empty string for null or empty input", () => {
      expect(normalizeWhatsAppPhone(null)).toBe("");
      expect(normalizeWhatsAppPhone("")).toBe("");
    });
  });

  describe("buildWhatsAppUrl", () => {
    it("builds https://wa.me URL in web mode", () => {
      const url = buildWhatsAppUrl("923001234567", "Hello World", "web");
      expect(url).toBe("https://wa.me/923001234567?text=Hello%20World");
    });

    it("builds whatsapp://send URL in desktop mode", () => {
      const url = buildWhatsAppUrl("923001234567", "Hello World", "desktop");
      expect(url).toBe("whatsapp://send?phone=923001234567&text=Hello%20World");
    });
  });

  describe("renderTemplate", () => {
    it("replaces member template placeholders", () => {
      const rendered = renderTemplate(DEFAULT_MEMBER_DUES_TEMPLATE, {
        member_name: "Ali Khan",
        member_number: "0042",
        plan_name: "Monthly Gold",
        due_amount: "Rs. 2,500",
        expiry_date: "30 Oct 2026",
        gym_name: "Iron Gym",
      });
      expect(rendered).toContain("Ali Khan");
      expect(rendered).toContain("Iron Gym");
      expect(rendered).toContain("Rs. 2,500");
      expect(rendered).toContain("#0042");
    });

    it("replaces supplier template placeholders", () => {
      const rendered = renderTemplate(DEFAULT_SUPPLIER_DUES_TEMPLATE, {
        supplier_name: "Bilal Traders",
        company: "Optimum Nutrition PK",
        total_purchased: "Rs. 50,000",
        total_paid: "Rs. 35,000",
        due_amount: "Rs. 15,000",
        gym_name: "Iron Gym",
      });
      expect(rendered).toContain("Bilal Traders");
      expect(rendered).toContain("Rs. 50,000");
      expect(rendered).toContain("Rs. 15,000");
    });

    it("replaces in a single pass without rescanning replacement values and preserves unknown placeholders", () => {
      const rendered = renderTemplate("Hello [Member Name], from [Gym Name] ([Unknown Token])", {
        member_name: "User [Gym Name]",
        gym_name: "Iron Gym",
      });
      expect(rendered).toBe("Hello User [Gym Name], from Iron Gym ([Unknown Token])");
    });
  });
});

