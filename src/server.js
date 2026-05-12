import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import pkg from "../package.json" with { type: "json" };
import { registerGetEventsByDateTool } from "./tools/getEventsByDate.js";
import { registerGetEventsThisWeekTool } from "./tools/getEventsThisWeek.js";
import { registerGetEventsThisMonthTool } from "./tools/getEventsThisMonth.js";
import { registerGetEventsInRangeTool } from "./tools/getEventsInRange.js";

export function createMcpApp() {
  const server = new McpServer({
    name: pkg.name,
    version: pkg.version
  });

  registerGetEventsByDateTool(server);
  registerGetEventsThisWeekTool(server);
  registerGetEventsThisMonthTool(server);
  registerGetEventsInRangeTool(server);

  return server;
}