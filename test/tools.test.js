import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { createExecFileMock } from "./helpers/execFileMock.js";

// Only the process boundary is replaced. The tools run against the real calendar.js, so
// a tool asking for the wrong window fails here rather than passing against a stub.
const mock = createExecFileMock();
jest.unstable_mockModule("node:child_process", () => ({
  execFile: mock.execFile,
  default: { execFile: mock.execFile }
}));

const [byDate, thisWeek, thisMonth, inRange, listCalendars] = await Promise.all([
  import("../src/tools/getEventsByDate.js"),
  import("../src/tools/getEventsThisWeek.js"),
  import("../src/tools/getEventsThisMonth.js"),
  import("../src/tools/getEventsInRange.js"),
  import("../src/tools/listCalendars.js")
]);

const EXPECTED = [
  "get_events_by_date",
  "get_events_in_range",
  "get_events_this_month",
  "get_events_this_week",
  "list_calendars"
];

function loadTools() {
  const tools = new Map();
  const server = {
    registerTool: (name, config, handler) => tools.set(name, { config, handler })
  };
  byDate.registerGetEventsByDateTool(server);
  thisWeek.registerGetEventsThisWeekTool(server);
  thisMonth.registerGetEventsThisMonthTool(server);
  inRange.registerGetEventsInRangeTool(server);
  listCalendars.registerListCalendarsTool(server);
  return tools;
}

const valueOf = (args, flag) => args[args.indexOf(flag) + 1];
const dayOf = (stamp) => stamp.slice(0, 10);
const hourOf = (stamp) => stamp.slice(11, 13);

beforeEach(() => {
  mock.calls.length = 0;
  mock.setImpl(async () => ({ stdout: "[]", stderr: "" }));
});

describe("tool registration", () => {
  test("every advertised tool is registered exactly once", () => {
    expect([...loadTools().keys()].sort()).toEqual(EXPECTED);
  });

  test("every tool is annotated read-only", () => {
    const flags = [...loadTools()]
      .map(([name, { config }]) => [name, config.annotations.readOnlyHint])
      .sort(([a], [b]) => a.localeCompare(b));
    expect(flags).toEqual(EXPECTED.map((name) => [name, true]));
  });

  test("every tool carries a title, a description and a schema", () => {
    const incomplete = [...loadTools()]
      .filter(([, { config }]) => !(config.title && config.description && config.inputSchema))
      .map(([name]) => name);
    expect(incomplete).toEqual([]);
  });
});

describe("input validation", () => {
  test("get_events_by_date rejects a date that is not YYYY-MM-DD", () => {
    const schema = loadTools().get("get_events_by_date").config.inputSchema;
    expect(schema.safeParse({ date: "12/05/2026" }).success).toBe(false);
    expect(schema.safeParse({ date: "2026-5-1" }).success).toBe(false);
    expect(schema.safeParse({ date: "2026-05-12" }).success).toBe(true);
  });

  test("an empty calendar name is rejected", () => {
    const schema = loadTools().get("get_events_by_date").config.inputSchema;
    expect(schema.safeParse({ date: "2026-05-12", calendars: [""] }).success).toBe(false);
    expect(schema.safeParse({ date: "2026-05-12", calendars: ["Work"] }).success).toBe(true);
  });

  test("get_events_in_range requires both ends", () => {
    const schema = loadTools().get("get_events_in_range").config.inputSchema;
    expect(schema.safeParse({ start: "2026-05-12" }).success).toBe(false);
    expect(schema.safeParse({ start: "2026-05-12", end: "2026-05-13" }).success).toBe(true);
  });
});

describe("handlers query the window they advertise", () => {
  test("get_events_by_date spans midnight to end of the requested day", async () => {
    await loadTools().get("get_events_by_date").handler({ date: "2026-05-12" });
    const args = mock.lastArgs();
    expect(dayOf(valueOf(args, "--start"))).toBe("2026-05-12");
    expect(hourOf(valueOf(args, "--start"))).toBe("00");
    expect(dayOf(valueOf(args, "--end"))).toBe("2026-05-12");
    expect(hourOf(valueOf(args, "--end"))).toBe("23");
  });

  test("get_events_in_range spans start-of-first to end-of-last", async () => {
    await loadTools()
      .get("get_events_in_range")
      .handler({ start: "2026-05-12", end: "2026-05-25" });
    const args = mock.lastArgs();
    expect(dayOf(valueOf(args, "--start"))).toBe("2026-05-12");
    expect(dayOf(valueOf(args, "--end"))).toBe("2026-05-25");
    expect(hourOf(valueOf(args, "--end"))).toBe("23");
  });

  test("get_events_this_week asks for Monday through Sunday", async () => {
    await loadTools().get("get_events_this_week").handler({});
    const args = mock.lastArgs();
    expect(new Date(valueOf(args, "--start")).getDay()).toBe(1);
    expect(new Date(valueOf(args, "--end")).getDay()).toBe(0);
  });

  test("get_events_this_month asks for the first through the last of the month", async () => {
    await loadTools().get("get_events_this_month").handler({});
    const args = mock.lastArgs();
    const start = new Date(valueOf(args, "--start"));
    const end = new Date(valueOf(args, "--end"));
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(start.getMonth());
    expect(new Date(end.getTime() + 1000).getDate()).toBe(1);
  });

  test("calendars are forwarded, and absent by default", async () => {
    const tools = loadTools();
    await tools.get("get_events_this_week").handler({ calendars: ["Work", "Personal"] });
    expect(mock.lastArgs().filter((a) => a === "--calendar")).toHaveLength(2);
    await tools.get("get_events_this_week").handler({});
    expect(mock.lastArgs()).not.toContain("--calendar");
  });

  test("list_calendars queries calendars, never events", async () => {
    await loadTools().get("list_calendars").handler({});
    expect(mock.lastArgs()[1]).toBe("list-calendars");
    expect(mock.lastArgs()).not.toContain("events");
  });
});

describe("handlers shape their results", () => {
  test("event tools report the count they received", async () => {
    mock.setImpl(async () => ({
      stdout: '[{"title":"Standup"},{"title":"Retro"}]',
      stderr: ""
    }));
    const result = await loadTools().get("get_events_by_date").handler({ date: "2026-05-12" });
    expect(result.content[0].text).toBe("2 events");
    expect(result.structuredContent.count).toBe(2);
  });

  test("list_calendars reports calendars, not events", async () => {
    mock.setImpl(async () => ({ stdout: '[{"title":"Work"}]', stderr: "" }));
    const result = await loadTools().get("list_calendars").handler({});
    expect(result.content[0].text).toBe("1 calendar");
    expect(result.structuredContent.calendars).toEqual([{ title: "Work" }]);
  });

  // A swallowed failure would look identical to an empty calendar, which is the one
  // wrong answer a calendar tool must never give.
  test("a helper failure propagates instead of reporting zero events", async () => {
    mock.setImpl(async () => {
      throw Object.assign(new Error("boom"), { stderr: "no calendar access" });
    });
    await expect(
      loadTools().get("get_events_by_date").handler({ date: "2026-05-12" })
    ).rejects.toThrow("no calendar access");
  });
});
