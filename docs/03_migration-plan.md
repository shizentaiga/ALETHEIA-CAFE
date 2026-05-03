# 03_データベース移行計画書（Database Migration Plan）

## ファイル名: docs/03_migration-plan.md

## 1. 概要
本プロジェクトのエリア管理を、`constants.ts` および `services` テーブルの文字列管理から、`areas` テーブルによる階層 ID（`area_id`）管理へ移行するための計画である。既存機能を維持しつつ、データの整合性を担保した段階的な移行を目指す。

---

## 2. 移行フェーズ

### ステップ 1：エリアマスタの構築と基盤整備
1. **エリアテーブルの追加**:
   - `areas` テーブルをデプロイ。`area_id` を前方一致検索（LIKE）に最適化した設計とする。
2. **シードデータの準備 (HeartRails API 活用)**:
   - 全市区町村データを取得し、JISコードベースの ID を生成。
   - **表記揺れ対策**: `lib/searchUtils.ts` に `normalizeAddress()` を実装し、突合時の「ヶ/ケ」「全角/半角」「空白」の差分を吸収する。
3. **影響調査**:
   - テーブル追加のみで既存動作に影響がないことを確認し、コミット。

### ステップ 2：既存店舗データの ID 紐付け
1. **services テーブルの拡張**:
   - `services` テーブルに `area_id` カラムを追加（INDEX を付与）。
2. **既存シードデータの修正と ID 付与**:
   - `pref`/`city` を元に新 ID を特定。
   - **整合性チェック (Step 2.5)**: 紐付け漏れがないか `WHERE area_id IS NULL` で確認。
   - **「未分類」退避ルール**: 突合不能な店舗には `99-UNKNOWN` 等の暫定 ID を割り当て、検索結果からの消失を防ぐ。
3. **動作確認**:
   - 文字列検索と ID 検索が同等の結果を返すことを確認。

### ステップ 3：完全移行とクリーンアップ
1. **ソースコードの完全置換**:
   - `constants.ts` を廃止し、検索ロジックを `area_id` 前方一致に統一。
2. **DB クリーンアップの「割り切り」**:
   - 旧カラム（`pref`, `city`）を削除。
   - **制約の運用**: SQLite の再構築コストを考慮し、DB 側での `NOT NULL` 変更は急がず、アプリケーション層で ID 必須を保証する運用とする。

---

## 3. 実装上の重要ポイント（考慮漏れ対策）

### 3.1 表記揺れ・住所正規化
HeartRails API と既存データの突合成功率を上げるため、以下の正規化を徹底する。
- **文字種統一**: 全角英数字の半角化、ハイフンの統一。
- **特定文字**: 「ヶ」「ケ」や「周辺」といったノイズの除去。

### 3.2 パフォーマンスとインデックス
D1（SQLite）において `TEXT` 型の `LIKE '13-%'` 検索はインデックスのレンジスキャンが効くため、以下のインデックスを必ず定義する。
~~~sql
CREATE INDEX idx_services_area_id ON services(area_id);
~~~

### 3.3 データ整合性のクロスチェック
移行完了前に以下の SQL で「孤立した店舗」や「存在しないエリア ID」がないかを検証する。
~~~sql
-- area_id が付与されていない店舗の抽出
SELECT service_id, title, address FROM services WHERE area_id IS NULL;

-- area_id がマスタに存在しない店舗の抽出
SELECT s.service_id FROM services s 
LEFT JOIN areas a ON s.area_id = a.area_id 
WHERE a.area_id IS NULL AND s.area_id != '99-UNKNOWN';
~~~

---

## 4. 完了定義
- [ ] `areas` テーブルに全国および仮想エリアのデータが構築されている。
- [ ] 全ての `services` レコードに有効な `area_id` が割り当てられている。
- [ ] `constants.ts` の地理情報配列が完全に削除され、ソースコードがクリーンになっている。

---

*ALETHEIA-CAFE DB Migration Plan v2.0*