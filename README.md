# adeleka-ca

Adele Ka's personal magazine: a small static website, a folder of content, and a local editor.

- **The site** is plain HTML, CSS, and a little JavaScript, built by a short script (`build.js`).
- **The content** lives in `content/` as Markdown files.
- **Hosting** is free on GitHub Pages. Every push to `main` rebuilds and publishes the site.
- **Editing** works three ways: Pages CMS (online), `ka-cms` (on your computer), or any text editor.

New to this? Open the build guide first. It walks through every step.

## Commands

You need [Node.js](https://nodejs.org) (version 20 or newer) and [Git](https://git-scm.com).

```
npm install      # once: downloads the two small helpers
npm run dev      # build the site and preview it at http://localhost:8080 (rebuilds when you change files)
npm run build    # build the site into dist/
npm run cms      # open the local editor at http://localhost:4321
```

## What is where

```
content/            your words and data
  site.json           headline, about text, email, footer
  writing/*.md        one file per post
  projects/*.md       one file per project
  favourites/*.md     one file per list
  photos/*.md         one file per photo
static/             files copied as they are
  css/site.css        all the styling (colours and fonts at the top)
  js/site.js          floating plants, background switch, menu, filters, photo viewer
  img/                illustrations, logos, sketches
  uploads/            photos you upload
lib/                the code that turns content into pages
build.js            the build script
dev.js              the preview server
cms/                the local editor (ka-cms)
.pages.yml          settings for Pages CMS
.github/workflows/  the instructions GitHub follows to publish the site
docs/               your private notes (kept off GitHub by .gitignore)
```

## A post is just a file

```
---
title: "my first post"
topic: fun
date: 2026-10-12
readtime: 3 min read
dek: one line that sums it up
tint: lime
art_flowers: flower-zinnia-blue
art_garden: garden-corn
---

Write the post here, in Markdown.
```

Save it as `content/writing/my-first-post.md`, push, and it is on the site.

## Other notes
- All words on the site are lowercase except the name. That is a style choice, not a rule of the code.
- Set `url` in `content/site.json` to your real address (for example `https://adeleka.ca`) for a sitemap and share previews.
- Drafts: add `draft: true` to hide a file from the site. The file is still readable in the public GitHub repository, so keep private writing out of this folder until it is ready.
- The `docs/` folder is for your own notes. `.gitignore` keeps it on your computer, so it is never published. Back it up yourself (a cloud drive folder works).
