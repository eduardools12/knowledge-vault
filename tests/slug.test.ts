import { describe, expect, it } from "vitest";

import { slugify, uniqueSlug } from "@/lib/slug";

/**
 * The database enforces `^[a-z0-9]+(-[a-z0-9]+)*$` on every slug column, so a
 * bug here is not a cosmetic URL — it is a constraint violation on save, in a
 * language where accented names are the norm.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("slugify", () => {
  it("handles ordinary names", () => {
    expect(slugify("Tecnologia")).toBe("tecnologia");
    expect(slugify("Ciência de Dados")).toBe("ciencia-de-dados");
  });

  it("strips Portuguese accents rather than the letters carrying them", () => {
    // Removing the character instead of the accent would leave "an-lise".
    expect(slugify("Análise")).toBe("analise");
    expect(slugify("Estatística")).toBe("estatistica");
    expect(slugify("Programação")).toBe("programacao");
    expect(slugify("Çã ÊÍÕÜ")).toBe("ca-eiou");
  });

  it("collapses runs of separators into a single hyphen", () => {
    expect(slugify("Dados   &   Métricas")).toBe("dados-metricas");
    expect(slugify("a---b")).toBe("a-b");
  });

  it("does not leave a leading or trailing hyphen", () => {
    expect(slugify("  Futebol!  ")).toBe("futebol");
    expect(slugify("#python")).toBe("python");
    expect(slugify("--x--")).toBe("x");
  });

  it("returns null when nothing usable survives", () => {
    // The caller has to decide; an empty string would fail the CHECK constraint.
    expect(slugify("")).toBeNull();
    expect(slugify("   ")).toBeNull();
    expect(slugify("!!!")).toBeNull();
    expect(slugify("🟢🔵")).toBeNull();
  });

  it("keeps digits", () => {
    expect(slugify("Postgres 17")).toBe("postgres-17");
  });

  it("truncates without leaving a trailing hyphen at the cut", () => {
    const long = "palavra ".repeat(30);
    const slug = slugify(long);

    expect(slug).not.toBeNull();
    expect(slug!.length).toBeLessThanOrEqual(60);
    expect(slug).toMatch(SLUG_PATTERN);
  });

  it("always produces something the database will accept", () => {
    for (const name of [
      "Tecnologia",
      "Análise de Dados",
      "C++",
      "Ação & Reação",
      "  espaços  ",
      "MAIÚSCULAS",
      "acentuação-com-hífen",
      "1234",
    ]) {
      const slug = slugify(name);

      if (slug !== null) {
        expect(slug, name).toMatch(SLUG_PATTERN);
      }
    }
  });
});

describe("uniqueSlug", () => {
  it("returns the base when it is free", () => {
    expect(uniqueSlug("dados", [])).toBe("dados");
    expect(uniqueSlug("dados", ["outra"])).toBe("dados");
  });

  it("suffixes with an incrementing number when taken", () => {
    expect(uniqueSlug("dados", ["dados"])).toBe("dados-2");
    expect(uniqueSlug("dados", ["dados", "dados-2"])).toBe("dados-3");
  });

  it("skips over gaps rather than reusing a taken slug", () => {
    expect(uniqueSlug("dados", ["dados", "dados-2", "dados-3"])).toBe("dados-4");
  });

  it("keeps the result within the length limit", () => {
    const base = "a".repeat(60);
    const taken = [base, `${base.slice(0, 58)}-2`];

    const result = uniqueSlug(base, taken);

    expect(result.length).toBeLessThanOrEqual(60);
    expect(result).toMatch(SLUG_PATTERN);
  });

  it("never returns a slug that is already taken", () => {
    const taken = ["x", "x-2", "x-3", "x-4", "x-5"];

    expect(taken).not.toContain(uniqueSlug("x", taken));
  });
});
