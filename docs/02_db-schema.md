# 02_データベース設計書（Database Schema）

## ファイル名: docs/02_db-schema.md

## 1. 概要
本プロジェクトのデータ構造を定義する。現在は、従来の `constants.ts` による静的な都道府県管理から、D1 データベース上の `areas` テーブルによる階層管理への**移行期間中**である。

---

## 2. エンティティ定義（移行後モデル）

### 2.1 areas（エリアマスタ）
都道府県、市区町村、および「道央」などの仮想エリアを単一テーブルで階層管理する。

| カラム名 | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| `area_id` | TEXT | PRIMARY KEY | ハイフン区切りの階層ID（例: `10-01-V10`） |
| `name` | TEXT | NOT NULL | 表示名（例: `道央`, `新宿区`） |
| `lat` | REAL | - | 代表地点の緯度 |
| `lng` | REAL | - | 代表地点の経度 |
| `area_level` | INTEGER | NOT NULL | 1:大エリア, 2:都道府県, 3:小エリア/仮想 |

### 2.2 services（サービス/店舗データ）
店舗や施設情報を保持する。`pref`/`city` 文字列による管理を廃止し、`area_id` への集約を行う。

| カラム名 | 型 | 制約 | 説明 |
|:---|:---|:---|:---|
| `service_id` | TEXT | PRIMARY KEY | 一意の識別子 |
| `area_id` | TEXT | NOT NULL | `areas.area_id` との論理紐付け |
| `title` | TEXT | NOT NULL | 店舗・施設名 |
| `address` | TEXT | NOT NULL | 住所全文（表示用） |
| `lat` / `lng` | REAL | - | 座標（地図表示・距離計算用） |
| `attributes_json`| TEXT | DEFAULT '{}' | Wi-Fi、電源等の動的属性 |
| `created_at` | DATETIME | DEFAULT ... | 作成日時 |

### 2.3 users / user_activities
ユーザー情報および、お気に入り（Favorite）や訪問済み（Visited）などのパーソナルデータを管理する。

---

## 3. 階層管理ルール（area_id 設計）

本設計では `sort_order` カラムを廃止し、`area_id` の**辞書順（ASC）**ですべての表示順を制御する。

- **ルール1（パディング）**: 数字は必ず 2 桁でゼロ埋めする（例: `01`, `02`）。
- **ルール2（セパレータ）**: 階層はハイフン `-` で区切る。
- **ルール3（長さ固定）**: 
  - 第 1 階層（地方）: 2文字（例: `10`）
  - 第 2 階層（都道府県）: 5文字（例: `10-13`）
  - 第 3 階層（市区町村）: 9文字（例: `10-13-101`）

---

## 4. 移行に関する特記事項

> [!IMPORTANT]
> **現在、データソースの移行を実施中。**
> 
> 1. **移行前**: `lib/constants.ts` 内の固定配列から都道府県を取得し、`services` テーブルの `pref` / `city` カラムと文字列一致で検索。
> 2. **移行中**: 
>    - `areas` テーブルを新規作成。
>    - `services` テーブルに `area_id` カラムを追加。
>    - 移行完了まで `pref` / `city` カラムは、後方互換性と視認性のために保持。
> 3. **移行後**: `area_id` による前方一致（LIKE）検索に完全移行し、`constants.ts` の地理情報は廃止。

---

## 5. インデックス設計
検索パフォーマンスを担保するため、以下のインデックスを定義する。

~~~sql
-- エリア階層検索の高速化
CREATE INDEX idx_areas_hierarchy ON areas(area_id);

-- 店舗のエリア検索を高速化
CREATE INDEX idx_services_area ON services(area_id);

-- 位置情報検索用（矩形範囲検索を想定）
CREATE INDEX idx_services_geo ON services(lat, lng);
~~~

---

*ALETHEIA-CAFE Database Design Document v2.1 (Migration Phase)*