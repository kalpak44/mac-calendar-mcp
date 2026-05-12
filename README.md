# mac-calendar-mcp

JavaScript-based MCP server for macOS Calendar.

## Purpose

This project is a local MCP server that allows AI assistants to read events from the native macOS Calendar app. It runs entirely on your machine using stdio transport. No data leaves the local system.

- Get events for a specific date
- Get events for the current week
- Get events for the current month
- Get events within a custom date range

## Requirements

- macOS with Calendar app configured
- Node.js 20+
- Calendar access permission granted to the terminal or the MCP host application

macOS will prompt for Calendar access on first use. You can verify or revoke permissions in **System Settings → Privacy & Security → Calendars**.

## Install

Download the latest release into `~/.mcp-servers/mac-calendar-mcp`:

```bash
mkdir -p ~/.mcp-servers/mac-calendar-mcp && \
  curl -fsSL https://github.com/kalpak44/mac-calendar-mcp/releases/latest/download/index.js \
    -o ~/.mcp-servers/mac-calendar-mcp/index.js
```

## Add To Claude Code

```bash
claude mcp add mac-calendar-mcp \
  --transport stdio \
  -- node ~/.mcp-servers/mac-calendar-mcp/index.js
```

Remove it from Claude Code:

```bash
claude mcp remove mac-calendar-mcp
```

## Add To Codex

```bash
codex mcp add mac-calendar-mcp \
  --command "node ~/.mcp-servers/mac-calendar-mcp/index.js"
```

Remove it from Codex:

```bash
codex mcp remove mac-calendar-mcp
```

## Configuration (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "mac-calendar-mcp": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/.mcp-servers/mac-calendar-mcp/index.js"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|---|---|
| `get_events_by_date` | Returns all events on a given date |
| `get_events_this_week` | Returns all events in the current calendar week |
| `get_events_this_month` | Returns all events in the current calendar month |
| `get_events_in_range` | Returns all events between a start and end date |

## Example Prompts

```text
What's on my calendar today?
```

```text
Do I have anything scheduled this week?
```

```text
Show me all my events for May 2026.
```

```text
What meetings do I have between May 15 and May 20?
```

## Privacy

All data is read locally via AppleScript. No network requests are made. No credentials are required. Events are only passed to the MCP client that initiated the request.