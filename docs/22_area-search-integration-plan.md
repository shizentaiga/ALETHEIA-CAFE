# エリア検索・ドリルダウン改善：統合実装計画書 (v1.7)

## 1. 設計思想：セーフティ・ステートレス

- **拡張性のあるパッキング**: `area=auto:13123` のように `属性:値` 形式を採用し、将来のカテゴリ追加（`station:123` 等）に備える。
- **住所の正規化**: 外部ライブラリを活用し、表記揺れに左右されない高精度なDBマスタを構築。
- **サーバーサイドへの拡張性**: 現状はシンプルさを優先しつつ、将来のAPI化（計算のオフロード）を視野に入れた設計。

---

## 2. URLパラメータ設計

| パラメータ形式 | 意味 | 内部処理 (TypeScript) |
| :--- | :--- | :--- |
| `?area=13123` | 手動選択 | `areaId: 13123, isAuto: false` |
| `?area=auto:13123` | 現在地由来 | `areaId: 13123, isAuto: true` |

---

## 3. 修正対象ファイルと実装詳細

### ① `lib/searchUtils.ts`（パースと距離計算）

セパレータ対応と、将来的なAPI化を意識したインターフェースで実装します。

```typescript
/**
 * areaパラメータをパースしてIDと属性を抽出
 * @example "auto:13123" -> { id: 13123, isAuto: true }
 */
export const parseAreaParam = (value: string | undefined) => {
  if (!value) return { areaId: null, isAuto: false };

  const isAuto = value.startsWith('auto:');
  const idStr = isAuto ? value.split(':')[1] : value;

  return {
    areaId: idStr ? parseInt(idStr, 10) : null,
    isAuto,
  };
};

/**
 * 三平方の定理による最短エリア特定
 * ※現在は簡易的に全件ループ。データ量増大時はサーバーサイドAPIへ移行。
 */
export const getNearestAreaId = (areas: Area[], lat: number, lng: number) => {
  let minDist = Infinity;
  let nearestId = null;

  // 経度方向に0.8の補正（日本付近の近似）
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
```

### ② `db/migration.ts`（Phase 1: 住所正規化バッチ）

`normalize` ライブラリを使用して、既存の `address` から `area_id` を生成します。

```typescript
import { normalize } from '@geolonia/normalize-japanese-addresses';

// 処理フローのイメージ
// 1. address を取得
// 2. normalize(address) で pref, city を抽出
// 3. areas テーブルを参照・作成し ID を取得
// 4. 元のテーブルの area_id を更新
```

---

## 4. 修正計画のロードマップ

### Phase 1: 高精度マスタ構築（Data Integrity）

- **正規化テスト**: 既存の `address` データを `normalize` にかけ、変換結果をサンプル（数百件程度）で目視確認。
- **マスタ作成**: 重複のない `pref_name + city_name` のペアで `areas` テーブルを構築。
- **FK更新**: サービス側に `area_id` を付与し、文字列検索からID検索へ完全に切り替え。

### Phase 2: 位置情報連携（Logic Integration）

- **クライアントサイド計算**: `areas` のリスト（IDと座標のみの軽量版）を保持し、最短の `area_id` を算出。
- **API化の検討**: `areas` テーブルが数千件を超え、初期ロードのペイロードが重くなるタイミングで、計算処理を `GET /api/nearest-area` へ移行。

### Phase 3: UI/UX（Frontend Delivery）

- **ドリルダウン**: 地方 > 都道府県 > 市区町村 のフルリロードリンク。
- **ラベル表示**: `isAuto` フラグに基づき、ヘッダーに「現在地（〇〇市）」と表示。

---

## 5. 懸念事項への対策まとめ

| 懸念 | 対策 |
| :--- | :--- |
| **衝突リスク** | `auto:` セパレータの導入により、今後の検索カテゴリ拡張に耐えうる堅牢なパースロジックを実現。 |
| **計算負荷/ペイロード** | 当面は軽量なJSONリストで対応し、スケーリングが必要になった時点でAPI化する設計的余白を確保。 |
| **分離精度** | `@geolonia/normalize-japanese-addresses` の導入と目視確認ステップにより、住所パースの失敗による検索漏れを最小化。 |

## 6. メモ
1点だけ挙げます。
parseInt(idStr, 10) が NaN を返したとき、そのまま areaId に入ります。
?area=auto:abc のような不正なURLや、split(':')[1] が undefined になるケース（例：?area=auto:）で NaN が返り、後続のDBクエリやURL生成でサイレントに壊れます。
typescript// 現状
areaId: idStr ? parseInt(idStr, 10) : null

// 改善
const parsed = idStr ? parseInt(idStr, 10) : NaN;
areaId: Number.isFinite(parsed) ? parsed : null,
isAuto: true なのに areaId: null という状態を明示的に作れるようにしておくと、呼び出し側でのハンドリングも書きやすくなります。