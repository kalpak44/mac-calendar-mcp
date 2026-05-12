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
        "- All events this month: {}",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true }
    },
    async () => {
      const now = new Date();
      const events = await fetchEvents(startOfMonth(now), endOfMonth(now));
      return toResult(events);
    }
  );
}