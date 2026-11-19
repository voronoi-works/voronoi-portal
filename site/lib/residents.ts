// Visual-only Candidate placements. These are not actual agent/worldline history.
// Residents have no ownerArea/channel binding; multiple people can share a place.
export const residents = [
  { id: 'yura', name: 'ユラ', sprite: 0 },
  { id: 'sumi', name: 'スミ', sprite: 1 },
  { id: 'nagi', name: 'ナギ', sprite: 2 },
  { id: 'shiori', name: 'シオリ', sprite: 3 },
] as const;
export type ResidentId = (typeof residents)[number]['id'];
type Placement = { id: ResidentId; x: number; y: number; spot: string };
export const placementHistory: readonly {
  date: string;
  placements: readonly Placement[];
}[] = [
  {
    date: '2026-08-25',
    placements: [
      { id: 'yura', x: 27, y: 40.8, spot: '回廊' },
      { id: 'sumi', x: 54.6, y: 58.1, spot: '回廊' },
      { id: 'nagi', x: 29.7, y: 74.2, spot: 'デッキ' },
      { id: 'shiori', x: 69, y: 76.5, spot: 'デッキ' },
    ],
  },
  {
    date: '2026-09-01',
    placements: [
      { id: 'yura', x: 54.6, y: 58.1, spot: '回廊' },
      { id: 'sumi', x: 27, y: 40.8, spot: '回廊' },
      { id: 'nagi', x: 69, y: 76.5, spot: 'デッキ' },
      { id: 'shiori', x: 29.7, y: 74.2, spot: 'デッキ' },
    ],
  },
  {
    date: '2026-09-07',
    placements: [
      { id: 'yura', x: 29.7, y: 74.2, spot: 'デッキ' },
      { id: 'sumi', x: 54.6, y: 58.1, spot: '回廊' },
      { id: 'nagi', x: 69, y: 76.5, spot: 'デッキ' },
      { id: 'shiori', x: 27, y: 40.8, spot: '回廊' },
    ],
  },
];
export function residentsAt(date: string) {
  const snapshot = [...placementHistory]
    .reverse()
    .find((item) => item.date <= date);
  return (snapshot?.placements ?? []).map((placement) => ({
    ...residents.find((person) => person.id === placement.id)!,
    ...placement,
  }));
}

// A separate illustration slot allows later starter/grown art without altering residents.
export const islandScene = {
  stage: 'compound',
  residentsReady: true,
  image: '/island-compound-v1.png',
  imageSet:
    '/island-compound-640.webp 640w, /island-compound-1024.webp 1024w, /island-compound-1672.webp 1672w',
  imageSizes:
    '(max-width: 640px) calc(100vw - 36px), (max-width: 1000px) calc(100vw - 64px), (max-width: 1424px) calc(100vw - 104px), 1320px',
  width: 1672,
  height: 941,
} as const;
