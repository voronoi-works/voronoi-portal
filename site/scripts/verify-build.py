"""Check publication content and ensure private/development files are not shipped."""
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
page = (dist / 'index.html').read_text(encoding='utf-8')
assert 'https://voronoi.works/' in page
assert '<meta name="robots" content="noindex' not in page
assert 'G-40BMVKNFS4' in page and 'G-Q1764JCZBL' not in page
assert (dist / 'CNAME').read_text().strip() == 'voronoi.works'
assert (dist / 'privacy.html').is_file()
archive = json.loads((root / 'data/activities.json').read_text(encoding='utf-8'))
latest = max(row['date'] for row in archive['activities'])
assert latest.replace('-', '.') in page, 'Latest activity date must be visible in generated HTML'
for url in re.findall(r'(?:src|href)="([^"#]+)"', page):
    path = urlsplit(url).path
    if path.startswith('/') and not urlsplit(url).netloc:
        assert (dist / unquote(path.lstrip('/'))).exists(), 'Missing asset: ' + path
assert not any(p.name in ('.git', '.env', 'node_modules', 'activities.json', 'package.json') for p in dist.rglob('*'))
print(f'Publication checks passed: {len(archive["activities"])} activities, latest {latest}, assets, GA4, CNAME and privacy.')
