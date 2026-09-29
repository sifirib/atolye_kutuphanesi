// Store only identifiers; labels and links always come from the current model.
export function readPins(value: string | null): Set<string> {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]")
    return new Set(Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string" && id.length > 0)
      : [])
  } catch {
    return new Set()
  }
}
