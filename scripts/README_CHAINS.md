# Cafe Chain Scraping Project

このディレクトリには、国内主要カフェチェーンの店舗情報を取得・整形するためのスクリプト群を格納します。
サーバー負荷軽減と開発効率向上のため、「Fetch（取得）」と「Convert（整形）」のプロセスを分離した設計を採用しています。

## 📁 ディレクトリ構成

~~~
scripts/
├── 001_starbucks_fetch.ts     # PlaywrightによるHTML/APIデータの生取得
├── 001_starbucks_convert.ts   # 保存済み生データからのJSON抽出・整形
├── 002_doutor_fetch.ts
├── 002_doutor_convert.ts
├── utils.ts                   # ブラウザ設定や共通のI/O処理
├── README_CHAINS.md           # 本ドキュメント
└── data/                      # 成果物
    ├── raw/                   # fetchスクリプトが出力する未加工データ (.html / .json)
    └── json/                  # convertスクリプトが出力する最終フォーマット (.json)
~~~

## 🛠 ワークフロー

1. Fetch: *_fetch.ts を実行。最新のレンダリング済みHTML等を data/raw/ に保存。
   - 目的: ターゲットサーバーへのアクセス回数を最小限に抑える。
2. Convert: *_convert.ts を実行。data/raw/ のファイルを解析し、data/json/ へ出力。
   - 目的: パースロジックの修正や仕様変更時に、オフラインで高速に試行錯誤する。

## 📊 ターゲット・チェーン・ランキング (店舗数順)

ファイル名の連番は、以下の国内店舗数ランキングに基づいています。

| ID  | ブランド名         | 店舗数 | 運営法人                       | 公式サイト |
|:---:|:------------------|:------:|:------------------------------|:-----------|
| 001 | スターバックス     | 2,077  | スターバックス コーヒー ジャパン | https://www.starbucks.co.jp |
| 002 | ドトール           | 1,078  | ドトール・日レスHD             | https://www.dnh.co.jp |
| 003 | コメダ珈琲         | 1,055  | コメダホールディングス         | https://www.komeda.co.jp |
| 004 | ミスタードーナツ   | 1,039  | ダスキン                       | https://www.misterdonut.jp |
| 005 | タリーズ           | 828    | タリーズコーヒージャパン       | https://www.tullys.co.jp |
| 006 | プロント           | 293    | プロントコーポレーション       | https://www.pronto.co.jp |
| 007 | サンマルクカフェ   | 285    | サンマルクHD                   | https://www.saint-marc-hd.com |
| 008 | 星乃珈琲店         | 269    | ドトール・日レスHD             | https://www.hoshinocoffee.com |
| 009 | ヴィ・ド・フランス | 211    | ヴィ・ド・フランス             | https://www.viedefrance.co.jp/ |
| 010 | 珈琲館             | 200    | C-United                      | https://c-united.co.jp |
| 011 | ゴンチャ           | 195    | ゴンチャ ジャパン               | https://www.gongcha.co.jp |
| 012 | カフェドクリエ     | 177    | C-United                      | https://c-united.co.jp/ |
| 013 | ベローチェ         | 159    | C-United                      | https://c-united.co.jp/ |
| 014 | エクセルシオール   | 127    | ドトールコーヒー               | https://www.doutor.co.jp/ |
| 015 | イタリアントマト   | 109    | イタリアントマト               | https://www.italiantomato.co.jp/ |
| 016 | CAFE BRICCO        | 108    | カインズフードサービス         | https://cafe-bricco.cainz.com/ |
| 017 | リンツ             | 106    | リンツ&シュプルングリージャパン | https://www.lindt.jp/ |
| 018 | ホリーズカフェ     | 104    | ホリーズ                       | https://hollys-corp.jp/ |
| 019 | ルノアール         | 104    | 銀座ルノアール                 | https://www.ginza-renoir.co.jp/ |
| 020 | 上島珈琲店         | 92     | ユーシーシーフードサービス     | https://www.ufs.co.jp/ |

---
Note: 店舗数は FC比較ネット(2026年参照) のデータを元に構成。