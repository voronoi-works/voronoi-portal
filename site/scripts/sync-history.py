"""Append verified public feed entries; never replace the historical archive."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
import time
from urllib.parse import parse_qs, unquote, urlsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'data' / 'activities.json'
JST = timezone(timedelta(hours=9))
SOURCES = (
    ('ghost', 'blog', 'https://ghost.voronoi.works/index.xml'),
    ('note', 'note', 'https://note.com/voronoi_works/rss'),
    ('passing-hours', 'youtube', 'https://www.youtube.com/feeds/videos.xml?channel_id=UChja7dllAvbvzUEzuJvwhog'),
    ('voronoi-youtube', 'youtube', 'https://www.youtube.com/feeds/videos.xml?channel_id=UC0U41m1R36HTgG3SuskhR-w'),
)
BUILD_SITEMAP = 'https://build.voronoi.works/sitemap.xml'


def canonical_url(value):
    p = urlsplit(value)
    if p.scheme != 'https' or not p.hostname or p.username or p.password or p.port:
        raise ValueError('Expected an ordinary HTTPS URL')
    host = p.hostname.lower()
    if host in ('youtu.be', 'youtube.com', 'www.youtube.com'):
        video = p.path.strip('/') if host == 'youtu.be' else parse_qs(p.query).get('v', [''])[0]
        if not video and p.path.startswith('/shorts/'):
            video = p.path.split('/')[2]
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video):
            raise ValueError('Invalid YouTube video URL')
        return 'https://www.youtube.com/watch?v=' + video
    return 'https://' + host + unquote(p.path).rstrip('/')


def publication_date(value):
    try:
        stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        stamp = parsedate_to_datetime(value)
    if stamp.tzinfo is None:
        raise ValueError('Publication time must include a timezone')
    return stamp.astimezone(JST).date().isoformat()


def get(url):
    # All requested locations come from the fixed source list or validated build paths.
    for attempt in range(2):
        try:
            request = Request(url, headers={'User-Agent': 'VoronoiWorksHistory/1.0 (+https://voronoi.works/)'})
            with urlopen(request, timeout=25) as response:
                if urlsplit(response.url).hostname != urlsplit(url).hostname:
                    raise ValueError('Unexpected source redirect')
                payload = response.read(4_000_001)
                if len(payload) > 4_000_000:
                    raise ValueError('Source exceeds size limit')
                return payload
        except Exception:
            if attempt:
                raise
            time.sleep(1)


def clean_title(value):
    title = ' '.join(unescape(value).split())
    if not title or len(title) > 1000 or any(ord(c) < 32 for c in title):
        raise ValueError('Missing or invalid title')
    return title


def parse_feed(payload, source, channel, today):
    root = ET.fromstring(payload)
    if root.tag == 'rss':
        owner = root.find('channel')
        if owner is None:
            raise ValueError('Missing RSS channel')
        entries = owner.findall('item')
        rows = [(e.findtext('title'), e.findtext('link'), e.findtext('pubDate')) for e in entries]
    elif root.tag == '{http://www.w3.org/2005/Atom}feed':
        entries = root.findall('{*}entry')
        rows = []
        for entry in entries:
            links = [e for e in entry.findall('{*}link') if e.get('rel', 'alternate') == 'alternate']
            rows.append((entry.findtext('{*}title'), links[0].get('href') if links else None, entry.findtext('{*}published')))
    else:
        raise ValueError('Expected RSS or Atom feed')
    if not rows:
        raise ValueError('Empty feed; preserving the archive')
    records = []
    for title, url, published_at in rows:
        if not title or not url or not published_at:
            raise ValueError('Feed entry is missing title, URL or publication date')
        url = canonical_url(url)
        p = urlsplit(url)
        allowed = (
            channel == 'blog' and p.hostname == 'ghost.voronoi.works'
            or channel == 'note' and p.hostname == 'note.com' and p.path.startswith('/voronoi_works/n/')
            or channel == 'youtube' and p.hostname == 'www.youtube.com'
        )
        if not allowed:
            raise ValueError('Feed entry points outside its source')
        day = publication_date(published_at)
        if day > today:
            continue
        records.append({
            'id': source + '-' + sha256(url.encode()).hexdigest()[:16],
            'date': day, 'channel': channel, 'kind': 'published',
            'title': clean_title(title), 'url': url,
            'source': source, 'publishedAt': published_at, 'dateBasis': 'published',
        })
    return records


def build_urls(payload):
    root = ET.fromstring(payload)
    if root.tag != '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset':
        raise ValueError('Expected the build sitemap')
    urls = []
    for entry in root.findall('{*}url'):
        value = entry.findtext('{*}loc')
        if not value:
            raise ValueError('Missing sitemap location')
        url = canonical_url(value)
        if urlsplit(url).hostname != 'build.voronoi.works':
            raise ValueError('Unexpected build sitemap host')
        if re.fullmatch(r'https://build\.voronoi\.works/works/[a-z0-9-]+', url):
            urls.append(url)
    if not urls:
        raise ValueError('No build articles found; preserving the archive')
    return sorted(set(urls))


class HeadingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.headings = []
        self.inside = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'h1':
            self.inside = True
            self.parts = []

    def handle_data(self, data):
        if self.inside:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == 'h1' and self.inside:
            self.headings.append(clean_title(''.join(self.parts)))
            self.inside = False


def build_record(url, payload, today):
    parser = HeadingParser()
    parser.feed(payload.decode('utf-8'))
    if len(parser.headings) != 1:
        raise ValueError('Expected exactly one article heading')
    return {
        'id': 'build-' + sha256(url.encode()).hexdigest()[:16],
        'date': today, 'channel': 'make', 'kind': 'published',
        'title': parser.headings[0], 'url': url + '/',
        'source': 'build', 'dateBasis': 'firstSeen',
    }


def validate_archive(archive):
    if archive.get('schemaVersion') != 1 or not isinstance(archive.get('activities'), list):
        raise ValueError('Unsupported archive schema')
    ids, urls = set(), set()
    for row in archive['activities']:
        if not row.get('id') or row['id'] in ids:
            raise ValueError('Missing or duplicate activity ID')
        ids.add(row['id'])
        if date.fromisoformat(row['date']).isoformat() != row['date']:
            raise ValueError('Invalid activity date')
        if row['channel'] not in ('blog', 'note', 'make', 'youtube', 'sns', 'instagram') or row['kind'] != 'published':
            raise ValueError('Invalid activity kind or channel')
        clean_title(row['title'])
        if row['url'] is not None:
            url = canonical_url(row['url'])
            if url in urls:
                raise ValueError('Duplicate activity URL')
            urls.add(url)
    return urls


def synchronize(archive, fetch=get, today=None):
    today = today or datetime.now(JST).date().isoformat()
    known = validate_archive(archive)
    # Gather every source before changing anything. One failed source aborts the run.
    requests = [s[2] for s in SOURCES] + [BUILD_SITEMAP]
    with ThreadPoolExecutor(max_workers=4) as pool:
        payloads = list(pool.map(fetch, requests))
    candidates = []
    counts = {}
    for (source, channel, _), payload in zip(SOURCES, payloads):
        rows = parse_feed(payload, source, channel, today)
        candidates.extend(rows)
        counts[source] = len(rows)
    current_build = build_urls(payloads[-1])
    observed_build = archive.get('observedBuildUrls')
    if observed_build is not None:
        for url in current_build:
            if url not in observed_build and url not in known:
                candidates.append(build_record(url, fetch(url + '/'), today))
    added = []
    for row in sorted(candidates, key=lambda r: (r['date'], r['id'])):
        key = canonical_url(row['url'])
        if key in known or row['date'] < '2026-08-30':
            continue
        known.add(key)
        added.append(row)
    result = {
        **archive,
        'activities': archive['activities'] + added,
        'observedBuildUrls': sorted(set(observed_build or []) | set(current_build)),
    }
    validate_archive(result)
    report = {
        'checkedAt': datetime.now(JST).isoformat(),
        'sourceCounts': counts, 'buildArticles': len(current_build),
        'buildBaselineInitialized': observed_build is None,
        'previousCount': len(archive['activities']), 'totalCount': len(result['activities']),
        'addedCount': len(added), 'added': added,
        'latestDate': max(row['date'] for row in result['activities']),
    }
    return result, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    archive = json.loads(ARCHIVE.read_text(encoding='utf-8'))
    result, report = synchronize(archive)
    if not args.dry_run and result != archive:
        temporary = ARCHIVE.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(ARCHIVE)
    report['dryRun'] = args.dry_run
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.report:
        args.report.write_text(rendered, encoding='utf-8')
    print(rendered)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('History sync failed; existing archive retained: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
