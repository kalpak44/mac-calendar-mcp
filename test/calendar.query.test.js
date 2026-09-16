import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { createExecFileMock } from "./helpers/execFileMock.js";

const mock = createExecFileMock();
jest.unstable_mockModule("node:child_process", () => ({
  execFile: mock.execFile,
  default: { execFile: mock.execFile }
}));

const { fetchCalendars, fetchEvents, toCalendarsResult, toResult } =
  await import("../src/calendar.js");

const valueOf = (args, flag) => args[args.indexOf(flag) + 1];
const dayOf = (stamp) => stamp.slice(0, 10);

beforeEach(() => {
  mock.calls.length = 0;
  mock.setImpl(async () => ({ stdout: "[]", stderr: "" }));
});

describe("invoking the Swift helper", () => {
  test("list-calendars is dispatched to swift", async () => {
    mock.setImpl(async () => ({ stdout: '[{"title":"Work"}]', stderr: "" }));
    await expect(fetchCalendars()).resolves.toEqual([{ title: "Work" }]);
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].file).toBe("swift");
    expect(mock.calls[0].args[1]).toBe("list-calendars");
  });

  test("the script path is resolved and passed first", async () => {
    await fetchCalendars();
    expect(mock.calls[0].args[0]).toMatch(/calendar-query\.swift$/);
  });

  test("stdout is parsed as JSON after trimming", async () => {
    mock.setImpl(async () => ({ stdout: '  [{"id":1}]\n ', stderr: "" }));
    await expect(fetchCalendars()).resolves.toEqual([{ id: 1 }]);
  });

  test("a helper failure surfaces stderr, not a bare rejection", async () => {
    mock.setImpl(async () => {
      throw Object.assign(new Error("spawn failed"), { stderr: "  no calendar access  " });
    });
    await expect(fetchCalendars()).rejects.toThrow("Calendar helper failed: no calendar access");
  });

  test("a failure without stderr falls back to the error message", async () => {
    mock.setImpl(async () => {
      throw new Error("swift not found");
    });
    await expect(fetchCalendars()).rejects.toThrow("Calendar helper failed: swift not found");
  });

  test("a failure with neither reports Unknown error", async () => {
    mock.setImpl(async () => {
      throw {};
    });
    await expect(fetchCalendars()).rejects.toThrow("Calendar helper failed: Unknown error");
  });

  test("unparseable stdout is reported as a helper failure", async () => {
    mock.setImpl(async () => ({ stdout: "not json", stderr: "" }));
    await expect(fetchCalendars()).rejects.toThrow("Calendar helper failed:");
  });
});

describe("fetchEvents argument building", () => {
  test("start and end are sent as local ISO stamps carrying an offset", async () => {
    await fetchEvents(new Date("2026-05-12T00:00:00"), new Date("2026-05-12T23:59:59"));
    const args = mock.lastArgs();
    expect(args[1]).toBe("events");
    expect(valueOf(args, "--start")).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
    );
    expect(dayOf(valueOf(args, "--start"))).toBe("2026-05-12");
    expect(dayOf(valueOf(args, "--end"))).toBe("2026-05-12");
  });

  test("each calendar name becomes its own --calendar flag", async () => {
    await fetchEvents(new Date("2026-05-12T00:00:00"), new Date("2026-05-12T23:59:59"), [
      "Work",
      "Personal"
    ]);
    const args = mock.lastArgs();
    expect(args.filter((a) => a === "--calendar")).toHaveLength(2);
    expect(args).toContain("Work");
    expect(args).toContain("Personal");
  });

  test("no calendars means no --calendar flag at all", async () => {
    await fetchEvents(new Date("2026-05-12T00:00:00"), new Date("2026-05-12T23:59:59"));
    expect(mock.lastArgs()).not.toContain("--calendar");
  });

  // Without the cap a caller asking for "all events" would hand the Swift helper a
  // multi-year window and block on a full calendar scan.
  test("a range longer than 90 days is capped at 90 days from the start", async () => {
    await fetchEvents(new Date("2026-01-01T00:00:00"), new Date("2027-01-01T00:00:00"));
    const args = mock.lastArgs();
    expect(dayOf(valueOf(args, "--start"))).toBe("2026-01-01");
    expect(dayOf(valueOf(args, "--end"))).toBe("2026-04-01");
  });

  test("a range shorter than 90 days is left alone", async () => {
    await fetchEvents(new Date("2026-01-01T00:00:00"), new Date("2026-01-08T00:00:00"));
    expect(dayOf(valueOf(mock.lastArgs(), "--end"))).toBe("2026-01-08");
  });

  test("an end before the start is not stretched forward", async () => {
    await fetchEvents(new Date("2026-05-12T00:00:00"), new Date("2026-05-01T00:00:00"));
    expect(dayOf(valueOf(mock.lastArgs(), "--end"))).toBe("2026-05-01");
  });
});

describe("result shaping", () => {
  test("one event is singular, zero and many are plural", () => {
    expect(toResult([{}]).content[0].text).toBe("1 event");
    expect(toResult([]).content[0].text).toBe("0 events");
    expect(toResult([{}, {}]).content[0].text).toBe("2 events");
  });

  test("events are echoed with their count in structuredContent", () => {
    const events = [{ title: "Standup" }];
    expect(toResult(events).structuredContent).toEqual({ count: 1, events });
    expect(toResult(events).content[0].type).toBe("text");
  });

  test("calendars pluralise and echo the same way", () => {
    const calendars = [{ title: "Work" }];
    expect(toCalendarsResult(calendars).content[0].text).toBe("1 calendar");
    expect(toCalendarsResult([]).content[0].text).toBe("0 calendars");
    expect(toCalendarsResult([{}, {}]).content[0].text).toBe("2 calendars");
    expect(toCalendarsResult(calendars).structuredContent).toEqual({ count: 1, calendars });
  });
});
