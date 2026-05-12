#!/usr/bin/env swift

import EventKit
import Foundation

struct EventRecord: Encodable {
  let id: String
  let title: String
  let start: String
  let end: String
  let allDay: Bool
  let location: String?
  let notes: String?
  let calendar: String
}

struct CalendarRecord: Encodable {
  let id: String
  let title: String
  let source: String
  let type: String
  let allowsModifications: Bool
}

enum Command {
  case events(EventsArguments)
  case listCalendars
}

enum ScriptError: Error, CustomStringConvertible {
  case usage(String)
  case invalidDate(String)
  case accessDenied
  case invalidRange
  case calendarsNotFound([String])

  var description: String {
    switch self {
    case .usage(let message):
      return message
    case .invalidDate(let value):
      return "Invalid ISO8601 date: \(value)"
    case .accessDenied:
      return "Calendar access was denied"
    case .invalidRange:
      return "The end date must be greater than or equal to the start date"
    case .calendarsNotFound(let names):
      return "Unknown calendar name(s): \(names.joined(separator: ", "))"
    }
  }
}

struct EventsArguments {
  let start: Date
  let end: Date
  let calendarNames: [String]
}

let iso8601WithFractionalSeconds: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

let iso8601: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime]
  return formatter
}()

func usageText() -> String {
  """
  Usage:
    swift scripts/calendar-query.swift list-calendars
    swift scripts/calendar-query.swift events --start 2026-05-12T00:00:00Z --end 2026-05-12T23:59:59Z [--calendar "Work"]
  """
}

func parseCommand() throws -> Command {
  let arguments = Array(CommandLine.arguments.dropFirst())

  guard let subcommand = arguments.first else {
    throw ScriptError.usage(usageText())
  }

  switch subcommand {
  case "list-calendars":
    if arguments.count != 1 {
      throw ScriptError.usage(usageText())
    }
    return .listCalendars

  case "events":
    return .events(try parseEventsArguments(Array(arguments.dropFirst())))

  case "--help", "-h":
    throw ScriptError.usage(usageText())

  default:
    throw ScriptError.usage("Unknown command: \(subcommand)\n\n\(usageText())")
  }
}

func parseEventsArguments(_ arguments: [String]) throws -> EventsArguments {
  var start: Date?
  var end: Date?
  var calendarNames: [String] = []
  var index = 0

  while index < arguments.count {
    let argument = arguments[index]

    switch argument {
    case "--start":
      index += 1
      guard index < arguments.count else {
        throw ScriptError.usage("Missing value for --start")
      }
      start = try parseISO8601(arguments[index])

    case "--end":
      index += 1
      guard index < arguments.count else {
        throw ScriptError.usage("Missing value for --end")
      }
      end = try parseISO8601(arguments[index])

    case "--calendar":
      index += 1
      guard index < arguments.count else {
        throw ScriptError.usage("Missing value for --calendar")
      }
      calendarNames.append(arguments[index])

    case "--help", "-h":
      throw ScriptError.usage(usageText())

    default:
      throw ScriptError.usage("Unknown argument: \(argument)")
    }

    index += 1
  }

  guard let start, let end else {
    throw ScriptError.usage("Both --start and --end are required")
  }

  guard end >= start else {
    throw ScriptError.invalidRange
  }

  return EventsArguments(start: start, end: end, calendarNames: calendarNames)
}

func parseISO8601(_ value: String) throws -> Date {
  if let date = iso8601WithFractionalSeconds.date(from: value) {
    return date
  }

  if let date = iso8601.date(from: value) {
    return date
  }

  if let date = ISO8601DateFormatter().date(from: value) {
    return date
  }

  throw ScriptError.invalidDate(value)
}

func requestAccess(store: EKEventStore) throws {
  let semaphore = DispatchSemaphore(value: 0)
  var granted = false
  var capturedError: Error?

  if #available(macOS 14.0, *) {
    store.requestFullAccessToEvents { accessGranted, error in
      granted = accessGranted
      capturedError = error
      semaphore.signal()
    }
  } else {
    store.requestAccess(to: .event) { accessGranted, error in
      granted = accessGranted
      capturedError = error
      semaphore.signal()
    }
  }

  semaphore.wait()

  if let capturedError {
    throw capturedError
  }

  guard granted else {
    throw ScriptError.accessDenied
  }
}

func calendarTypeName(_ type: EKCalendarType) -> String {
  switch type {
  case .local:
    return "local"
  case .calDAV:
    return "caldav"
  case .exchange:
    return "exchange"
  case .subscription:
    return "subscription"
  case .birthday:
    return "birthday"
  @unknown default:
    return "unknown"
  }
}

func calendarRecords(store: EKEventStore) -> [CalendarRecord] {
  store.calendars(for: .event)
    .sorted { lhs, rhs in
      if lhs.title == rhs.title {
        return lhs.calendarIdentifier < rhs.calendarIdentifier
      }
      return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
    }
    .map { calendar in
      CalendarRecord(
        id: calendar.calendarIdentifier,
        title: calendar.title,
        source: calendar.source.title,
        type: calendarTypeName(calendar.type),
        allowsModifications: calendar.allowsContentModifications
      )
    }
}

func selectedCalendars(store: EKEventStore, names: [String]) throws -> [EKCalendar]? {
  let calendars = store.calendars(for: .event)

  guard !names.isEmpty else {
    return calendars
  }

  let requestedNames = Set(names)
  let selected = calendars.filter { requestedNames.contains($0.title) }
  let foundNames = Set(selected.map(\.title))
  let missingNames = requestedNames.subtracting(foundNames).sorted()

  if !missingNames.isEmpty {
    throw ScriptError.calendarsNotFound(missingNames)
  }

  return selected
}

func eventRecords(store: EKEventStore, arguments: EventsArguments) throws -> [EventRecord] {
  let calendars = try selectedCalendars(store: store, names: arguments.calendarNames)
  let predicate = store.predicateForEvents(
    withStart: arguments.start,
    end: arguments.end,
    calendars: calendars
  )

  return store.events(matching: predicate)
    .sorted { lhs, rhs in
      if lhs.startDate == rhs.startDate {
        return (lhs.title ?? "") < (rhs.title ?? "")
      }
      return lhs.startDate < rhs.startDate
    }
    .map { event in
      EventRecord(
        id: event.calendarItemIdentifier,
        title: event.title ?? "",
        start: iso8601WithFractionalSeconds.string(from: event.startDate),
        end: iso8601WithFractionalSeconds.string(from: event.endDate),
        allDay: event.isAllDay,
        location: event.location,
        notes: event.notes,
        calendar: event.calendar.title
      )
    }
}

do {
  let command = try parseCommand()
  let store = EKEventStore()

  try requestAccess(store: store)

  let encoder = JSONEncoder()
  encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

  let data: Data
  switch command {
  case .listCalendars:
    data = try encoder.encode(calendarRecords(store: store))
  case .events(let arguments):
    data = try encoder.encode(eventRecords(store: store, arguments: arguments))
  }

  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write(Data([0x0a]))
} catch let error as ScriptError {
  FileHandle.standardError.write(Data("Error: \(error.description)\n".utf8))
  exit(1)
} catch {
  FileHandle.standardError.write(Data("Error: \(error.localizedDescription)\n".utf8))
  exit(1)
}
