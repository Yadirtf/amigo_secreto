#!/usr/bin/env sh
# Runs each flow on its own so a failure leaves the screen as it was: we dump
# the view hierarchy right away (CI logs are the only window into the emulator).
# Then a dark-mode pass, and every screenshot is printed (base64) for UX review.
set -u
failed=0
# Half the pixels at half the density: same dp layout, lighter screenshots.
adb shell wm size 540x1170
adb shell wm density 220

run() { # $1 flow, $2 theme
  echo "::group::flow $1 ($2)"
  if ! maestro test "apps/mobile/.maestro/$1.yaml" -e THEME="$2" --format junit \
    --output "maestro-report-$1-$2.xml" --debug-output "maestro-debug/$1-$2"; then
    failed=1
    echo "--- view hierarchy after $1 ($2) failed ---"
    maestro hierarchy 2>/dev/null | grep -oE '"(text|accessibilityText|resource-id|hintText)" *: *"[^"]+"' | head -120
  fi
  echo "::endgroup::"
}

for flow in 01-create-group 03-join-errors 02-full-secret-santa; do run "$flow" light; done
adb shell cmd uimode night yes
for flow in 01-create-group 03-join-errors; do run "$flow" dark; done
adb shell cmd uimode night no

echo "::group::screenshots"
find . -path '*shots*' -name '*.png' | sort | while read -r f; do
  echo "=====SHOT $(basename "$f" .png)====="
  base64 -w0 "$f"
  echo
  echo "=====END====="
done
echo "::endgroup::"

if [ "$failed" -ne 0 ]; then
  echo '--- wrangler.log (tail) ---'
  grep -vE '^\s*$' wrangler.log | grep -v 'Environment Variable' | tail -40
fi
exit "$failed"
