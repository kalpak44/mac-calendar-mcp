import * as z from "zod/v4";
import { fetchEvents, startOfDay, endOfDay, toResult } from "../calendar.js";

export function registerGetEventsByDateTool(server) {
  server.registerTool(
    "get_events_by_date",
    {
      title: "Get Events by Date",
      description:
        "Returns all calendar events on a specific date.\n\n" +
        "Examples:\n" +
        '- Events today: { "date": "2026-05-12" }\n' +
        '- Events on a specific day: { "date": "2026-06-01" }',
      inputSchema: z.object({
        date: z.string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Date in YYYY-MM-DD format")
      }),
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async ({ date }) => {
      const d = new Date(`${date}T00:00:00`);
      const events = await fetchEvents(startOfDay(d), endOfDay(d));
      return toResult(events);
    }
  );
}