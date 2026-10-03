# Third-party notices

## Onon Sonin Sans

- Project typeface: `public/fonts/OnonSoninSans.ttf`
- Web format: `public/fonts/OnonSoninSans.woff2`
- Copyright: Typeface (C) iMit&Onon. 2017-2018. All Rights Reserved
- Preserved notice: `public/fonts/OnonSoninSans-NOTICE.txt`

## Noto Sans Mongolian

- Bundled file: `public/fonts/NotoSansMongolian-Regular.ttf`
- Version recorded in this source snapshot: 3.002
- Copyright 2022 The Noto Project Authors
- License: SIL Open Font License 1.1
- Complete required notice: `public/fonts/OFL.txt`
- Upstream release: https://github.com/notofonts/mongolian/releases/tag/NotoSansMongolian-v3.002

Distribute the font together with its bundled OFL notice.

## lunar-javascript

- Bundled file: `public/vendor/lunar-1.7.7.js`
- Version: 1.7.7
- Copyright (c) 2018 6tail
- License: MIT
- Complete required notice: `public/vendor/lunar-1.7.7-LICENSE.txt`
- Upstream project: https://github.com/6tail/lunar-javascript
- SHA-256: `9750324bfe1aa63c146f8c72b1143df924466c11c8a5277d7d9225c541a18aaa`

The included almanac-core regression test verifies the pinned file hash and presence of the MIT notice.

## Referenced texts and historical sources

Article and graph data retain source URLs and attribution fields for evidence and further reading. Reuse of external works follows the rights specified by their respective providers.

## Project code and editorial material

Original website code and editorial content carry the `UNLICENSED` package identifier. Permissions for that material are determined by the rights holder. The component licenses above apply to their respective bundled files.

## React web interface

The interface bundles these pinned npm packages and their dependencies during `npm run build`:

- React and React DOM 19.3.0 — MIT.
- React Aria Components 1.21.1 — Apache-2.0.
- Motion 14.0.0 — MIT.
- Lucide React 1.51.0 — ISC.
- D3 Force 3.0.0 — ISC; the D3 dependency notices are also retained in `tests/fixtures/legacy/vendor/d3-LICENSE.txt`.

The generated `public/assets/THIRD_PARTY_LICENSES.txt` collects the license files for packages included in the browser bundle. esbuild also preserves bundled legal comments in `nutug.js.LEGAL.txt`.

Apple's iOS/iPadOS 27 Figma resource is used as a component and design-token reference. The source component nodes are recorded in `src/apple-reference.json`. Web icons come from Lucide and the Mongolian typeface remains Onon Sonin Sans.
