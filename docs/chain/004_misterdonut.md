# ミスタードーナツ店舗情報取得 仕様分析資料

## 1. ページアクセス基本情報
* **Base URL**: https://md.mapion.co.jp/b/misterdonut/attr/
* **Method**: GET
* **データ形式**: HTML（サーバーサイドレンダリング）

---

## 2. クエリパラメータ (Request Parameters)
| パラメータ名 | 型 | 内容・指定例 |
| :--- | :--- | :--- |
| **kencode** | string | 都道府県コード（01:北海道 〜 47:沖縄） |
| **start** | number | ページ番号（1ページ20件のため 1, 2, 3... と指定） |
| **t** | string | 固定値 `attr_con`（属性検索モード） |

---

## 3. データ構造解析（HTML & JavaScript）

### A. ページネーション管理
Playwrightの `page.evaluate()` で以下のグローバル変数を参照し、ループを制御します。
* `window.pageState.nowPage`: 現在のページ番号
* `window.pageState.endPage`: 最大ページ数（終了判定に使用）

### B. 店舗情報 (li.list-item 内)
* **店舗名**: `h2.list-content-name`
* **住所**: `div.list-content-text`
* **位置情報**: `div.js-distance-string` の `data-lat` / `data-lng` 属性
* **詳細URL**: `a` タグの `href` 属性

### C. サービスアイコン（alt属性による判別）
`ul.flex-row-wrap` 内の `img[alt]` から特定項目を抽出。
* **ドーナツビュッフェ**: 「ドーナツビュッフェ」または「ドーナツビュッフェ予約制」
* **その他**: 「ネットオーダー」「出前館」「駐車場」など

---

## 4. 実装ロジック・アルゴリズム

### ステップ1：都道府県ループ
* `kencode=01` から `47` までを順次実行。

### ステップ2：ページング処理
1. `start=1` にアクセスし、`window.pageState.endPage` を取得。
2. 最大ページ数に達するまで `start` をインクリメントしてループ。

### ステップ3：ビュッフェ実施判定
* (Code Snippet)
* const isBuffet = !!item.querySelector('img[alt*="ビュッフェ"]');

---

## 5. 調査報告と収集方針

### 概要と特徴
* **サイト構造**: Mapion提供システム。JSON APIではないが、HTML内の `data` 属性やJS変数に構造化データがあり、スクレイピングの信頼性は高い。
* **結論**: API通信模倣よりも、Playwrightでページ遷移を行いHTMLをパースする手法が最も確実。

### 効率化のポイント
* **JS変数の直接取得**: `page.evaluate()` で `window.retJson` 等を読み取り、検索状態を把握。
* **ヘッドレス実行**: 都道府県単位での高速クロールを実施。
* **ビュッフェ属性**: アイコンの `alt` 属性に "ビュッフェ" という文字列が含まれるかをチェックし、予約制の有無を含めて抽出。