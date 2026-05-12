import * as z from "zod/v4";
import { fetchEvents, startOfWeek, endOfWeek, toResult } from "../calendar.js";

export function registerGetEventsThisWeekTool(server) {
  server.registerTool(
    "get_events_this_week",
    {
      title: "Get Events This Week",
      description:
        "Returns all calendar events for the current week (Monday–Sunday).\n\n" +
        "Examples:\n" +
        "- All events this week: {}\n" +
        '- Work calendar only: { "calendars": ["Work"] }',
      inputSchema: z.object({
        calendars: z.array(z.string().min(1))
          .optional()
          .describe("Optional list of calendar names to search")
      }),
      annotations: { readOnlyHint: true }
    },
    async ({ calendars = [] }) => {
      const now = new Date();
      const events = await fetchEvents(startOfWeek(now), endOfWeek(now), calendars);
      return toResult(events);
    }
  );
}
