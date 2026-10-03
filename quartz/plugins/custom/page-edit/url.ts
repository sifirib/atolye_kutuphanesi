export type PageEditOptions = {
  repository: string
  branch: string
  contentDirectory: string
}

const encodeSegment = (segment: string) =>
  encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )

function pathSegments(path: string): string[] | undefined {
  const normalized = path.replace(/\\/g, "/")
  const segments = normalized.split("/")
  if (
    /^(?:\/|[a-z]:)|\0/i.test(normalized) ||
    segments.some((part) => !part || part === "." || part === "..")
  )
    return
  return segments
}

export function editUrl(relativePath: unknown, options: PageEditOptions): string | undefined {
  if (typeof relativePath !== "string" || !/\.md$/i.test(relativePath)) return
  const source = pathSegments(relativePath)
  const directory = pathSegments(options.contentDirectory)
  if (!source || !directory) return
  const path = [...directory, ...source].map(encodeSegment).join("/")
  return `https://github.com/${options.repository}/edit/${encodeSegment(options.branch)}/${path}`
}
