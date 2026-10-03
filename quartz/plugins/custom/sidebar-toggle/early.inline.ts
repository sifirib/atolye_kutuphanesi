try {
  document.documentElement.dataset.leftSidebar =
    localStorage.getItem("library:left-sidebar") === "closed" ? "closed" : "open"
} catch {
  document.documentElement.dataset.leftSidebar = "open"
}
export {}
