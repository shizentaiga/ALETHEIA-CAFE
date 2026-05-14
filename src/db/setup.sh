#!/bin/bash

# ==============================================================================
# Script Name: setup.sh
# Description: ALETHEIA-CAFE のデータベース（D1）初期構築およびシードデータの投入
# Usage:
#   1. 実行権限の付与: chmod +x src/db/setup.sh
#   2. ローカル実行  : ./src/db/setup.sh
#   3. リモート実行  : ./src/db/setup.sh remote
# ==============================================================================

# DB名（wrangler.tomlで設定した名前）
DB_NAME="ALETHEIA_CAFE_DB"

# 第1引数が "remote" かどうかでフラグを切り替える
if [ "$1" == "remote" ]; then
  FLAGS="--remote"
  echo "⚠️  【REMOTE】Cloudflare上の本番DBに対して実行します..."
else
  FLAGS="--local"
  echo "🏠 【LOCAL】ローカル環境のDBに対して実行します..."
fi

# 各SQLファイルの実行
echo "--- 1. Schema の適用(+駅名データベース) ---"
npx wrangler d1 execute $DB_NAME --file=./src/db/schema.sql $FLAGS -y
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/00_master/companies.sql $FLAGS -y
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/00_master/lines.sql $FLAGS -y
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/00_master/stations.sql $FLAGS -y

echo "--- 2. Master Data (Areas) のインポート ---"
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/00_master/areas.sql $FLAGS -y

echo "--- 3. Brands (*.sql) の一括インポート ---"
# 指定ディレクトリ内の .sql ファイルをループで処理
for file in ./src/db/seed/brands/*.sql; do
  # ファイルが存在するかチェック（ファイルがない場合の正規表現エラー防止）
  [ -e "$file" ] || continue
  
  echo "📄 Executing $(basename "$file")..."
  npx wrangler d1 execute $DB_NAME --file="$file" $FLAGS -y
done

echo "--- 4. Shops (Individual) のインポート ---"
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/shops/koiwa.sql $FLAGS -y

echo "✅ $FLAGS での全ての SQL 実行が完了しました。"