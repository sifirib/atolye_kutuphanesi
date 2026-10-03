export type Rect = { x: number; y: number; width: number; height: number }
export type Place =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "full"
export type Viewport = { width: number; height: number }
export function clampRect(rect: Rect, viewport: Viewport): Rect {
  const availableWidth = Math.max(1, viewport.width - 16)
  const availableHeight = Math.max(1, viewport.height - 16)
  const width = Math.min(Math.max(280, rect.width), availableWidth)
  const height = Math.min(Math.max(180, rect.height), availableHeight)
  return {
    width,
    height,
    x: Math.max(8, Math.min(rect.x, viewport.width - width - 8)),
    y: Math.max(8, Math.min(rect.y, viewport.height - height - 8)),
  }
}
export function placeRect(place: Place, viewport: Viewport): Rect {
  const halfWidth = (viewport.width - 24) / 2
  const halfHeight = (viewport.height - 24) / 2
  const horizontal = place.includes("left") || place.includes("right")
  const vertical = place.includes("top") || place.includes("bottom")
  return clampRect(
    {
      x: place.includes("right") ? halfWidth + 16 : 8,
      y: place.includes("bottom") ? halfHeight + 16 : 8,
      width: horizontal ? halfWidth : viewport.width - 16,
      height: vertical ? halfHeight : viewport.height - 16,
    },
    viewport,
  )
}
export function resizeRect(
  start: Rect,
  edge: string,
  dx: number,
  dy: number,
  viewport: Viewport,
): Rect {
  const minWidth = Math.max(1, Math.min(280, viewport.width - 16, start.width))
  const minHeight = Math.max(1, Math.min(180, viewport.height - 16, start.height))
  let { x, y, width, height } = start
  if (edge.includes("e"))
    width = Math.max(minWidth, Math.min(start.width + dx, viewport.width - x - 8))
  if (edge.includes("s"))
    height = Math.max(minHeight, Math.min(start.height + dy, viewport.height - y - 8))
  if (edge.includes("w")) {
    x = Math.max(8, Math.min(start.x + dx, start.x + start.width - minWidth))
    width = start.x + start.width - x
  }
  if (edge.includes("n")) {
    y = Math.max(8, Math.min(start.y + dy, start.y + start.height - minHeight))
    height = start.y + start.height - y
  }
  return { x, y, width, height }
}
