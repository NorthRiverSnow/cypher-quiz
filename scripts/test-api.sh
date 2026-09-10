#!/usr/bin/env bash
# api のテストをコンテナの中で実行し、結果に関わらず片付ける。
#
#   bash scripts/test-api.sh
#   bash scripts/test-api.sh ./node_modules/.bin/vp -C packages/api run typecheck
set -uo pipefail

# why: down -v は project の named volume を全て消す。dev の neo4j-data まで消えるので、
# 対象のサービスだけを名指しで消す（--volumes は匿名 volume だけを消す）
cleanup() {
  docker compose rm --stop --force --volumes test seed-test neo4j-test >/dev/null 2>&1
}
trap cleanup EXIT

docker compose --profile test run --rm test "$@"
