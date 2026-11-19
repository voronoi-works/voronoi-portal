import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('history_sync', Path(__file__).resolve().parents[1] / 'scripts/sync-history.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


def rss(url='https://note.com/voronoi_works/n/n123456', title='新しい記事', published='Thu, 19 Nov 2026 16:00:00 +0000'):
    return f'<rss><channel><item><title>{title}</title><link>{url}</link><pubDate>{published}</pubDate></item></channel></rss>'.encode()


def sitemap(slugs=('atelier',)):
    return ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(
        f'<url><loc>https://build.voronoi.works/works/{slug}/</loc></url>' for slug in slugs
    ) + '</urlset>').encode()


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.archive = {'schemaVersion': 1, 'activities': [{
            'id': 'kept', 'date': '2026-09-01', 'channel': 'note', 'kind': 'published',
            'title': '残す記事', 'description': '人が確認した記録',
            'url': 'https://note.com/voronoi_works/n/nkept',
        }]}

    def fetch(self, url):
        if url == sync.BUILD_SITEMAP:
            return sitemap()
        source, channel, _ = next(s for s in sync.SOURCES if s[2] == url)
        if channel == 'blog':
            return rss('https://ghost.voronoi.works/new-post')
        if channel == 'note':
            return rss()
        video = 'abcdefghij1' if source == 'passing-hours' else 'abcdefghij2'
        return f'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>動画</title><link rel="alternate" href="https://www.youtube.com/watch?v={video}"/><published>2026-11-19T16:00:00Z</published></entry></feed>'.encode()

    def test_jst_publication_date(self):
        rows = sync.parse_feed(rss(), 'note', 'note', '2026-11-20')
        self.assertEqual(rows[0]['date'], '2026-11-20')

    def test_future_publications_not_added(self):
        self.assertEqual(sync.parse_feed(rss(), 'note', 'note', '2026-11-19'), [])

    def test_archive_retains_every_original_field(self):
        original = copy.deepcopy(self.archive)
        result, report = sync.synchronize(self.archive, self.fetch, '2026-11-20')
        self.assertEqual(self.archive, original)
        self.assertEqual(result['activities'][0], original['activities'][0])
        self.assertEqual(report['addedCount'], 4)
        self.assertEqual(len(result['activities']), 5)

    def test_repeated_sync_is_idempotent(self):
        first, _ = sync.synchronize(self.archive, self.fetch, '2026-11-20')
        second, report = sync.synchronize(first, self.fetch, '2026-11-21')
        self.assertEqual(first, second)
        self.assertEqual(report['addedCount'], 0)

    def test_build_initialization_does_not_invent_publication_dates(self):
        result, report = sync.synchronize(self.archive, self.fetch, '2026-11-20')
        self.assertTrue(report['buildBaselineInitialized'])
        self.assertEqual(result['observedBuildUrls'], ['https://build.voronoi.works/works/atelier'])
        self.assertFalse(any(r['channel'] == 'make' for r in result['activities']))

    def test_new_build_article_uses_observation_date(self):
        self.archive['observedBuildUrls'] = ['https://build.voronoi.works/works/older']
        def fetch(url):
            if url.endswith('/works/atelier/'):
                return '<h1>画像から<span>動画を作る</span></h1>'.encode()
            return self.fetch(url)
        result, _ = sync.synchronize(self.archive, fetch, '2026-11-20')
        row = next(r for r in result['activities'] if r['channel'] == 'make')
        self.assertEqual((row['date'], row['dateBasis']), ('2026-11-20', 'firstSeen'))
        self.assertEqual(row['title'], '画像から動画を作る')
        self.assertIn('https://build.voronoi.works/works/older', result['observedBuildUrls'])

    def test_failure_does_not_mutate_archive(self):
        original = copy.deepcopy(self.archive)
        def fail(url):
            if 'note.com' in url:
                raise TimeoutError('source unavailable')
            return self.fetch(url)
        with self.assertRaises(TimeoutError):
            sync.synchronize(self.archive, fail, '2026-11-20')
        self.assertEqual(self.archive, original)

    def test_url_aliases_deduplicate(self):
        self.assertEqual(sync.canonical_url('https://youtu.be/abcdefghij1?t=1'), sync.canonical_url('https://www.youtube.com/watch?v=abcdefghij1&feature=share'))
        self.assertEqual(sync.canonical_url('https://ghost.voronoi.works/article/'), sync.canonical_url('https://ghost.voronoi.works/article'))
        self.assertEqual(sync.canonical_url('https://note.com/voronoi_works/n/n123456?from=rss'), sync.canonical_url('https://note.com/voronoi_works/n/n123456'))

    def test_existing_url_does_not_overwrite_manual_title(self):
        self.archive['activities'][0]['url'] = 'https://note.com/voronoi_works/n/n123456/'
        result, report = sync.synchronize(self.archive, self.fetch, '2026-11-20')
        self.assertEqual(result['activities'][0]['title'], '残す記事')
        self.assertEqual(report['addedCount'], 3)

    def test_wrong_or_empty_feed_fails(self):
        for payload in (b'<html>Access denied</html>', b'<rss><channel/></rss>', b'<rss>'):
            with self.assertRaises((ValueError, sync.ET.ParseError)):
                sync.parse_feed(payload, 'note', 'note', '2026-11-20')

    def test_foreign_entry_and_missing_date_fail(self):
        for payload in (rss('https://example.org/article'), rss(published='')):
            with self.assertRaises(ValueError):
                sync.parse_feed(payload, 'note', 'note', '2026-11-20')

    def test_no_private_or_unsafe_urls(self):
        for value in ('javascript:alert(1)', 'http://example.org', 'https://user:password@example.org', 'https://example.org:8080/a'):
            with self.assertRaises(ValueError):
                sync.canonical_url(value)

    def test_build_sitemap_only_contains_individual_works(self):
        self.assertEqual(sync.build_urls(sitemap(('atelier', 'atelier/how-to', ''))), ['https://build.voronoi.works/works/atelier'])


if __name__ == '__main__':
    unittest.main()
