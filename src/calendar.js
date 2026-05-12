import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

export async function fetchEvents(start, end) {
  const cappedEnd = new Date(Math.min(end.getTime(), start.getTime() + MAX_RANGE_MS));

  const script = `
    ObjC.import('EventKit');
    ObjC.import('Foundation');

    var status = $.EKEventStore.authorizationStatusForEntityType(0);
    if (status === 4) {
      throw new Error('Calendar access is Write Only. Change to Full Access in System Settings → Privacy & Security → Calendars.');
    }
    if (status !== 3) {
      throw new Error('Calendar access not authorized (status: ' + status + '). Grant Full Access in System Settings → Privacy & Security → Calendars.');
    }

    var store = $.EKEventStore.alloc.init;
    var startDate = $.NSDate.dateWithTimeIntervalSince1970(${start.getTime() / 1000});
    var endDate = $.NSDate.dateWithTimeIntervalSince1970(${cappedEnd.getTime() / 1000});
    var predicate = store.predicateForEventsWithStartDateEndDateCalendars(startDate, endDate, null);
    var events = store.eventsMatchingPredicate(predicate);

    var result = [];
    var count = events.count;
    for (var i = 0; i < count; i++) {
      try {
        var ev = events.objectAtIndex(i);
        result.push({
          id: ObjC.unwrap(ev.eventIdentifier),
          title: ObjC.unwrap(ev.title),
          start: new Date(ev.startDate.timeIntervalSince1970 * 1000).toISOString(),
          end: new Date(ev.endDate.timeIntervalSince1970 * 1000).toISOString(),
          allDay: !!ev.isAllDay,
          location: ev.location ? ObjC.unwrap(ev.location) : null,
          notes: ev.notes ? ObjC.unwrap(ev.notes) : null,
          calendar: ObjC.unwrap(ev.calendar.title)
        });
      } catch (e) {}
    }
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