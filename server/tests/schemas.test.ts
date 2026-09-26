/** Unit tests for the regex-based validators shared by every endpoint. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { bdPhone, isoDate, locationFields, nidNumber, personName, withValidLocation } from "../src/shared/schemas.js";

describe("bdPhone", () => {
  it("accepts and normalises Bangladeshi mobile numbers", () => {
    for (const input of ["01712345678", "+8801712345678", "8801712345678", "017-1234-5678", "+880 1912 345678"]) {
      assert.match(bdPhone.parse(input), /^01[3-9]\d{8}$/, input);
    }
  });

  it("rejects landlines, wrong operators and wrong lengths", () => {
    for (const input of ["0212345678", "01212345678", "0171234567", "017123456789", "abc"]) {
      assert.equal(bdPhone.safeParse(input).success, false, input);
    }
  });
});

describe("nidNumber", () => {
  it("accepts 10, 13 and 17 digit NIDs only", () => {
    assert.ok(nidNumber.safeParse("1234567890").success);
    assert.ok(nidNumber.safeParse("1234567890123").success);
    assert.ok(nidNumber.safeParse("12345678901234567").success);
    assert.equal(nidNumber.safeParse("12345678901").success, false);
    assert.equal(nidNumber.safeParse("12345abcde").success, false);
  });
});

describe("personName", () => {
  it("allows Bangla and English names, not symbols", () => {
    assert.ok(personName.safeParse("রহিম উদ্দিন").success);
    assert.ok(personName.safeParse("Md. Abdul-Karim").success);
    assert.equal(personName.safeParse("R2D2!").success, false);
  });
});

describe("isoDate", () => {
  it("parses calendar dates to UTC midnight and rejects impossible ones", () => {
    assert.equal(isoDate.parse("2026-01-31").toISOString(), "2026-01-31T00:00:00.000Z");
    assert.equal(isoDate.safeParse("2026-13-01").success, false);
    assert.equal(isoDate.safeParse("31/01/2026").success, false);
  });
});

describe("location", () => {
  const schema = z.object(locationFields).superRefine(withValidLocation);

  it("requires the district to belong to the division", () => {
    assert.ok(schema.safeParse({ division: "Dhaka", district: "Gazipur", area: "Tongi" }).success);
    const wrong = schema.safeParse({ division: "Sylhet", district: "Gazipur", area: "Tongi" });
    assert.equal(wrong.success, false);
    assert.deepEqual(wrong.error?.issues[0]?.path, ["district"]);
  });
});
