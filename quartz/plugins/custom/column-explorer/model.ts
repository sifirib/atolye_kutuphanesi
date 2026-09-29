export interface ExplorerEntry {
  slug?: string
  title: string
  filePath?: string
}

export interface ExplorerNode {
  id: string
  name: string
  folder: boolean
  parent: string | null
  children: ExplorerNode[]
}

export interface ExplorerModel {
  root: ExplorerNode
  nodes: Map<string, ExplorerNode>
}

export function canSearchFolder(folder: ExplorerNode): boolean {
  return folder.children.length > 1 || folder.children.some((child) => child.folder)
}

// The model already holds Turkish alphabetical order. Sort a copy so search
// and other views sharing the model keep their own ordering.
export function sortSurahs(children: ExplorerNode[], numbers: Record<string, number>): ExplorerNode[] {
  return [...children].sort((a, b) =>
    Number(b.folder) - Number(a.folder)
    || (numbers[a.id] ?? Number.MAX_SAFE_INTEGER) - (numbers[b.id] ?? Number.MAX_SAFE_INTEGER),
  )
}

export function buildExplorerModel(index: Record<string, ExplorerEntry>): ExplorerModel {
  const root: ExplorerNode = {
    id: "", name: "Raflar", folder: true, parent: null, children: [],
  }
  const nodes = new Map<string, ExplorerNode>([["", root]])

  for (const [key, entry] of Object.entries(index)) {
    const parts = (entry.slug ?? key).split("/").filter(Boolean)
    if (parts[0] === "tags") continue
    const folderIndex = parts.at(-1) === "index"
    if (folderIndex) parts.pop()
    const names = (entry.filePath ?? "").replace(/\\/g, "/").split("/")
    let parent = root
    for (let i = 0; i < parts.length; i++) {
      const id = parts.slice(0, i + 1).join("/")
      const folder = i < parts.length - 1 || folderIndex
      let node = nodes.get(id)
      if (!node) {
        node = {
          id,
          name: folder ? (names[i] || parts[i]) : entry.title || parts[i],
          folder,
          parent: parent.id,
          children: [],
        }
        nodes.set(id, node)
        parent.children.push(node)
      }
      // A folder's index and its descendants can arrive in either order.
      if (folder) node.folder = true
      parent = node
    }
  }

  const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" })
  for (const node of nodes.values()) {
    node.children.sort((a, b) =>
      Number(b.folder) - Number(a.folder) || collator.compare(a.name, b.name) || a.id.localeCompare(b.id),
    )
  }
  return { root, nodes }
}

export function folderPath(model: ExplorerModel, id: string): string[] {
  const result: string[] = []
  let node = model.nodes.get(id.replace(/(^|\/)index$/, ""))
  if (node && !node.folder) node = model.nodes.get(node.parent ?? "")
  while (node && node.parent !== null) {
    result.unshift(node.id)
    node = model.nodes.get(node.parent)
  }
  return result
}
