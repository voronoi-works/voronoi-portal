# 活動履歴の取得元

2026年11月20日、従来の328件をJSONへ移し、新着29件を追加した。その後、隊長の依頼でX・Threads・Instagramの投稿174件を履歴から削除し、記事と動画の183件を残した。現在の履歴は2026年9月3日から始まる。最初に収録した日は、活動やサイトを始めた日を表していない。変更前の記録はGitの履歴から確認できる。

今後の追加は `scripts/sync-history.py` が次の公開データから取得する。

- ghost: https://ghost.voronoi.works/index.xml
- note: https://note.com/voronoi_works/rss
- Passing Hours: https://www.youtube.com/feeds/videos.xml?channel_id=UChja7dllAvbvzUEzuJvwhog
- Voronoi Works YouTube: https://www.youtube.com/feeds/videos.xml?channel_id=UC0U41m1R36HTgG3SuskhR-w
- build: https://build.voronoi.works/sitemap.xml の作例記事と各記事の見出し

フィードの公開日時を日本時間の日付に変換する。URLが同じ記事は追加しない。YouTubeの短縮URL、末尾のスラッシュ、共有用パラメータの違いも重複として扱う。確認済みの既存タイトルと説明は保持する。

buildには公開日の項目がないため、初回取得時に載っていた作例は登録済みとして保存し、次に増えた作例から掲載を確認した日で記録する。画面でも日付に「掲載確認」と付ける。

過去の履歴はフィードに載らなくなっても残す。いずれかの取得元で失敗した場合は公開を止め、それまでのサイトを維持する。フィードの件数には限りがあるため、長期間止まった場合の全件補完は別途確認が必要になる。
