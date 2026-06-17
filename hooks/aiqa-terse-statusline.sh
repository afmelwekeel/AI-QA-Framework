#!/usr/bin/env bash
# AI-QA-Framework — terse mode statusline badge (macOS / Linux / Git Bash)
# Outputs: [AIQA] or [AIQA:ULTRA] etc. in orange, with optional savings suffix

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
FLAG="$CLAUDE_DIR/.aiqa-terse-active"

[ -f "$FLAG" ] || exit 0

# Security: refuse symlinks and oversized files
if [ -L "$FLAG" ]; then exit 0; fi
size=$(wc -c < "$FLAG" 2>/dev/null) || exit 0
[ "$size" -le 64 ] || exit 0

MODE=$(head -c 64 "$FLAG" 2>/dev/null | tr -d '\n\r' | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')

case "$MODE" in
  off|"") exit 0 ;;
  full)   LABEL="AIQA" ;;
  lite)   LABEL="AIQA:LITE" ;;
  ultra)  LABEL="AIQA:ULTRA" ;;
  *)      exit 0 ;;
esac

# Orange color: \e[38;5;172m
printf '\e[38;5;172m[%s]\e[0m' "$LABEL"

# Savings suffix (opt-out: export AIQA_STATUSLINE_SAVINGS=0)
if [ "${AIQA_STATUSLINE_SAVINGS}" != "0" ]; then
  SUFFIX_FILE="$CLAUDE_DIR/.aiqa-terse-statusline-suffix"
  if [ -f "$SUFFIX_FILE" ] && [ ! -L "$SUFFIX_FILE" ]; then
    sz=$(wc -c < "$SUFFIX_FILE" 2>/dev/null) || sz=999
    if [ "$sz" -le 64 ]; then
      SUFFIX=$(head -c 64 "$SUFFIX_FILE" 2>/dev/null | tr -cd '[:print:]')
      [ -n "$SUFFIX" ] && printf ' \e[38;5;172m%s\e[0m' "$SUFFIX"
    fi
  fi
fi
