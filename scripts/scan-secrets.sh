#!/usr/bin/env bash
# Looks for anything that resembles an API key or secret before it gets committed.
# Runs automatically as a git pre-commit hook. Run it by hand with:
#   npm run scan-secrets          (checks files staged for commit)
#   npm run scan-secrets -- --all (checks every tracked file)
# If it finds something, the commit is stopped. Remove the secret, then try again.

set -u

mode="staged"
[ "${1:-}" = "--all" ] && mode="all"

# Specific key formats, plus env-style lines (NAME_KEY=value) that have a value.
patterns=(
  'AIza[0-9A-Za-z_-]{30,}'                                  # Google / Gemini API key
  'sb_(secret|publishable)_[0-9A-Za-z_-]{10,}'              # Supabase keys
  'eyJ[0-9A-Za-z_-]{10,}\.eyJ[0-9A-Za-z_-]{10,}'            # JWTs (e.g. legacy Supabase keys)
  'gh[pousr]_[0-9A-Za-z]{30,}'                              # GitHub tokens
  'sk-[0-9A-Za-z_-]{20,}'                                   # "sk-" style secret keys
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'                      # private keys
  '^[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD)[A-Z0-9_]*=[^[:space:]#]+'  # NAME_KEY=value lines
  "['\"][0-9A-Za-z_-]{40,}['\"]"                            # long random-looking quoted strings
)

if [ "$mode" = "all" ]; then
  files=$(git ls-files)
else
  files=$(git diff --cached --name-only --diff-filter=ACMR)
fi

found=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  base=$(basename "$f")

  # Real env files must never be committed. Only the blank .env.example is allowed.
  case "$base" in
    .env.example) ;;
    .env|.env.*) echo "BLOCKED: $f is an env file and must not be committed."; found=1; continue ;;
  esac

  # Skip the npm lockfile and binary files.
  [ "$base" = "package-lock.json" ] && continue

  if [ "$mode" = "all" ]; then
    content=$(cat -- "$f" 2>/dev/null) || continue
  else
    content=$(git show ":$f" 2>/dev/null) || continue
  fi
  printf '%s' "$content" | grep -qI . 2>/dev/null || continue

  for p in "${patterns[@]}"; do
    hits=$(printf '%s\n' "$content" | grep -nE -e "$p" 2>/dev/null | cut -c1-120)
    if [ -n "$hits" ]; then
      echo "POSSIBLE SECRET in $f:"
      echo "$hits" | sed 's/^/    line /'
      found=1
    fi
  done
done <<< "$files"

if [ "$found" -ne 0 ]; then
  echo ""
  echo "Stopped: something above looks like a key. Remove it (keys belong in .env.local) and try again."
  exit 1
fi
echo "Secret scan: nothing that looks like a key."
exit 0
