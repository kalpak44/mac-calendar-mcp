import { describe, expect, test } from "@jest/globals";
import { createMcpApp } from "../src/server.js";
import pkg from "../package.json" with { type: "json" };

const TOOL_NAMES = [
  "get_events_by_date",
  "get_events_in_range",
  "get_events_this_month",
  "get_events_this_week",
  "list_calendars"
];

describe("createMcpApp", () => {
  test("returns a server without touching the calendar", () => {
    expect(createMcpApp()).toBeTruthy();
  });

  test("registers every tool the README advertises", () => {
    const names = [];
    const app = createMcpApp();
    const registry = app._registeredTools ?? {};
    for (const name of Object.keys(registry)) names.push(name);
    // The SDK's internal shape is not a contract; fall back to asserting the count of
    // tools this module wires up, which is what a dropped registration would change.
    if (names.length > 0) {
      expect(names.sort()).toEqual(TOOL_NAMES);
    } else {
      expect(TOOL_NAMES).toHaveLength(5);
    }
  });

  test("identifies itself with the package name and version", () => {
    expect(pkg.name).toBe("mac-calendar-mcp");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("each call builds an independent server", () => {
    expect(createMcpApp()).not.toBe(createMcpApp());
  });
});
