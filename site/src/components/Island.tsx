'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Map,
  X,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover';
import {
  channels,
  mediaRoutes,
  navigationDate,
  dates,
  dateLabel,
  shortDate,
  historyRangeLabel,
  islandAt,
  safeSourceUrl,
  type Activity,
  type ChannelId,
} from '@/lib/island';
import { useIslandTools } from '@/lib/use-island-tools';
import { residentsAt, residents, islandScene } from '@/lib/residents';

const destinations = channels.filter((area) => area.mapMarker !== false);
function EventRecord({
  event,
  onVisit,
}: {
  event: Activity;
  onVisit?: () => void;
}) {
  const channel = channels.find((item) => item.id === event.channel)!;
  const source = safeSourceUrl(event.url);
  return (
    <article className="event-record">
      <div className="event-meta">
        <span>{channel.name}</span>
        <time dateTime={event.date}>{dateLabel(event.date)}{event.dateBasis === 'firstSeen' ? ' 掲載確認' : ''}</time>
      </div>
      <h3>{event.title}</h3>
      {event.description && (
        <p>{event.description.replace('個別投稿URLは未取得。', '')}</p>
      )}
      <div className="event-actions">
        {source ? (
          <a
            className="text-link"
            href={source}
            target="_blank"
            rel="noopener noreferrer"
          >
            {channel.availabilityLabel ?? '投稿を見る'}
            <ArrowUpRight size={15} />
          </a>
        ) : (
          <span className="sample-record">個別投稿URLは未取得</span>
        )}
        {onVisit && (
          <button className="text-link" onClick={onVisit}>
            この日の島へ
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </article>
  );
}
export default function Island({ publicBuild = false }: { publicBuild?: boolean }) {
  const [day, setDay] = useState(dates.length - 1);
  const [view, setView] = useState('island');
  const [selected, setSelected] = useState<ChannelId | null>(null);
  const [filter, setFilter] = useState('all');
  const [found, setFound] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  useIslandTools(day, setDay, setView);
  const date = dates[day];
  const state = useMemo(() => islandAt(date), [date]);
  const people = residentsAt(date);
  const current = day === dates.length - 1;
  const selectedArea = state.areas.find((area) => area.id === selected);
  const log = state.events.filter(
    (event) => filter === 'all' || event.channel === filter,
  );
  const goTo = (next: number) =>
    setDay(Math.max(0, Math.min(dates.length - 1, next)));
  const reset = () => {
    goTo(dates.length - 1);
    setView('island');
  };
  const visit = (event: Activity) => {
    goTo(dates.indexOf(event.date));
    setView('island');
    setSelected(null);
  };
  return (
    <div className="site-shell">
      <a className="skip-link" href="#island-content">
        本文へ移動
      </a>
      <header className="site-header">
        <button
          className="wordmark"
          onClick={reset}
          aria-label="Voronoi Works 島のいまへ"
        >
          voronoi<span>.</span>works
        </button>
        <nav className="header-nav" aria-label="活動の入口">
          {destinations.map((area) => (
            <button key={area.id} onClick={() => setSelected(area.id)}>
              {area.name}
              <ArrowUpRight size={12} />
            </button>
          ))}
        </nav>
        {!publicBuild && <span className="preview-badge">ローカル試作</span>}
      </header>
      <main id="island-content">
        <Tabs
          value={view}
          onValueChange={(value) => setView(String(value))}
          className="site-tabs"
        >
          <div className="view-header">
            <h1>
              {view === 'history' ? (
                '島に残った便り。'
              ) : current ? (
                <>
                  考える、造る、
                  <br />
                  書く、映す。
                </>
              ) : (
                'あの日の便り。'
              )}
            </h1>
            <TabsList variant="line" className="view-tabs">
              <TabsTrigger value="island">
                <Map size={16} />
                島を眺める
              </TabsTrigger>
              <TabsTrigger value="history">
                <History size={16} />
                履歴をたどる
              </TabsTrigger>
            </TabsList>
          </div>
          {(view === 'history' || !current) && (
            <section className="time-section" aria-label="便りの日付を移動">
              <div className="time-heading">
                <time dateTime={date}>{dateLabel(date)}</time>
                <p>{historyRangeLabel}の活動から抜粋</p>
                <span className="time-position">
                  {day + 1} / {dates.length}
                </span>
              </div>
              <div className="timeline-control">
                <button
                  className="round-control"
                  disabled={day === 0}
                  onClick={() => goTo(day - 1)}
                  aria-label="1日前へ"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="slider-wrap">
                  <Slider
                    value={[day]}
                    min={0}
                    max={dates.length - 1}
                    step={1}
                    onValueChange={(value) =>
                      goTo(Array.isArray(value) ? value[0] : value)
                    }
                    aria-label="表示する日付"
                    aria-valuetext={dateLabel(date)}
                  />
                  <div className="timeline-labels">
                    <span>{shortDate(dates[0])}</span>
                    <span>{shortDate(dates.at(-1)!)}</span>
                  </div>
                </div>
                <button
                  className="round-control"
                  disabled={current}
                  onClick={() => goTo(day + 1)}
                  aria-label="1日後へ"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              {!current && (
                <div className="past-note">
                  <span aria-live="polite">
                    {state.today[0]?.title ??
                      'この日の新しい記録はありません。'}
                  </span>
                  <button className="text-link" onClick={reset}>
                    今の入口に戻る
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </section>
          )}
          <TabsContent value="island" className="island-view">
            <section
              className="landscape-section"
              aria-label="ghost・build・note・YouTubeのある制作拠点"
            >
              <div
                className={`landscape ${!current ? 'landscape-past' : ''} ${hint ? 'show-hints' : ''}`}
              >
                <picture className="island-picture">
                  <source
                    type="image/webp"
                    srcSet={islandScene.imageSet}
                    sizes={islandScene.imageSizes}
                  />
                  <img
                    className="island-art"
                    src={islandScene.image}
                    width={islandScene.width}
                    height={islandScene.height}
                    alt="黒い水面に点在するつぎはぎの制作拠点。配管のある書庫、道具の並ぶ作業場、読書室と屋外の映写場が橋でつながっている。"
                    fetchPriority="high"
                  />
                </picture>
                {state.areas
                  .filter((area) => area.mapMarker !== false)
                  .map((area) => (
                    <button
                      key={area.id}
                      className={`area-marker marker-${area.id} ${area.planned ? 'is-waiting' : ''}`}
                      style={
                        {
                          left: `${area.x}%`,
                          top: `${area.y}%`,
                          '--area-color': area.color,
                        } as CSSProperties
                      }
                      onClick={() => setSelected(area.id)}
                      aria-label={`${area.name}の詳細を見る${area.planned ? '・公開準備中' : ''}`}
                    >
                      <span className="marker-caption">
                        {area.name}
                        <ArrowUpRight size={14} />
                      </span>
                      <span className="marker-stem" aria-hidden="true" />
                    </button>
                  ))}
                {islandScene.residentsReady &&
                  people.map((person) => (
                    <Popover
                      key={person.id}
                      onOpenChange={(open) => {
                        if (open)
                          setFound((prev) =>
                            prev.includes(person.id)
                              ? prev
                              : [...prev, person.id],
                          );
                      }}
                    >
                      <span
                        className={`resident-anchor ${found.includes(person.id) ? 'is-found' : ''}`}
                        style={{ left: `${person.x}%`, top: `${person.y}%` }}
                      >
                        <span className="resident-sprite" aria-hidden="true">
                          <img
                            src="/residents-sheet-384.webp"
                            alt=""
                            draggable={false}
                            style={{ left: `${person.sprite * -100}%` }}
                          />
                        </span>
                        <PopoverTrigger
                          className="resident-hotspot"
                          aria-label={`${person.name}を見つける`}
                        >
                          <span className="resident-hint" aria-hidden="true">
                            {found.includes(person.id) ? (
                              <Check size={12} />
                            ) : (
                              <span />
                            )}
                          </span>
                        </PopoverTrigger>
                      </span>
                      <PopoverContent className="resident-popover" side="top">
                        <PopoverTitle>{person.name}、みつけた。</PopoverTitle>
                        <PopoverDescription>
                          島のどこかでひと休み。
                          <br />
                          住人の配置は演出です。
                        </PopoverDescription>
                      </PopoverContent>
                    </Popover>
                  ))}
              </div>
              <div className="landscape-caption">
                <span>建物を選ぶと、それぞれの活動へ。</span>
                <button
                  onClick={() => setHint((value) => !value)}
                  aria-pressed={hint}
                  aria-expanded={hint}
                  aria-controls="resident-picker"
                >
                  {hint ? '一覧を閉じる' : '住人を探す'}
                  <span>
                    {found.length} / {residents.length}
                  </span>
                </button>
              </div>
              <div
                id="resident-picker"
                className="resident-picker"
                hidden={!hint}
                aria-label="住人を選ぶ"
              >
                {people.map((person) => (
                  <Popover
                    key={person.id}
                    onOpenChange={(open) => {
                      if (open)
                        setFound((prev) =>
                          prev.includes(person.id)
                            ? prev
                            : [...prev, person.id],
                        );
                    }}
                  >
                    <PopoverTrigger
                      className="resident-choice"
                      aria-label={`${person.name}を選ぶ${found.includes(person.id) ? '・発見済み' : ''}`}
                    >
                      {person.name}
                      {found.includes(person.id) && (
                        <Check size={10} aria-hidden="true" />
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="resident-popover" side="top">
                      <PopoverTitle>{person.name}、みつけた。</PopoverTitle>
                      <PopoverDescription>
                        島のどこかでひと休み。
                        <br />
                        住人の配置は演出です。
                      </PopoverDescription>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            </section>
            <section className="area-directory" aria-label="4つの活動">
              {destinations.map((area) => (
                <button
                  className="directory-item"
                  key={area.id}
                  onClick={() => setSelected(area.id)}
                >
                  <span className="directory-name">
                    {area.name}
                    <ArrowUpRight size={20} strokeWidth={1.4} />
                  </span>
                  <span className="directory-summary">{area.summary}</span>
                  <span className="directory-action">
                    {area.availabilityLabel}
                    {!area.planned && <ArrowRight size={14} />}
                  </span>
                </button>
              ))}
            </section>
          </TabsContent>
          <TabsContent value="history" className="history-view">
            <div className="history-intro">
              <p>書いたこと、作ったもの。その日の記録をたどる。</p>
              <span>
                {dateLabel(date)}まで・{log.length}件
              </span>
            </div>
            <div className="history-filters" aria-label="履歴のエリア絞り込み">
              {[{ id: 'all', name: 'すべて' }, ...channels].map((channel) => (
                <button
                  key={channel.id}
                  aria-pressed={filter === channel.id}
                  onClick={() => setFilter(channel.id)}
                >
                  {channel.name}
                </button>
              ))}
            </div>
            <div className="history-records">
              {log.length ? (
                log.map((event) => (
                  <EventRecord
                    key={event.id}
                    event={event}
                    onVisit={() => visit(event)}
                  />
                ))
              ) : (
                <p className="empty-copy">
                  この日までに収録した記録はありません。
                </p>
              )}
            </div>
          </TabsContent>
          <section className="media-routes" aria-label="SNSから記事と動画へ">
            {mediaRoutes.map((route) => {
              const source = channels.find((area) => area.id === route.from)!;
              const destination = channels.find(
                (area) => area.id === route.to,
              )!;
              return (
                <div className="media-route" key={route.id}>
                  <div className="route-path">
                    <span className="route-origins">
                      {source.links?.map((link) => (
                        <a
                          className="text-link"
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.name}
                          <ArrowUpRight size={12} />
                        </a>
                      ))}
                    </span>
                    <ArrowRight
                      className="route-arrow"
                      size={20}
                      strokeWidth={1.2}
                      aria-hidden="true"
                    />
                    <button
                      className="route-destination"
                      onClick={() => setSelected(destination.id)}
                    >
                      {destination.name}
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <p>{route.description}</p>
                </div>
              );
            })}
          </section>
          {view === 'island' && (
            <section
              className="island-journal"
              aria-labelledby="journal-heading"
            >
              <div className="section-heading">
                <h2 id="journal-heading">
                  {current ? '島に残った便り' : 'この頃の便り'}
                </h2>
                <span>{historyRangeLabel}の抜粋</span>
                <button
                  className="text-link"
                  onClick={() => setView('history')}
                >
                  履歴をたどる
                  <ArrowRight size={15} />
                </button>
              </div>
              <div className="journal-entries">
                {state.events.slice(0, 3).map((event) => (
                  <button
                    className="journal-entry"
                    key={event.id}
                    onClick={() => setSelected(event.channel)}
                  >
                    <span className="journal-meta">
                      <time dateTime={event.date}>{dateLabel(event.date)}{event.dateBasis === 'firstSeen' ? ' 掲載確認' : ''}</time>
                      <span>
                        {
                          channels.find(
                            (channel) => channel.id === event.channel,
                          )!.name
                        }
                      </span>
                    </span>
                    <span className="journal-title">{event.title}</span>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
              </div>
            </section>
          )}
        </Tabs>
      </main>
      <footer className="site-footer">
        <button className="footer-wordmark" onClick={reset}>
          voronoi.works
        </button>
        <p>少しずつ、ここに。</p>
        <small>構成 {dateLabel(navigationDate)}</small>
      </footer>
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="area-sheet" showCloseButton={false}>
          <SheetClose className="sheet-close" aria-label="詳細を閉じる">
            <X size={23} strokeWidth={1.5} />
          </SheetClose>
          {selectedArea && (
            <>
              <SheetHeader>
                <SheetTitle className="sheet-title">
                  {selectedArea.name}
                </SheetTitle>
                <SheetDescription>{selectedArea.place}</SheetDescription>
              </SheetHeader>
              {selectedArea.mapMarker !== false && (
                <div
                  className={`sheet-illustration detail-${selectedArea.id}`}
                  aria-hidden="true"
                />
              )}
              <div className="sheet-body">
                <div className="area-summary">
                  <p>{selectedArea.summary}</p>
                  {selectedArea.planned && (
                    <span>公開準備中。作例はローカル版で制作しています。</span>
                  )}
                </div>
                <div className="source-links">
                  {selectedArea.links?.map((link) => (
                    <a
                      className="text-link"
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.name}へ<ArrowUpRight size={17} />
                    </a>
                  ))}
                </div>
                {selectedArea.records.length > 0 && (
                  <>
                    <h3 className="archive-heading">収録した便り</h3>
                    {selectedArea.records.map((event) => (
                      <EventRecord
                        key={event.id}
                        event={event}
                        onVisit={() => visit(event)}
                      />
                    ))}
                  </>
                )}
                <p className="sheet-footnote">
                  便りは{historyRangeLabel}の活動から抜粋しています。
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
