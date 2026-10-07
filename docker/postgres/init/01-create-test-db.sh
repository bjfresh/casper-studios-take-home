#!/bin/sh
# Runs once, on first initialisation of the data volume (the postgres image skips
# /docker-entrypoint-initdb.d when data already exists). After changing this,
# `pnpm db:down && docker volume rm <project>_postgres-data` to re-run it.
#
# A shell script rather than plain .sql so the test DB name comes from
# POSTGRES_TEST_DB instead of being repeated here.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE \"${POSTGRES_TEST_DB:-app_test}\""
