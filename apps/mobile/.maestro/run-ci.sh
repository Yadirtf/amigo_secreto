#!/usr/bin/env sh
# Runs each flow on its own so a failure leaves the screen as it was: we dump
# the view hierarchy right away (CI logs are the only window into the emulator).
set -u
failed=0
for flow in 01-create-group 03-join-errors 02-full-secret-santa; do
  echo "::group::flow $flow"
  if ! maestro test "apps/mobile/.maestro/$flow.yaml" --format junit \
    --output "maestro-report-$flow.xml" --debug-output "maestro-debug/$flow"; then
    failed=1
    echo "--- view hierarchy after $flow failed ---"
    maestro hierarchy 2>/dev/null | grep -oE '"(text|accessibilityText|resource-id|hintText)" *: *"[^"]+"' | head -120
  fi
  echo "::endgroup::"
done
if [ "$failed" -ne 0 ]; then
  echo '--- wrangler.log (tail) ---'
  grep -vE '^\s*$' wrangler.log | tail -40
fi
exit "$failed"
