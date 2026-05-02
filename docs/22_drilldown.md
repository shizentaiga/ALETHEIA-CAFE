# エリア検索・ドリルダウン改善：統合実装計画書 v1.6

---

## 1. 設計思想：ステートレス・パッキング

| 原則 | 内容 |
|:---|:---|
| URL の極小化 | `area` パラメータ1つに「場所の ID」と「取得手段（現在地か否か）」を同梱する |
| ロジックの対称性 | サーバー側は受け取った値をパースするだけで、以降の検索処理は常に共通の `area_id` で実行する |
| UI の整合性 | ユーザーが共有した URL でも、「現在地から選ばれた」というコンテキストが維持される |

---

## 2. URL パラメータ設計

| パラメータ形式 | 意味 | 内部処理 |
|:---|:---|:---|
| `?area=13123` | 手動で市区町村を選択 | `areaId: 13123, isAuto: false` |
| `?area=auto13123` | 現在地取得から特定 | `areaId: 13123, isAuto: true` |

---

## 3. 修正対象ファイルと実装詳細

### ① `lib/searchUtils.ts`（ロジックの要）

パラメータのパースと距離判定をここに集約する。

~~~typescript
// 1. パラメータ解析
export const parseAreaParam = (value: string | undefined) => {
  if (!value) return { areaId: null, isAuto: false };
  const isAuto = value.startsWith('auto');
  const idStr = isAuto ? value.replace('auto', '') : value;
  return { areaId: parseInt(idStr, 10), isAuto };
};

// 2. 三平方の定理による最短エリア特定（整数座標を想定）
export const getNearestAreaId = (areas: Area[], lat: number, lng: number) => {
  let minDist = Infinity;
  let nearestId = null;
  // 日本の緯度特性に合わせた簡易重み付け（経度方向に 0.8）
  for (const area of areas) {
    const dy = lat - area.lat;
    const dx = (lng - area.lng) * 0.8;
    const dist = dy * dy + dx * dx;
    if (dist < minDist) {
      minDist = dist;
      nearestId = area.id;
    }
  }
  return nearestId;
};
~~~

### ② `db/schema.sql`（マスタ構造）

`areas` テーブルを「検索の起点」として整備する。

- **`areas` テーブル**：`id`, `pref_name`, `city_name`, `lat`, `lng`（代表点）
- **インデックス**：`services.area_id` にインデックスを貼り、JOIN を高速化する

### ③ `components/SearchArea.tsx`（フロントエンド）

「現在地を取得」ボタンの挙動を以下に書き換える。

1. `navigator.geolocation` で座標を取得
2. クライアントサイドで保持している `areas` 簡易リスト（または API）から最短の `area_id` を特定
3. `window.location.href = "/search?area=auto" + id` でフルリロード

---

## 4. 修正計画のロードマップ

### Phase 1：データ・クレンジングとマスタ構築

- 既存の `address` 文字列から「都道府県」と「市区町村」を分離
- `areas` テーブルを作成し、重複のないマスタデータを生成
- 既存レコードへ `area_id` を一括付与

### Phase 2：検索・表示処理の統合

- `HeaderSearch.tsx` で `isAuto` を判定し、ラベルを「現在地（〇〇市）」に切り替える
- `searchQuery.ts` の `WHERE` 句を `area_id` 基準に変更

### Phase 3：ドリルダウン UI の完成

- `AreaList.tsx` において、`area` パラメータがない場合は「地方」、ある場合は「都道府県」…と階層的にリンクを表示
- すべてのリンクを `<a>` タグによるフルリロード形式で実装し、PSI スコアを担保

---

## 5. 本設計によるメリット

| メリット | 内容 |
|:---|:---|
| シンプルさ | `auto=1` のような別パラメータを管理する手間が消え、文字列操作だけで完結 |
| デバッグ容易性 | URL を見れば「どのエリアか」と「どう選ばれたか」が一目瞭然 |
| 拡張性 | 将来的に「最寄駅」を追加する場合も `area=station123` のようにパッキングを拡張するだけで対応可能 |

---

## 懸念事項

### `auto` プレフィックスの衝突リスク

`area=auto13123` の文字列パースは `startsWith('auto')` で判定しているが、将来的に `area=autobus_stop_5` のような別カテゴリを追加した場合に誤判定が起きる。拡張性の観点では `area=auto:13123` のようにセパレータを入れておく方が安全。

~~~typescript
// より堅牢なパース例
const isAuto = value.startsWith('auto:');
const idStr = isAuto ? value.replace('auto:', '') : value;
~~~

現時点で `auto` プレフィックスを使うのが確定済みの用途だけなら問題ないが、§5 で「将来的に `station123` 等を追加」と言及しているため、早めにセパレータ方式に切り替えておくことを推奨する。

### `getNearestAreaId` のクライアントサイド実行について

`areas` の全リストをクライアントに渡して最短計算する設計は、エリア数が少ない（数十〜数百件）初期フェーズでは問題ない。ただし将来的にエリア数が増えた場合、ペイロードが肥大化するリスクがある。その際は `/api/nearest-area?lat=X&lng=Y` のように計算をサーバーへ移譲する設計変更を検討する。現時点はシンプルな現行方式で進めて問題ない。

### `address` 文字列の分離精度（Phase 1）

既存レコードの `address` 文字列から都道府県・市区町村を分離する処理は、住所フォーマットの揺れ（「東京都新宿区」「新宿区（東京）」など）によって精度が下がりやすい。一括付与前にサンプルで変換結果を目視確認するステップを挟むことを強く推奨する。

*document version: v1.6 — last reviewed: 2026-04*