import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
const __dirname = dirname(fileURLToPath(import.meta.url));

function runtimeBaseDir() {
  const mainScript = process.argv[1];

  if (mainScript && mainScript !== "-e" && existsSync(mainScript)) {
    return dirname(mainScript);
  }

  return __dirname;
}

function resolveCalendarQueryScript() {
  const baseDir = runtimeBaseDir();
  const candidates = [
    resolve(baseDir, "calendar-query.swift"),
    resolve(baseDir, "../scripts/calendar-query.swift"),
    resolve(__dirname, "calendar-query.swift"),
    resolve(__dirname, "../scripts/calendar-query.swift")
  ];

  const scriptPath = candidates.find((candidate) => existsSync(candidate));

  if (!scriptPath) {
    throw new Error("Unable to locate calendar-query.swift");
  }

  return scriptPath;
}

function toIsoOffsetString(date) {
  const pad = (value) => String(Math.abs(value)).padStart(2, "0");
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const remainingMinutes = pad(Math.abs(offsetMinutes) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${remainingMinutes}`;
}

async function invokeCalendarQuery(args) {
  const scriptPath = resolveCalendarQueryScript();

  try {
    const { stdout } = await execFileAsync("swift", [scriptPath, ...args], {
      maxBuffer: 10 * 1024 * 1024
    });
    return JSON.parse(stdout.trim());
  } catch (error) {
    const details = error?.stderr?.trim() || error?.message || "Unknown error";
    throw new Error(`Calendar helper failed: ${details}`);
  }
}

export async function fetchCalendars() {
  return invokeCalendarQuery(["list-calendars"]);
}

export async function fetchEvents(start, end, calendars = []) {
  const cappedEnd = new Date(Math.min(end.getTime(), start.getTime() + MAX_RANGE_MS));
  const args = [
    "events",
    "--start",
    toIsoOffsetString(start),
    "--end",
    toIsoOffsetString(cappedEnd)
  ];

  for (const calendar of calendars) {
    args.push("--calendar", calendar);
  }

  return invokeCalendarQuery(args);
}

export function toResult(events) {
  return {
    content: [
      {
        type: "text",
        text: `${events.length} event${events.length === 1 ? "" : "s"}`
      }
    ],
    structuredContent: {
      count: events.length,
      events
    }
  };
}

export function toCalendarsResult(calendars) {
  return {
    content: [
      {
        type: "text",
        text: `${calendars.length} calendar${calendars.length === 1 ? "" : "s"}`
      }
    ],
    structuredContent: {
      count: calendars.length,
      calendars
    }
  };
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
