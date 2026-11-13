# Using Tokens with the Dev Scripts

The telemetry scripts in `scripts/` and the RadioMaster bridge in `tools/radiomaster-bridge/` read their tokens from environment variables. Tokens are never stored in the scripts. Don't paste a token into a script or commit one.

| Variable | Used by | What it is |
|---|---|---|
| `FLYON_DEVICE_TOKEN` | `scripts/*.py`, `scripts/*.sh`, `scripts/telemetry/*` | A drone's device token (authenticates `POST /api/v1/telemetry`) |
| `FLYON_USER_TOKEN` | `tools/radiomaster-bridge/*` | Your user JWT (authenticates user API calls such as `/api/v1/remotes`) |

If a variable is missing, the script stops right away and tells you how to set it.

## Device token (`FLYON_DEVICE_TOKEN`)

1. Open the FLYON app → **Drones**.
2. Click **Copy** next to the drone's device token, or open the token dialog.

   Or use the API, with your user JWT:

   ```bash
   curl -X POST http://localhost:3001/api/v1/drones/<drone-id>/regenerate-token \
     -H "Authorization: Bearer $FLYON_USER_TOKEN"
   # → {"device_token": "..."}
   ```

   Regenerating the token invalidates the drone's previous token.

3. Export it in your shell, then run the scripts:

   ```bash
   export FLYON_DEVICE_TOKEN=<paste-device-token>
   python3 scripts/test_live_flight.py
   ./scripts/telemetry/test_telemetry.sh
   ```

`simulate_15min_flight.py` also accepts the token as its first argument, which takes priority over the env var.

## User token (`FLYON_USER_TOKEN`)

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"..."}'
# → {"user": {...}, "token": "..."}

export FLYON_USER_TOKEN=<paste-token>
cd tools/radiomaster-bridge && ./run-with-port.sh
```

User tokens expire after `JWT_EXPIRES_IN` (7 days by default), so log in again when the bridge starts getting `401` responses.

## Keeping tokens out of git

- Put `export` lines in your shell profile or in an untracked file such as `.env.local`. Never put them in a tracked script.
- CI runs a [gitleaks](https://github.com/gitleaks/gitleaks) scan on every push and pull request (`.github/workflows/secret-scan.yml`).
- To catch a token before it is committed, enable the pre-commit hook described in the main [README](../README.md#secret-scanning).
