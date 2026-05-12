import * as z from "zod/v4";
import { fetchEvents, startOfDay, endOfDay, toResult } from "../calendar.js";

export function registerGetEventsInRangeTool(server) {
  server.registerTool(
    "get_events_in_range",
    {
      title: "Get Events in Range",
      description:
        "Returns all calendar events between a start and end date (inclusive).\n\n" +
        "Examples:\n" +
        '- Events over a long weekend: { "start": "2026-05-23", "end": "2026-05-25" }\n' +
        '- Events for a sprint: { "start": "2026-05-12", "end": "2026-05-25" }',
      inputSchema: z.object({
        start: z.string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Start date in YYYY-MM-DD format"),
        end: z.string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("End date in YYYY-MM-DD format"),
        calendars: z.array(z.string().min(1))
          .optional()
          .describe("Optional list of calendar names to search")
      }),
      annotations: { readOnlyHint: true, idempotentHint: true }
    },
    async ({ start, end, calendars = [] }) => {
      const startDate = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      const events = await fetchEvents(startOfDay(startDate), endOfDay(endDate), calendars);
      return toResult(events);
    }
  );
}
