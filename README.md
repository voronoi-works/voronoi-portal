# voronoi.works

Main portal for [Voronoi Works](https://voronoi.works/).

## Application and publication

`site/` contains the Astro and React application, published assets, and activity data. GitHub Pages serves only the verified `site/dist` artifact. The original root-level static export is retained as a rollback snapshot; it is not the source for subsequent edits.

Local preview:

```sh
cd site
pnpm install --frozen-lockfile
pnpm dev
```

Public build and checks:

```sh
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/sync-history.py --dry-run
pnpm test
pnpm typecheck
VORONOI_PUBLIC=1 ASTRO_TELEMETRY_DISABLED=1 pnpm build
pnpm verify:build
```

## Activity updates

The `Update activity history and publish` workflow runs daily at approximately 08:23 Japan time, on application changes, and through **Actions → Run workflow**. Scheduled starts can be delayed by GitHub. No local computer or paid AI service is required.

It reads public ghost, note and YouTube feeds plus the build article sitemap. It preserves the complete existing archive, adds previously unseen URLs, checks the timeline, types and publication output, then saves the new archive and deploys GitHub Pages. A failed source or check stops publication and leaves the live site in place. Existing records are never deleted because they disappear from a feed. Existing titles are retained even if a feed changes them.

`site/data/activities.json` is the durable archive. Dates from feeds use the original publication timestamp converted to Japan time. Build currently has no public publication-date field: existing article URLs are initially marked as known; a newly found article is recorded on its first observed date, displayed as **掲載確認**. Subpages of an existing work are excluded. On November 20, 2026, the owner requested that X, Threads and Instagram posts be removed from the history. The active archive and history filters now cover only ghost, build, note and YouTube. Social destination links remain on the island; earlier Git commits retain the former archive.

RSS feeds cover a limited recent window. This synchronizer does not claim to reconstruct every publication during a long outage. Run the workflow after an outage and inspect the report before treating the archive as complete.

## Rollback and stopping updates

- Disable the workflow in Actions to stop automatic updates.
- Revert an application or archive commit, then run the workflow to republish. For an archive restoration, temporarily disable the synchronization step if the same publicly available entries should not be re-added.
- To return to the pre-automation static export, disable the workflow and set Pages to deploy from the `main` branch, root directory. The retained root export is the snapshot from commit `218feb83956ce31a585d7e8b1a61c28e3e8300fb`.

The custom domain and GA4 property are preserved. Credentials and local development configuration are not part of the public application.
