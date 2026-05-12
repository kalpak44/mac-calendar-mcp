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
        "- All events this week: {}",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true }
    },
    async () => {
      const now = new Date();
      const events = await fetchEvents(startOfWeek(now), endOfWeek(now));
      return toResult(events);
    }
  );
}