#!/usr/bin/env bash
set -euo pipefail

# Next's own --experimental-https cert covers localhost only, but the Studio previews the
# other brands on *.localhost hosts, so the cert must also carry a SAN for each brand host.

cd "$(dirname "$0")/.."

CERT_DIR='certificates'
KEY_FILE="${CERT_DIR}/localhost-key.pem"
CRT_FILE="${CERT_DIR}/localhost.pem"

BRAND_KEYS=()
while IFS= read -r key; do
  BRAND_KEYS+=("$key")
done < <(sed -n '/^export const BRAND_KEYS/,/^\] as const/p' src/brands.ts | grep -o "'[a-z]*'" | tr -d "'")

if [[ ${#BRAND_KEYS[@]} -eq 0 ]]; then
  echo 'Could not read BRAND_KEYS from src/brands.ts' >&2
  exit 1
fi

HOSTS=(localhost 127.0.0.1 ::1 '*.localhost')
for key in "${BRAND_KEYS[@]}"; do
  HOSTS+=("${key}.localhost")
done

if [[ -f "$KEY_FILE" && -f "$CRT_FILE" ]] &&
  openssl x509 -in "$CRT_FILE" -noout -checkhost wealthbriefing.localhost >/dev/null 2>&1; then
  echo "Certificates already cover *.localhost, nothing to do: ${CRT_FILE}"
  exit 0
fi

MKCERT="$(command -v mkcert || true)"
MKCERT_SOURCE='PATH'

if [[ -z "$MKCERT" ]]; then
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) ARCH='amd64' ;;
  esac

  case "$(uname -s)" in
    Darwin) CACHE_ROOT="${HOME}/Library/Caches" PLATFORM='darwin' ;;
    Linux) CACHE_ROOT="${XDG_CACHE_HOME:-${HOME}/.cache}" PLATFORM='linux' ;;
    *)
      echo "Unsupported platform: $(uname -s)" >&2
      exit 1
      ;;
  esac

  CANDIDATE="${CACHE_ROOT}/mkcert/mkcert-v1.4.4-${PLATFORM}-${ARCH}"
  if [[ -x "$CANDIDATE" ]]; then
    MKCERT="$CANDIDATE"
    MKCERT_SOURCE="Next.js download cache (${CANDIDATE})"
  fi
fi

if [[ -z "$MKCERT" ]]; then
  echo 'mkcert was not found on PATH and Next.js has not downloaded it yet.' >&2
  echo 'Install it, then run this script again:' >&2
  echo '' >&2
  echo '  brew install mkcert' >&2
  echo '' >&2
  exit 1
fi

echo "Using mkcert from ${MKCERT_SOURCE}"

mkdir -p "$CERT_DIR"

echo 'Installing the mkcert local CA. This may prompt for your password.'
if ! "$MKCERT" -install; then
  echo '' >&2
  echo 'The local CA is not trusted yet. Browsers will warn until you run this in a terminal:' >&2
  echo '' >&2
  echo "  \"${MKCERT}\" -install" >&2
  echo '' >&2
fi

"$MKCERT" -key-file "$KEY_FILE" -cert-file "$CRT_FILE" "${HOSTS[@]}"

echo "Certificates written to ${CERT_DIR}/"
