import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it("makes lowercase kebab-case ASCII without accents", () => {
    expect(slugify("Convenciones de Diseño: Formularios!")).toBe("convenciones-de-diseno-formularios");
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify("¿¡!?")).toBe("");
  });

  it("caps the length without leaving a trailing dash", () => {
    const slugValue = slugify("word ".repeat(30), 12);
    expect(slugValue.length).toBeLessThanOrEqual(12);
    expect(slugValue.endsWith("-")).toBe(false);
  });
});
