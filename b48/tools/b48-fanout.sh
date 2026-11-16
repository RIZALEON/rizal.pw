#!/bin/bash
# b48-fanout.sh — post-build stamp for RDRGN / DragonSkull build 48
#
# Called from the DragonSkull scheme post-action (or manually after a
# successful xcodebuild). Default is a no-op.
#
# Enable with:  B48_FANOUT=1
#
# This script:
#   - writes an UNSIGNED self-update feed entry (version 1.0.6.0, build 48,
#     sha256 of the built product) into a local fanout staging folder
#   - copies the web-bundle stamp (ds-webversion.json) into RKLOWD
#
# This script does NOT:
#   - sign, codesign, rlab-sign, or touch Keychain / seeds / wallets
#   - git push, or write to RIZALEON/RZL-EGG main (the live appcast the
#     apps poll at raw.githubusercontent.com/.../ios-web/appcast.json)
#   - install to any device, or run devicectl / adb / xcrun devicectl
#     device install
#
# Apps refuse unsigned entries (SelfUpdate.parseManifest). Publishing a
# signed entry to the live feed needs Charles's own Face ID sign + a
# separate GO. Device installs are a separate manual command, also GO.
set -euo pipefail

log() { printf 'b48-fanout: %s\n' "$*"; }

if [ "${B48_FANOUT:-}" != "1" ]; then
  log "no-op (B48_FANOUT is not 1). Not signing, not installing, not publishing."
  exit 0
fi

# Refuse known dangerous / out-of-scope actions even if someone wraps us.
case "${1:-}" in
  sign|codesign|install|devicectl|adb|publish|push|mint) log "refused: $1"; exit 2 ;;
esac

STAMP="$(date '+%Y-%m-%d %H:%M:%S %Z')"
MARKETING_VERSION="${MARKETING_VERSION:-1.0.6.0}"
CURRENT_PROJECT_VERSION="${CURRENT_PROJECT_VERSION:-48}"

HOME_DIR="${HOME:-/Users/rizalsystem}"
RKLOWD_CANON="${HOME_DIR}/R/ЯLAB/RKLOWD"
FANOUT_RD="${RKLOWD_CANON}/RDRAGON/B48-PACKAGE-20261115/fanout"
FANOUT_RB="${RKLOWD_CANON}/RBOT/B48-PACKAGE-20261115/fanout"
# Staging only. Never the live GitHub raw appcast.
STAGE_FEED="${FANOUT_RD}/appcast-b48-UNSIGNED.json"
WEB_STAMP_DST="${FANOUT_RD}/ds-webversion.json"
PRODUCT_STAMP="${FANOUT_RD}/product-stamp-b48.json"

mkdir -p "${FANOUT_RD}"
mkdir -p "${FANOUT_RB}" 2>/dev/null || true

# Locate the built product (Xcode sets these in a scheme post-action).
PRODUCT=""
if [ -n "${TARGET_BUILD_DIR:-}" ] && [ -n "${FULL_PRODUCT_NAME:-}" ]; then
  if [ -e "${TARGET_BUILD_DIR}/${FULL_PRODUCT_NAME}" ]; then
    PRODUCT="${TARGET_BUILD_DIR}/${FULL_PRODUCT_NAME}"
  fi
fi
if [ -z "${PRODUCT}" ] && [ -n "${BUILT_PRODUCTS_DIR:-}" ]; then
  if [ -d "${BUILT_PRODUCTS_DIR}/DRAGON SKULL.app" ]; then
    PRODUCT="${BUILT_PRODUCTS_DIR}/DRAGON SKULL.app"
  fi
fi

WEB_SRC=""
if [ -n "${SRCROOT:-}" ] && [ -f "${SRCROOT}/App/web/ds-webversion.json" ]; then
  WEB_SRC="${SRCROOT}/App/web/ds-webversion.json"
elif [ -n "${PROJECT_DIR:-}" ] && [ -f "${PROJECT_DIR}/App/web/ds-webversion.json" ]; then
  WEB_SRC="${PROJECT_DIR}/App/web/ds-webversion.json"
fi

PRODUCT_SHA=""
PRODUCT_SIZE=""
PRODUCT_PATH=""
if [ -n "${PRODUCT}" ] && [ -e "${PRODUCT}" ]; then
  PRODUCT_PATH="${PRODUCT}"
  if [ -f "${PRODUCT}" ]; then
    PRODUCT_SHA="$(/usr/bin/shasum -a 256 "${PRODUCT}" | awk '{print $1}')"
    PRODUCT_SIZE="$(/usr/bin/stat -f '%z' "${PRODUCT}")"
  else
    # Hash the main executable inside the .app; do not zip the app (disk).
    EXEC="${PRODUCT}/DRAGON SKULL"
    if [ ! -f "${EXEC}" ]; then
      EXEC="$(/usr/bin/find "${PRODUCT}" -maxdepth 1 -type f -perm +111 2>/dev/null | /usr/bin/head -n 1)"
    fi
    if [ -n "${EXEC}" ] && [ -f "${EXEC}" ]; then
      PRODUCT_SHA="$(/usr/bin/shasum -a 256 "${EXEC}" | awk '{print $1}')"
      PRODUCT_SIZE="$(/usr/bin/stat -f '%z' "${EXEC}")"
      PRODUCT_PATH="${EXEC}"
    else
      log "product exists but no executable found at ${PRODUCT}"
    fi
  fi
else
  log "no built product in TARGET_BUILD_DIR/BUILT_PRODUCTS_DIR; sha256 will be empty (recorded as —)."
fi

if [ -z "${PRODUCT_SHA}" ]; then PRODUCT_SHA="—"; fi
if [ -z "${PRODUCT_SIZE}" ]; then PRODUCT_SIZE="—"; fi
if [ -z "${PRODUCT_PATH}" ]; then PRODUCT_PATH="—"; fi

if [ -n "${WEB_SRC}" ]; then
  /bin/cp -f "${WEB_SRC}" "${WEB_STAMP_DST}"
  if [ -d "${FANOUT_RB}" ]; then
    /bin/cp -f "${WEB_SRC}" "${FANOUT_RB}/ds-webversion.json" 2>/dev/null || true
  fi
  log "copied web stamp from ${WEB_SRC}"
else
  log "ds-webversion.json not found in SRCROOT; web stamp not copied."
fi

WEB_VER="unknown"
if [ -f "${WEB_STAMP_DST}" ]; then
  WEB_VER="$(/usr/bin/python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("version","unknown"))' "${WEB_STAMP_DST}" 2>/dev/null || echo unknown)"
fi

# Pass values via environment to Python (bash 3.2 has no ${var@Q}).
export B48_STAGE_FEED="$STAGE_FEED"
export B48_PRODUCT_STAMP="$PRODUCT_STAMP"
export B48_FANOUT_RB="$FANOUT_RB"
export B48_STAMP="$STAMP"
export B48_MARKETING_VERSION="$MARKETING_VERSION"
export B48_CURRENT_PROJECT_VERSION="$CURRENT_PROJECT_VERSION"
export B48_PRODUCT_SHA="$PRODUCT_SHA"
export B48_PRODUCT_SIZE="$PRODUCT_SIZE"
export B48_PRODUCT_PATH="$PRODUCT_PATH"
export B48_WEB_VER="$WEB_VER"

/usr/bin/python3 - << 'PY'
import json, os
stage = os.environ["B48_STAGE_FEED"]
stamp_path = os.environ["B48_PRODUCT_STAMP"]
rb = os.environ.get("B48_FANOUT_RB", "")
entry = {
    "format": "rlab-appcast.v1",
    "signed": False,
    "published": False,
    "note": "UNSIGNED staging entry written by b48-fanout.sh. Apps will refuse this until Charles signs with Face ID (ed25519 keyId e5833fdfbbfe) and a separate GO publishes it to RIZALEON/RZL-EGG main dragon-skull/ios-web/appcast.json. This file is NOT the live feed.",
    "keyId": "e5833fdfbbfe",
    "updated": os.environ["B48_STAMP"],
    "native": {
        "marketing_version": os.environ["B48_MARKETING_VERSION"],
        "build": os.environ["B48_CURRENT_PROJECT_VERSION"],
        "sha256": os.environ["B48_PRODUCT_SHA"],
        "size": os.environ["B48_PRODUCT_SIZE"],
        "product_path": os.environ["B48_PRODUCT_PATH"],
    },
    "apps": {
        "ios-web": {
            "kind": "web",
            "id": "info.rizal.dragonskull",
            "version": os.environ["B48_WEB_VER"],
            "name": "",
            "size": -1,
            "sha256": "",
            "url": "",
            "ed25519": "",
            "signed": False,
            "published": False,
            "keyId": "e5833fdfbbfe",
            "notes": "UNSIGNED. Native product stamp is 1.0.6.0 build 48. Do not offer to devices until signed.",
        }
    },
    "signaturesPending": ["ios-web", "native-1.0.6.0-48"],
}
os.makedirs(os.path.dirname(stage), exist_ok=True)
with open(stage, "w") as f:
    json.dump(entry, f, indent=1)
    f.write("\n")
product = {
    "marketing_version": os.environ["B48_MARKETING_VERSION"],
    "build": os.environ["B48_CURRENT_PROJECT_VERSION"],
    "sha256": os.environ["B48_PRODUCT_SHA"],
    "size": os.environ["B48_PRODUCT_SIZE"],
    "product_path": os.environ["B48_PRODUCT_PATH"],
    "web_version": os.environ["B48_WEB_VER"],
    "signed": False,
    "published": False,
    "installed": False,
    "stamped_at": os.environ["B48_STAMP"],
    "feed_live": "https://raw.githubusercontent.com/RIZALEON/RZL-EGG/main/dragon-skull/ios-web/appcast.json",
    "feed_staging": stage,
}
with open(stamp_path, "w") as f:
    json.dump(product, f, indent=1)
    f.write("\n")
if rb and os.path.isdir(os.path.dirname(rb)):
    os.makedirs(rb, exist_ok=True)
    for src, name in ((stage, "appcast-b48-UNSIGNED.json"), (stamp_path, "product-stamp-b48.json")):
        dst = os.path.join(rb, name)
        if os.path.abspath(dst) != os.path.abspath(src):
            with open(src) as s, open(dst, "w") as d:
                d.write(s.read())
print("wrote", stage)
print("wrote", stamp_path)
PY

log "UNSIGNED staging feed written. Live RZL-EGG appcast was not changed."
log "Not signed, not published, not installed. Device install stays a manual GO command."
exit 0
