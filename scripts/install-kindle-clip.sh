#!/usr/bin/env sh
set -eu

REPO="${KINDLE_CLIP_REPO:-}"
VERSION="${KINDLE_CLIP_VERSION:-latest}"
INSTALL_DIR="${KINDLE_CLIP_INSTALL_DIR:-$HOME/.local/bin}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

if [ -z "$REPO" ]; then
  echo "Set KINDLE_CLIP_REPO=owner/repo before running this installer." >&2
  exit 1
fi

case "$ARCH" in
  x86_64|amd64) ARCH=amd64 ;;
  arm64|aarch64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

case "$OS" in
  darwin|linux) : ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac

if [ "$VERSION" = "latest" ]; then
  VERSION="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p' | head -n 1)"
fi

ARCHIVE="kindle-clip_${VERSION}_${OS}_${ARCH}.tar.gz"
URL="https://github.com/$REPO/releases/download/$VERSION/$ARCHIVE"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

mkdir -p "$INSTALL_DIR"
curl -fsSL "$URL" -o "$TMP_DIR/$ARCHIVE"
tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"
install "$TMP_DIR/kindle-clip" "$INSTALL_DIR/kindle-clip"

echo "Installed kindle-clip to $INSTALL_DIR/kindle-clip"
echo "Make sure $INSTALL_DIR is on your PATH."
