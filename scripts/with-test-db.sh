#!/usr/bin/env bash
# テスト用 DB を立て、渡されたコマンドを実行し、結果に関わらず片付ける。
#
#   bash scripts/with-test-db.sh vp -C packages/api run test
set -uo pipefail

# why: down -v は project の named volume を全て消す。dev の neo4j-data まで消えるので、
# 対象のサービスだけを名指しで消す（--volumes は匿名 volume だけを消す）
cleanup() {
  docker compose rm --stop --force --volumes neo4j-test seed-test >/dev/null 2>&1
}
trap cleanup EXIT

set -e
docker compose --profile test up --detach --wait neo4j-test
docker compose run --rm seed-test
set +e

"$@"
