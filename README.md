# RHYTHM — PERSONAL RHYTHM DESIGN

ソースコード: https://github.com/Allo6600/today-state-share

自分のリズムで、最大限のパフォーマンスを。

月経周期と今日の体調を考慮して、作業や予定を置く日の目安を表示する作業計画ツールです(Chrome 拡張のサイドパネルと、スマホ向けWebページ)。医療・診断のためのものではありません。

## 特長
- 今日が周期のどこにあたるかと、時期に合った設計案(作業・予定の置き方)を表示
- 体調(軽い・ふつう・重い)の入力、カレンダーでの月経の記録
- A・B・Cの名前・記号・色の変更
- 「色をGoogleカレンダーに反映する」(任意。ONにしたときだけ calendar.google.com の許可を求めます)
- 時期ごとの状態と設計案、周期や刺激物についての調査、参考文献(設定の中)
- 記録はすべて端末の中だけ。通信・アカウント登録・広告・解析はありません

## 使い方(開発版の読み込み)
1. Chrome で `chrome://extensions` を開き、「デベロッパー モード」をオンにする
2. 「パッケージ化されていない拡張機能を読み込む」で、`extension` フォルダを選ぶ
3. ツールバーのアイコンを押すと、サイドパネルが開く

## 構成
- `extension/` … Chrome 拡張(`core.js`・`texts.json` は自動生成)
- `mobile/` … スマホ向けWebページ(`mobile-src/` から生成)
- `texts/kb-plain.json` … 提案文と論文の要点
- `docs/` … プライバシーポリシー、ストア掲載情報
- `store/` … ストア用スクリーンショット
- `build.py` … 文面の検証と、拡張・スマホ版の更新(`py build.py`)

## ドキュメント
- [プライバシーポリシー](docs/privacy-policy.md)
- [ストア掲載情報](docs/store-listing.md)

## 制作者
福永 亜紀(GitHub: [Allo6600](https://github.com/Allo6600))
連絡先: s2412997@klis.tsukuba.ac.jp

## ライセンス
MIT License(`LICENSE` を参照)
