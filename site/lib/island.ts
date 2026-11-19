import activityArchive from '../data/activities.json' with { type: 'json' };

export type AreaDefinition = {
  id: string;
  links?: readonly { name: string; url: string }[];
  planned?: boolean;
  mapMarker?: boolean;
  summary?: string;
  availabilityLabel?: string;
  name: string;
  place: string;
  color: string;
  x: number;
  y: number;
  kind: 'publishing' | 'game' | 'app';
  icon: 'book' | 'message' | 'leaf' | 'film' | 'game' | 'app' | 'tools';
};
export const navigationDate = '2026-11-11';
// Adding ATL/picopl later means adding activity places here, not adding residents.
export const channels: readonly AreaDefinition[] = [
  {
    id: 'blog',
    links: [
      { name: 'Ghost in the Voronoi', url: 'https://ghost.voronoi.works/' },
    ],
    name: 'ghost',
    place: '観測とことばの書庫',
    summary: 'AIと人、存在や生命について考える。',
    availabilityLabel: '記事を読む',
    color: '#475d53',
    x: 14,
    y: 19,
    kind: 'publishing',
    icon: 'book',
  },
  {
    id: 'make',
    links: [{ name: 'build', url: 'https://build.voronoi.works/' }],
    name: 'build',
    place: 'つぎはぎの作業場',
    summary: '動画・画像・音楽・3Dを作る。作り方と環境、かかった時間を残す。',
    availabilityLabel: '作例を見る',
    color: '#8a4534',
    x: 71,
    y: 17,
    kind: 'publishing',
    icon: 'tools',
  },
  {
    id: 'note',
    links: [{ name: 'note', url: 'https://note.com/voronoi_works' }],
    name: 'note',
    place: '余白の読書室',
    summary: '仕事や制作で起きたことを、まとまった読み物に。',
    availabilityLabel: '記事を読む',
    color: '#475d53',
    x: 18,
    y: 55,
    kind: 'publishing',
    icon: 'leaf',
  },
  {
    id: 'youtube',
    links: [
      {
        name: 'Passing Hours｜夜行列車の本編',
        url: 'https://youtu.be/OzaW9Rc9LlE',
      },
      { name: 'Voronoi Radio｜Ep.1', url: 'https://youtu.be/wf2H5HcTPXE' },
    ],
    name: 'YouTube',
    place: '水辺の映写場',
    summary: 'Passing Hoursの居場所とBGM、Voronoi Worksの語りを映像で。',
    availabilityLabel: '動画を見る',
    color: '#8a4534',
    x: 87,
    y: 52,
    kind: 'publishing',
    icon: 'film',
  },
  {
    id: 'sns',
    mapMarker: false,
    links: [
      { name: 'X', url: 'https://x.com/voronoi_logs' },
      { name: 'Threads', url: 'https://www.threads.com/@voronoi_views' },
    ],
    name: 'X・Threads',
    place: 'ひとことの広場',
    summary: '日々の制作や気づきから、noteの読み物へ。',
    color: '#916b35',
    x: 0,
    y: 0,
    kind: 'publishing',
    icon: 'message',
  },
  {
    id: 'instagram',
    mapMarker: false,
    links: [
      { name: 'Instagram', url: 'https://www.instagram.com/voronoi_views/' },
    ],
    name: 'Instagram',
    place: '映像の入口',
    summary: '短い映像で場所と音を見せ、YouTubeの本編へ。',
    color: '#965d47',
    x: 0,
    y: 0,
    kind: 'publishing',
    icon: 'film',
  },
];
export const mediaRoutes = [
  {
    id: 'reading',
    from: 'sns',
    to: 'note',
    description: '日々の制作や気づきから、読み物へ。',
  },
  {
    id: 'watching',
    from: 'instagram',
    to: 'youtube',
    description: '場所と音の短い映像から、本編へ。',
  },
] as const;
export type ChannelId = AreaDefinition['id'];
export type Activity = {
  id: string;
  date: string;
  channel: ChannelId;
  kind: 'opened' | 'published';
  title: string;
  description?: string;
  dateBasis?: 'published' | 'firstSeen';
  url: string | null;
};
// Existing records and append-only public-feed updates. See ACTIVITY_SOURCES.md.
export const activities = activityArchive.activities as Activity[];
export const firstDate = activities.reduce((earliest, event) => event.date < earliest ? event.date : earliest, activities[0].date);
export const lastDate = activities.reduce((latest, event) => event.date > latest ? event.date : latest, firstDate);
export const dates = Array.from(
  {
    length:
      Math.round((Date.parse(lastDate) - Date.parse(firstDate)) / 86400000) + 1,
  },
  (_, i) =>
    new Date(Date.parse(firstDate) + i * 86400000).toISOString().slice(0, 10),
);
export function dateLabel(date: string) {
  return date.replaceAll('-', '.');
}
export function shortDate(date: string) {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;
}
export const historyRangeLabel = `${firstDate.slice(0, 4)}.${shortDate(firstDate)}–${shortDate(lastDate)}`;
export function islandAt(
  date: string,
  events: readonly Activity[] = activities,
  areas: readonly AreaDefinition[] = channels,
) {
  const visible = events
    .filter((event) => event.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return {
    date,
    events: visible,
    today: visible.filter((event) => event.date === date),
    areas: areas.map((channel) => {
      const records = visible.filter((event) => event.channel === channel.id);
      const opened = records.find((event) => event.kind === 'opened');
      const posts = records.filter((event) => event.kind === 'published');
      const recent = posts.some(
        (event) => Date.parse(date) - Date.parse(event.date) <= 2 * 86400000,
      );
      return {
        ...channel,
        opened: Boolean(opened) || posts.length > 0,
        statusLabel: channel.planned
          ? '準備中'
          : opened || posts.length
            ? '活動の記録あり'
            : 'この日までの記録なし',
        openedAt: opened?.date ?? null,
        posts,
        records,
        recent,
        latest: posts[0] ?? null,
      };
    }),
  };
}
export function safeSourceUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
