#!/bin/sh
# A stable local code-signing identity so macOS Accessibility stays granted across rebuilds.
# Ad-hoc signatures are tied to each build's cdhash, so a later package never matches the switch.
set -eu

NAME="AutoClicker Pro Local Signing"

if security find-certificate -c "$NAME" >/dev/null; then
  exit 0
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
  -keyout "$TMP/key.pem" -out "$TMP/cert.pem" \
  -subj "/CN=$NAME" \
  -addext "extendedKeyUsage=codeSigning" \
  -addext "keyUsage=digitalSignature"

openssl pkcs12 -export -out "$TMP/cert.p12" -inkey "$TMP/key.pem" -in "$TMP/cert.pem" -passout pass:autoclicker

security import "$TMP/cert.p12" \
  -k "$HOME/Library/Keychains/login.keychain-db" \
  -P autoclicker \
  -T /usr/bin/codesign \
  -T /usr/bin/security

# Best-effort. Import already trusts codesign; this fails when the login password is unknown.
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" \
  "$HOME/Library/Keychains/login.keychain-db" >/dev/null 2>&1 || true
