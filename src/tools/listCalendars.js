import * as z from "zod/v4";
import { fetchCalendars, toCalendarsResult } from "../calendar.js";

export function registerListCalendarsTool(server) {
  server.registerTool(
    "list_calendars",
    {
      title: "List Calendars",
      description:
        "Returns the calendars available to the local Calendar app.\n\n" +
        "Use this to discover calendar names before passing them to the event tools.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async () => {
      const calendars = await fetchCalendars();
      return toCalendarsResult(calendars);
    }
  );
}
