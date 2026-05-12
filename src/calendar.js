import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function fetchEvents(start, end) {
  const script = `
    var cal = Application("Calendar");
    var start = new Date(${start.getTime()});
    var end = new Date(${end.getTime()});
    var result = [];
    cal.calendars().forEach(function(calendar) {
      try {
        var events = calendar.events.whose({
          _and: [
            { startDate: { _greaterThanEquals: start } },
            { startDate: { _lessThanEquals: end } }
          ]
        })();
        events.forEach(function(event) {
          try {
            result.push({
              id: event.uid(),
              title: event.summary(),
              start: event.startDate().toISOString(),
              end: event.endDate().toISOString(),
              allDay: event.allDayEvent(),
              location: event.location() || null,
              notes: event.description() || null,
              calendar: calendar.name()
            });
          } catch (e) {}
        });
      } catch (e) {}
    });
    JSON.stringify(result);
  `;

  const { stdout } = await execFileAsync("osascript", ["-l", "JavaScript", "-e", script]);
  return JSON.parse(stdout.trim());
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