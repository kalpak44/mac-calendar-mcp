import * as z from "zod/v4";
import { fetchEvents, startOfMonth, endOfMonth, toResult } from "../calendar.js";

export function registerGetEventsThisMonthTool(server) {
  server.registerTool(
    "get_events_this_month",
    {
      title: "Get Events This Month",
      description:
        "Returns all calendar events for the current calendar month.\n\n" +
        "Examples:\n" +
        "- All events this month: {}\n" +
        '- Personal calendar only: { "calendars": ["Personal"] }',
      inputSchema: z.object({
        calendars: z.array(z.string().min(1))
          .optional()
          .describe("Optional list of calendar names to search")
      }),
      annotations: { readOnlyHint: true }
    },
    async ({ calendars = [] }) => {
      const now = new Date();
      const events = await fetchEvents(startOfMonth(now), endOfMonth(now), calendars);
      return toResult(events);
    }
  );
}
