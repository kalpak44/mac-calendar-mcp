import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpApp } from "./server.js";

const server = createMcpApp();
const transport = new StdioServerTransport();
await server.connect(transport);