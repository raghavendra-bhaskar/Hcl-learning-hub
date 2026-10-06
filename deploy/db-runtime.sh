#!/bin/bash

postgres_client_version() {
  local candidate="$1"
  local version=""
  [ -x "$candidate/pg_dump" ] || return 1
  version="$($candidate/pg_dump --version 2>/dev/null | sed -E 's/.* ([0-9]+(\.[0-9]+)?).*/\1/' | head -1)"
  [ -n "$version" ] || version="0"
  printf '%s\n' "$version"
}

prefer_postgres_client_bin() {
  local candidate=""
  local best_candidate=""
  local best_version="0"
  while IFS= read -r candidate; do
    [ -x "$candidate/pg_dump" ] || continue
    local version="$(postgres_client_version "$candidate" || echo 0)"
    if [ -z "$best_candidate" ] || [ "$(printf '%s\n%s\n' "$best_version" "$version" | sort -V | tail -1)" = "$version" ]; then
      best_candidate="$candidate"
      best_version="$version"
    fi
  done < <({
    [ -n "${PG_BIN:-}" ] && [ -d "${PG_BIN:-}" ] && printf '%s\n' "$PG_BIN"
    ls -d /usr/pgsql-*/bin 2>/dev/null || true
    ls -d /usr/lib/postgresql/*/bin 2>/dev/null || true
    command -v pg_dump 2>/dev/null | xargs -r dirname
  } | awk '!seen[$0]++')

  if [ -n "$best_candidate" ]; then
    export PG_BIN="$best_candidate"
    export PATH="$PG_BIN:$PATH"
    export PG_DUMP_CMD="$PG_BIN/pg_dump"
    export PG_RESTORE_CMD="$PG_BIN/pg_restore"
    export PSQL_CMD="$PG_BIN/psql"
    return 0
  fi

  export PG_DUMP_CMD="$(command -v pg_dump 2>/dev/null || echo pg_dump)"
  export PG_RESTORE_CMD="$(command -v pg_restore 2>/dev/null || echo pg_restore)"
  export PSQL_CMD="$(command -v psql 2>/dev/null || echo psql)"
}

resolve_db_runtime() {
  DB_RUNTIME_KIND="host"
  DB_RUNTIME_ENGINE=""
  DB_RUNTIME_CONTAINER="${DB_CONTAINER_NAME:-hcl-postgres}"
  prefer_postgres_client_bin

  if [ "${EXTERNAL_DB:-false}" = true ]; then
    DB_RUNTIME_KIND="external"
    return 0
  fi

  if [ -n "${DB_CONTAINER_NAME:-}" ]; then
    for engine in "${DB_CONTAINER_ENGINE:-}" podman docker; do
      [ -n "$engine" ] || continue
      if command -v "$engine" >/dev/null 2>&1 && "$engine" ps --format '{{.Names}}' 2>/dev/null | grep -Fxq "$DB_RUNTIME_CONTAINER"; then
        DB_RUNTIME_KIND="container"
        DB_RUNTIME_ENGINE="$engine"
        return 0
      fi
    done
  fi

  for engine in podman docker; do
    if command -v "$engine" >/dev/null 2>&1 && "$engine" ps --format '{{.Names}}' 2>/dev/null | grep -Fxq "$DB_RUNTIME_CONTAINER"; then
      DB_RUNTIME_KIND="container"
      DB_RUNTIME_ENGINE="$engine"
      return 0
    fi
  done

  if [ -n "${PG_BIN:-}" ]; then export PATH="$PG_BIN:$PATH"; fi
  export PG_DUMP_CMD="${PG_DUMP_CMD:-$(command -v pg_dump 2>/dev/null || echo pg_dump)}"
  export PG_RESTORE_CMD="${PG_RESTORE_CMD:-$(command -v pg_restore 2>/dev/null || echo pg_restore)}"
  export PSQL_CMD="${PSQL_CMD:-$(command -v psql 2>/dev/null || echo psql)}"
}

_db_exec() {
  if [ "$DB_RUNTIME_KIND" = "container" ]; then
    "$DB_RUNTIME_ENGINE" exec -e PGPASSWORD="$DB_PASSWORD" "$DB_RUNTIME_CONTAINER" "$@"
  else
    PGPASSWORD="$DB_PASSWORD" "$@"
  fi
}

_db_dump() {
  local target_file="$1"
  if [ "$DB_RUNTIME_KIND" = "container" ]; then
    "$DB_RUNTIME_ENGINE" exec -e PGPASSWORD="$DB_PASSWORD" "$DB_RUNTIME_CONTAINER" \
      pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --format=custom --no-owner --no-acl \
      > "$target_file"
  else
    PGPASSWORD="$DB_PASSWORD" "$PG_DUMP_CMD" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --format=custom --no-owner --no-acl -f "$target_file"
  fi
}

_db_restore() {
  local restore_file="$1"
  local restore_log="$2"
  local magic="$3"

  if [ "$DB_RUNTIME_KIND" = "container" ]; then
    local container_tmp="/tmp/$(basename "$restore_file")"
    "$DB_RUNTIME_ENGINE" cp "$restore_file" "$DB_RUNTIME_CONTAINER:$container_tmp"
    if [ "$magic" = "PGDMP" ]; then
      set +e
      "$DB_RUNTIME_ENGINE" exec -e PGPASSWORD="$DB_PASSWORD" "$DB_RUNTIME_CONTAINER" \
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-acl "$container_tmp" \
        > "$restore_log" 2>&1
      local rc=$?
      "$DB_RUNTIME_ENGINE" exec "$DB_RUNTIME_CONTAINER" rm -f "$container_tmp" >/dev/null 2>&1 || true
      set -e
      return $rc
    fi
    set +e
    "$DB_RUNTIME_ENGINE" exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_RUNTIME_CONTAINER" \
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=off -f "$container_tmp" \
      > "$restore_log" 2>&1
    local rc=$?
    "$DB_RUNTIME_ENGINE" exec "$DB_RUNTIME_CONTAINER" rm -f "$container_tmp" >/dev/null 2>&1 || true
    set -e
    return $rc
  fi

  if [ "$magic" = "PGDMP" ]; then
    PGPASSWORD="$DB_PASSWORD" "$PG_RESTORE_CMD" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --clean --if-exists --no-owner --no-acl "$restore_file" > "$restore_log" 2>&1
  else
    PGPASSWORD="$DB_PASSWORD" "$PSQL_CMD" -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --set ON_ERROR_STOP=off -f "$restore_file" > "$restore_log" 2>&1
  fi
}

start_db_runtime() {
  resolve_db_runtime
  case "$DB_RUNTIME_KIND" in
    external)
      ok "Using an external database — not managing a local service"
      ;;
    container)
      if "$DB_RUNTIME_ENGINE" ps --format '{{.Names}}' 2>/dev/null | grep -Fxq "$DB_RUNTIME_CONTAINER"; then
        ok "PostgreSQL container is running ($DB_RUNTIME_ENGINE:$DB_RUNTIME_CONTAINER)"
      else
        info "Starting PostgreSQL container ($DB_RUNTIME_ENGINE:$DB_RUNTIME_CONTAINER)..."
        "$DB_RUNTIME_ENGINE" start "$DB_RUNTIME_CONTAINER" >/dev/null || fail "Could not start container $DB_RUNTIME_CONTAINER"
        ok "PostgreSQL container started"
      fi
      ;;
    *)
      if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet "$PG_SERVICE" 2>/dev/null; then
          ok "PostgreSQL is running ($PG_SERVICE)"
        else
          info "Starting PostgreSQL ($PG_SERVICE)..."
          sudo systemctl start "$PG_SERVICE" || fail "Could not start $PG_SERVICE"
          ok "PostgreSQL started"
        fi
      fi
      ;;
  esac
}

stop_db_runtime() {
  resolve_db_runtime
  case "$DB_RUNTIME_KIND" in
    external)
      info "External database left running"
      ;;
    container)
      info "Stopping PostgreSQL container ($DB_RUNTIME_ENGINE:$DB_RUNTIME_CONTAINER)..."
      "$DB_RUNTIME_ENGINE" stop "$DB_RUNTIME_CONTAINER" >/dev/null && ok "PostgreSQL container stopped" || warn "Could not stop container $DB_RUNTIME_CONTAINER"
      ;;
    *)
      info "Stopping PostgreSQL ($PG_SERVICE)..."
      sudo systemctl stop "$PG_SERVICE" && ok "PostgreSQL stopped" || warn "Could not stop $PG_SERVICE"
      ;;
  esac
}
