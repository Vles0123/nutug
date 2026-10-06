# Nutug content feed

This branch publishes the versioned JSON content used by Nutug clients.

- `manifest.json`: current revision, checksums and entry points.
- `objects/<sha256>.json`: immutable content objects and individual articles.
- `revisions/<revision>/catalog/<page>.json`: eight-entry directory pages for constrained devices.

Texts use UTF-8 traditional Mongolian. Display text retains Mongolian variation selectors and narrow no-break spaces. Interface code is developed separately on `feat/reading-experience`.
