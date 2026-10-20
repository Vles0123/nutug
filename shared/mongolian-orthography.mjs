export const spellingRegistry = Object.freeze(
  [
    {
      canonical: 'ᠪᠠᠶᠢᠷᠢ',
      display: 'ᠪᠠᠶ᠋ᠢᠷᠢ',
      classification: 'user-requested-display-preference',
      canonicalSource: 'https://mongoltoli.mn/dictionary/detail/10701',
      evidence: 'User-requested first-hook removal, verified with offline Noto shaping',
    },
    {
      canonical: 'ᠪᠠᠶᠢᠳᠠᠯ',
      display: 'ᠪᠠᠶ᠋ᠢᠳᠠᠯ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
    {
      canonical: 'ᠪᠠᠶᠢᠳᠠᠯᠲᠠᠢ',
      display: 'ᠪᠠᠶ᠋ᠢᠳᠠᠯᠲᠠᠢ',
      source: 'https://mng.nema.gov.mn/post/151310',
      scope: 'Previously audited stem plus suffix',
    },
    {
      canonical: 'ᠠᠵᠠᠪᠠᠶᠢᠳᠠᠯ',
      display: 'ᠠᠵᠠᠪᠠᠶ᠋ᠢᠳᠠᠯ',
      source: 'https://mng.nema.gov.mn/post/151310',
      scope: 'Previously audited compound',
    },
    {
      canonical: 'ᠠᠶᠢᠮᠠᠭ',
      display: 'ᠠᠶ᠋ᠢᠮᠠᠭ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
    {
      canonical: 'ᠨᠡᠶᠢᠲᠡ',
      display: 'ᠨᠡᠶ᠋ᠢᠲᠡ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
    {
      canonical: 'ᠪᠠᠶᠢᠨ᠎ᠠ',
      display: 'ᠪᠠᠶ᠋ᠢᠨ᠎ᠠ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
    {
      canonical: 'ᠪᠠᠶᠢᠭ᠎ᠠ',
      display: 'ᠪᠠᠶ᠋ᠢᠭ᠎ᠠ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
    {
      canonical: 'ᠪᠠᠶᠢᠭᠰᠠᠨ',
      display: 'ᠪᠠᠶ᠋ᠢᠭᠰᠠᠨ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
    {
      canonical: 'ᠲᠡᠶᠢᠮᠦ',
      display: 'ᠲᠡᠶ᠋ᠢᠮᠦ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
    {
      canonical: 'ᠲᠣᠳᠣᠷᠬᠠᠶᠢᠯᠠᠭᠳᠠᠭᠰᠠᠨ',
      display: 'ᠲᠣᠳᠣᠷᠬᠠᠶ᠋ᠢᠯᠠᠭᠳᠠᠭᠰᠠᠨ',
      source: 'https://mng.nema.gov.mn/post/151310',
    },
  ].map(Object.freeze),
);
const displays = new Map(spellingRegistry.map((row) => [row.canonical, row.display]));
const originals = new Map(spellingRegistry.map((row) => [row.display, row.canonical]));
const words = /[\u034F\u180B-\u180F\u1820-\u18AA\u200C\u200D]+/g;
export const displayMongolian = (value) =>
  String(value).replace(words, (word) => displays.get(word) || word);
export const normalizeMongolian = (value) =>
  String(value).replace(words, (word) => originals.get(word) || word);
