import type { Element, ElementContent, Root } from "hast"
import { visit } from "unist-util-visit"
import type { VFile } from "vfile"
import type { QuartzTransformerPlugin } from "../../types"
import style from "./quran.scss"
// @ts-ignore -- Quartz's inline-script loader imports this module as source text.
import script from "./quran.inline"

function element(
  tagName: string,
  properties: Element["properties"],
  children: ElementContent[] = [],
): Element {
  return { type: "element", tagName, properties, children }
}

const text = (value: string): ElementContent => ({ type: "text", value })

// Run after Obsidian's block-reference transformer. Mutate the existing block
// object so file.data.blocks and its original anchor continue to reference it.
export const Quran: QuartzTransformerPlugin = () => ({
  name: "Quran",
  htmlPlugins() {
    return [
      () => (tree: Root, file: VFile) => {
        if (file.data.frontmatter?.type !== "Kur'an-ı Kerim") return
        let firstList: Element | undefined
        visit(tree, "element", (list) => {
          if (list.tagName !== "ol") return
          let count = 0
          for (const item of list.children) {
            if (item.type !== "element" || item.tagName !== "li") continue
            // Loose Markdown lists wrap their contents in a paragraph; tight
            // lists put them directly in the li. Support both without guessing
            // at unrelated lists or moving an existing anchor to another node.
            const paragraphs = item.children.filter(
              (child): child is Element => child.type === "element" && child.tagName === "p",
            )
            const block = paragraphs.length === 1 ? paragraphs[0] : item
            const id = String(block.properties.id ?? "")
            if (!/^\d+$/.test(id)) continue
            const split = block.children.findIndex(
              (child) => child.type === "element" && child.tagName === "br",
            )
            if (split < 1 || split === block.children.length - 1) continue
            const arabic = block.children.slice(0, split)
            const translation = block.children.slice(split + 1)
            if (block !== item) block.tagName = "div"
            block.properties.className = [
              ...((block.properties.className as string[] | undefined) ?? []),
              "quran-verse",
            ]
            block.properties.dataQuranMode = "both"
            block.children = [
              element("div", { className: ["quran-verse-heading"] }, [
                element("span", { className: ["quran-number"], ariaLabel: `Ayet ${id}` }, [text(id)]),
                element("div", { className: ["quran-arabic"], lang: "ar", dir: "rtl" }, arabic),
                element("button", {
                  type: "button",
                  className: ["quran-toggle"],
                  ariaExpanded: "true",
                  ariaLabel: `${id}. ayetin mealini gizle`,
                  dataVerseNumber: id,
                  hidden: true,
                }, [
                  element("svg", {
                    viewBox: "0 0 24 24",
                    width: 14,
                    height: 14,
                    ariaHidden: "true",
                    focusable: "false",
                  }, [element("path", { d: "m9 5 7 7-7 7" })]),
                ]),
              ]),
              element("div", { className: ["quran-translation"], lang: "tr", dir: "ltr" }, translation),
            ]
            item.properties.className = [
              ...((item.properties.className as string[] | undefined) ?? []),
              "quran-item",
            ]
            count++
          }
          if (count > 0) {
            list.properties.className = [
              ...((list.properties.className as string[] | undefined) ?? []),
              "quran-verses",
            ]
            firstList ??= list
          }
        })
        if (!firstList) return
        const toolbar = element("div", {
          className: ["quran-toolbar"],
          role: "group",
          ariaLabel: "Okuma kontrolleri",
          dataQuranView: "both",
          hidden: true,
        }, [
          ...([
            ["arabic", "Orijinal", "Arapça metin"],
            ["translation", "Meal", "Türkçe meal"],
          ] as const).map(([mode, label, description]) =>
            element("button", {
              type: "button",
              dataQuranMode: mode,
              ariaPressed: "true",
              ariaLabel: description,
              title: description,
            }, [text(label)]),
          ),
          element("form", { className: ["quran-jump"], ariaLabel: "Sure ve ayete git", dataQuranSlug: file.data.slug, hidden: true }, [
            element("select", { ariaLabel: "Sure", disabled: true }, [
              element("option", { value: file.data.slug }, [text(`${file.data.frontmatter.sure} · ${file.data.frontmatter.isim ?? file.data.frontmatter.title}`)]),
            ]),
            element("input", {
              type: "text",
              inputMode: "numeric",
              pattern: "[0-9]+",
              required: true,
              autoComplete: "off",
              ariaLabel: "Ayet numarası",
              placeholder: "Ayet no.",
              maxLength: 3,
            }),
            element("button", { type: "submit", ariaLabel: "Yazılan ayete git" }, [text("Git")]),
          ]),
        ])
        visit(tree, "element", (node, index, parent) => {
          if (node === firstList && parent && index !== undefined) {
            parent.children.splice(index, 0, toolbar)
            return index + 2
          }
        })
      },
    ]
  },
  externalResources() {
    return {
      css: [{ content: style, inline: true }],
      js: [{ script, contentType: "inline", loadTime: "afterDOMReady", moduleType: "module", spaPreserve: true }],
    }
  },
})
