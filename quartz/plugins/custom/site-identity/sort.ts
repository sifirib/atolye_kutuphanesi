type Entry = { slug?: string; frontmatter?: { title?: string }; isFolder?: boolean }
const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" })
export function librarySort(a: Entry, b: Entry): number {
  const folder = (entry: Entry) => entry.isFolder === true || entry.slug?.endsWith("/index") === true
  return Number(folder(b)) - Number(folder(a)) || collator.compare(a.frontmatter?.title ?? a.slug ?? "", b.frontmatter?.title ?? b.slug ?? "")
}
