import { describe, expect, test } from "@jest/globals";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "../src/calendar.js";

const at = (iso) => new Date(iso);
const local = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;

describe("day boundaries", () => {
  test("startOfDay zeroes the clock without moving the date", () => {
    expect(local(startOfDay(at("2026-05-12T17:43:09")))).toBe("2026-05-12 00:00:00.000");
  });

  test("endOfDay is the last representable millisecond", () => {
    expect(local(endOfDay(at("2026-05-12T00:00:01")))).toBe("2026-05-12 23:59:59.999");
  });

  test("neither mutates its argument", () => {
    const input = at("2026-05-12T17:43:09");
    const before = input.getTime();
    startOfDay(input);
    endOfDay(input);
    expect(input.getTime()).toBe(before);
  });
});

describe("week boundaries are Monday-based", () => {
  // The Sunday case is the one that breaks: getDay() is 0, so the naive `1 - day`
  // would jump forward into the next week instead of back to the Monday just gone.
  test("Sunday belongs to the week that already started", () => {
    expect(local(startOfWeek(at("2026-05-17T12:00:00")))).toBe("2026-05-11 00:00:00.000");
    expect(local(endOfWeek(at("2026-05-17T12:00:00")))).toBe("2026-05-17 23:59:59.999");
  });

  test("Monday is its own week start", () => {
    expect(local(startOfWeek(at("2026-05-11T09:00:00")))).toBe("2026-05-11 00:00:00.000");
  });

  test("a midweek day resolves back to Monday", () => {
    expect(local(startOfWeek(at("2026-05-14T09:00:00")))).toBe("2026-05-11 00:00:00.000");
  });

  test("a week spans exactly seven days", () => {
    const start = startOfWeek(at("2026-05-14T09:00:00"));
    const end = endOfWeek(at("2026-05-14T09:00:00"));
    expect(Math.round((end - start) / 86400000)).toBe(7);
  });

  test("week start rolls back across a month boundary", () => {
    expect(local(startOfWeek(at("2026-06-02T09:00:00")))).toBe("2026-06-01 00:00:00.000");
    expect(local(startOfWeek(at("2026-06-01T09:00:00")))).toBe("2026-06-01 00:00:00.000");
    expect(local(startOfWeek(at("2026-05-31T09:00:00")))).toBe("2026-05-25 00:00:00.000");
  });
});

describe("month boundaries", () => {
  test("a 31-day month ends on the 31st", () => {
    expect(local(startOfMonth(at("2026-05-12T12:00:00")))).toBe("2026-05-01 00:00:00.000");
    expect(local(endOfMonth(at("2026-05-12T12:00:00")))).toBe("2026-05-31 23:59:59.999");
  });

  test("a 30-day month ends on the 30th", () => {
    expect(local(endOfMonth(at("2026-06-12T12:00:00")))).toBe("2026-06-30 23:59:59.999");
  });

  test("February ends on the 28th in a common year and the 29th in a leap year", () => {
    expect(local(endOfMonth(at("2026-02-10T12:00:00")))).toBe("2026-02-28 23:59:59.999");
    expect(local(endOfMonth(at("2028-02-10T12:00:00")))).toBe("2028-02-29 23:59:59.999");
  });

  test("December does not roll into the next year", () => {
    expect(local(endOfMonth(at("2026-12-05T12:00:00")))).toBe("2026-12-31 23:59:59.999");
  });
});
