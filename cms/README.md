# ka-cms

A small content editor that runs on your own computer.

```
npm install      (once)
npm run cms
```

Then open http://localhost:4321.

What it does
- Edits the Markdown files in `content/` through forms (writing, projects, favourite lists, photos, site settings).
- Uploads photos into `static/uploads/` and shrinks big ones to 1600 pixels first.
- "build preview" builds the whole site and opens it, so you see exactly what visitors will see.
- "publish to GitHub" runs: add, commit, pull, push. GitHub then rebuilds the live site.

What it is not
- It is not online. It only works while it is running on your computer.
- It never stores passwords. Publishing uses whatever GitHub sign-in your computer already has (GitHub Desktop, `gh auth login`, or the macOS/Windows keychain).

Safety notes (worth understanding, it is how you build local tools responsibly)
- The server only listens on 127.0.0.1, so nobody else on your network can reach it.
- It only answers requests addressed to `localhost:4321` (this blocks "DNS rebinding").
- Every request that changes something must carry the header `X-KA-CMS: 1`. Other websites cannot send it, so they cannot trigger a save or a publish.
- File names are cleaned to letters, numbers, and dashes, and only known content types can be written, so a request cannot write outside `content/` or `static/uploads/`.

Where to go next: the build-it-yourself roadmap is in your private notes (`docs/`, kept on your computer).
