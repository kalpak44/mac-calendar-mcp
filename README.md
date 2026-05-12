# mac-calendar-mcp

Node.js MCP server for macOS Calendar, backed by a Swift EventKit helper.

## Purpose

This project is a local MCP server that allows AI assistants to read events from the native macOS Calendar app. It runs entirely on your machine using stdio transport. No data leaves the local system.

- List available calendars
- Get events for a specific date
- Get events for the current week
- Get events for the current month
- Get events within a custom date range
- Restrict event queries to specific calendars by name

## Requirements

- macOS with Calendar app configured
- Node.js 20+
- Swift 6+ available via the `swift` command
- Calendar access permission granted to the terminal or the MCP host application

macOS will prompt for Calendar access on first use. You can verify or revoke permissions in **System Settings → Privacy & Security → Calendars**.

## Install

Download and extract the latest release into `~/.mcp-servers`:

```bash
mkdir -p ~/.mcp-servers && \
curl -fL \
  -H "Cache-Control: no-cache" \
  https://github.com/kalpak44/mac-calendar-mcp/releases/latest/download/mac-calendar-mcp.zip \
  --output ~/.mcp-servers/mac-calendar-mcp.zip && \
rm -rf ~/.mcp-servers/mac-calendar-mcp && \
unzip -q ~/.mcp-servers/mac-calendar-mcp.zip -d ~/.mcp-servers && \
rm ~/.mcp-servers/mac-calendar-mcp.zip
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

## Available Tools

| Tool | Description |
|---|---|
| `list_calendars` | Returns all calendars available to the local Calendar app |
| `get_events_by_date` | Returns all events on a given date |
| `get_events_this_week` | Returns all events in the current calendar week |
| `get_events_this_month` | Returns all events in the current calendar month |
| `get_events_in_range` | Returns all events between a start and end date |

All event tools accept an optional `calendars` array with calendar names from `list_calendars`.

## Example Prompts

```text
What's on my calendar today?
```

```text
List my available calendars.
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

```text
Show me today's events only from my Work calendar.
```

## Privacy

All data is read locally via EventKit through a bundled Swift helper. No network requests are made. No credentials are required. Events are only passed to the MCP client that initiated the request.
