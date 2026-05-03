#!/bin/bash

# 実行方法
# chmod +x src/db/setup.sh

# ローカル実行
# ./src/db/setup.sh

# リモート実行
# ./src/db/setup.sh remote

# DB名（wrangler.tomlで設定した名前）
DB_NAME="ALETHEIA_CAFE_DB"

# 実行モードの確認（--remote があれば本番、なければローカル）
MODE=$1
FLAGS="--local"

if [ "$MODE" == "remote" ]; then
  FLAGS=""
  echo "⚠️  REMOTE データベースに対して実行します..."
else
  echo "🏠 LOCAL データベースに対して実行します..."
fi

echo "--- 1. Schema の適用 ---"
npx wrangler d1 execute $DB_NAME --file=./src/db/schema.sql $FLAGS -y

echo "--- 2. Master Data (Areas) のインポート ---"
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/00_master/areas.sql $FLAGS -y

echo "--- 3. Chains (Starbucks, Doutor) のインポート ---"
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/chains/starbucks.sql $FLAGS -y
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/chains/doutor.sql $FLAGS -y

echo "--- 4. Shops (Individual) のインポート ---"
npx wrangler d1 execute $DB_NAME --file=./src/db/seed/shops/koiwa.sql $FLAGS -y

echo "✅ 全ての SQL 実行が完了しました。"