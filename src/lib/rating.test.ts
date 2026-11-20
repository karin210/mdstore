import { describe, expect, it } from "vitest";
import { rating_fill_percent, stars_schema, to_prompt_rating } from "@/lib/rating";

describe("to_prompt_rating", () => {
  it("is zero while nobody has rated", () => {
    expect(to_prompt_rating(0, 0)).toEqual({ average: 0, count: 0 });
  });

  it("rounds the mean to one decimal", () => {
    expect(to_prompt_rating(3, 13)).toEqual({ average: 4.3, count: 3 });
    expect(to_prompt_rating(2, 9)).toEqual({ average: 4.5, count: 2 });
  });
});

describe("rating_fill_percent", () => {
  it("maps the average onto five stars", () => {
    expect(rating_fill_percent(4.3)).toBeCloseTo(86);
    expect(rating_fill_percent(0)).toBe(0);
    expect(rating_fill_percent(5)).toBe(100);
  });
});

describe("stars_schema", () => {
  it("accepts whole stars from 1 to 5, or null to remove a rating", () => {
    expect(stars_schema.safeParse(1).success).toBe(true);
    expect(stars_schema.safeParse(5).success).toBe(true);
    expect(stars_schema.safeParse(null).success).toBe(true);
  });

  it("refuses anything else", () => {
    for (const value of [0, 6, 3.5, "4", undefined]) expect(stars_schema.safeParse(value).success).toBe(false);
  });
});
