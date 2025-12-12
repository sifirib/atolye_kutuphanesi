---
title: Obsidian Compatibility
tags:
  - feature_transformer
---

Quartz was originally designed as a tool to publish Obsidian vaults as websites. Even as the scope of Quartz has widened over time, it hasn't lost the ability to seamlessly interoperate with Obsidian.

By default, Quartz ships with the [[ObsidianFlavoredMarkdown|ObsidianFlavoredMarkdown]] plugin, which is a transformer plugin that adds support for [Obsidian Flavored Markdown](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown). This includes support for features like [[wikilinks|wikilinks]] and [[Mermaid diagrams|Mermaid diagrams]].

It also ships with support for [frontmatter parsing](https://help.obsidian.md/Editing+and+formatting/Properties) with the same fields that Obsidian uses through the [[Frontmatter|Frontmatter]] transformer plugin.

Finally, Quartz also provides [[CrawlLinks|CrawlLinks]] plugin, which allows you to customize Quartz's link resolution behaviour to match Obsidian.

## Configuration

This functionality is provided by the [[ObsidianFlavoredMarkdown|ObsidianFlavoredMarkdown]], [[Frontmatter|Frontmatter]] and [[CrawlLinks|CrawlLinks]] plugins. See the plugin pages for customization options.
