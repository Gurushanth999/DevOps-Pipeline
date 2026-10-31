#!/usr/bin/env bash
set -Eeuo pipefail


OWNER="${1:?Missing GHCR owner}"
COMMIT_SHA="${2:?Missing commit SHA}"


cd "$HOME/DevOps-Pipeline"


NEW_BACKEND="ghcr.io/$OWNER/minishop-backend:$COMMIT_SHA"
NEW_FRONTEND="ghcr.io/$OWNER/minishop-frontend:$COMMIT_SHA"


OLD_BACKEND="$(sudo docker inspect -f '{{.Config.Image}}' minishop-backend)"
OLD_FRONTEND="$(sudo docker inspect -f '{{.Config.Image}}' minishop-frontend)"


echo "Previous backend: $OLD_BACKEND"
echo "Previous frontend: $OLD_FRONTEND"
echo "Target backend: $NEW_BACKEND"
echo "Target frontend: $NEW_FRONTEND"




verify_deployment() {
  sudo docker compose ps || return 1

  local path
  for path in /api/health /api/db-health /api/products /; do
    echo "Verifying $path"

    curl -fsS \
      --retry 10 \
      --retry-delay 3 \
      --retry-connrefused \
      --max-time 10 \
      "http://127.0.0.1$path" \
      -o /dev/null || return 1
  done

  python3 - <<'PY' || return 1
import json
import urllib.request

base = "http://127.0.0.1"

def get(path):
    with urllib.request.urlopen(base + path, timeout=10) as response:
        return json.load(response)

health = get("/api/health")
database = get("/api/db-health")
products = get("/api/products")

assert health.get("status") == "ok", health
assert database.get("status") == "ok", database
assert database.get("database") == "connected", database
assert products.get("status") == "ok", products
assert products.get("count") == 8, products
assert isinstance(products.get("products"), list), products
assert len(products["products"]) == 8, products

print("Application, database and catalogue verification passed.")
PY
}



verify_images() {
  local actual_backend actual_frontend

  actual_backend="$(sudo docker inspect -f '{{.Config.Image}}' minishop-backend)" || return 1
  actual_frontend="$(sudo docker inspect -f '{{.Config.Image}}' minishop-frontend)" || return 1

  test "$actual_backend" = "$BACKEND_IMAGE" || return 1
  test "$actual_frontend" = "$FRONTEND_IMAGE" || return 1
}



persist_images() {
  python3 - "$1" "$2" <<'PY'
import os
import sys
import tempfile

path = ".env"
replacements = {
    "BACKEND_IMAGE": sys.argv[1],
    "FRONTEND_IMAGE": sys.argv[2],
}

with open(path, encoding="utf-8") as file:
    lines = file.readlines()

lines = [
    line for line in lines
    if line.split("=", 1)[0].strip() not in replacements
]

for key, value in replacements.items():
    lines.append(f"{key}={value}\n")

fd, temp_path = tempfile.mkstemp(dir=".", prefix=".env.")

try:
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as file:
        file.writelines(lines)
    os.replace(temp_path, path)
finally:
    if os.path.exists(temp_path):
        os.unlink(temp_path)
PY
}



deploy() {
  export BACKEND_IMAGE="$NEW_BACKEND"
  export FRONTEND_IMAGE="$NEW_FRONTEND"

  echo "Pulling release images..."
  sudo --preserve-env=BACKEND_IMAGE,FRONTEND_IMAGE \
    docker compose pull backend frontend || return 1

  echo "Starting release..."
  sudo --preserve-env=BACKEND_IMAGE,FRONTEND_IMAGE \
    docker compose up -d --no-build --wait || return 1

  verify_deployment || return 1
  verify_images || return 1

  persist_images "$NEW_BACKEND" "$NEW_FRONTEND" || return 1

  echo "DEPLOYMENT SUCCESS: $COMMIT_SHA"
}



rollback() {
  echo "Starting automatic application rollback..."

  export BACKEND_IMAGE="$OLD_BACKEND"
  export FRONTEND_IMAGE="$OLD_FRONTEND"

  sudo --preserve-env=BACKEND_IMAGE,FRONTEND_IMAGE \
    docker compose up -d --no-build --wait || return 1

  verify_deployment || return 1
  verify_images || return 1

  persist_images "$OLD_BACKEND" "$OLD_FRONTEND" || return 1

  echo "ROLLBACK SUCCESS: Previous images restored."
}



if deploy; then
  exit 0
else
  echo "DEPLOYMENT FAILURE: $COMMIT_SHA"

  if rollback; then
    echo "Previous application version recovered."
  else
    echo "CRITICAL: Automatic rollback failed."
  fi

  exit 1
fi
