# Rotating the JWT signing secret and device tokens

Names only below; never commit real values.

## What signs tokens

| Variable | Where it is read | Purpose |
|---|---|---|
| `JWT_SECRET` | `backend/src/config/env.ts` | Signs and verifies user tokens and drone device tokens (min. 32 characters) |
| `JWT_EXPIRES_IN` | `backend/src/config/env.ts` | Lifetime of user tokens |
| `JWT_DEVICE_TOKEN_EXPIRES_IN` | `backend/src/config/env.ts` | Lifetime of drone device tokens |

## When to rotate

- A token or `.env` file was committed, pasted or shared.
- A device token was in git history (see below).
- Someone with access to the secret leaves the project.

## Rotate the signing secret

1. Generate a new random value of at least 32 characters, for example `openssl rand -base64 48`.
2. Set `JWT_SECRET` to the new value in every place the backend runs:
   - the local `.env` used by `docker-compose.yml`;
   - the environment of any hosted backend (hosting dashboard variables);
   - CI only if a workflow needs a real secret (the test suite uses its own throwaway value in `backend/src/__tests__/setup.ts`).
3. Restart the backend. Every previously issued token stops verifying immediately.
4. Users sign in again to get a fresh user token.
5. Re-issue every device token (next section). Old device tokens are signed with the old secret and no longer work.

## Re-issue device tokens

Each drone has its own token. Either use the app (**Drones → New token**) or the API with a valid user token in `FLYON_USER_TOKEN`:

```bash
curl -X POST http://localhost:3001/api/v1/drones/<drone-id>/regenerate-token \
  -H "Authorization: Bearer $FLYON_USER_TOKEN"
```

Regenerating a drone's token invalidates its previous token, so this alone revokes a leaked device token without changing `JWT_SECRET`. Rotate the secret as well if you cannot be sure which tokens leaked.

Then update anything that holds the old token, such as the shell where you run the dev scripts:

```bash
export FLYON_DEVICE_TOKEN=<new-device-token>
export FLYON_USER_TOKEN=<new-user-token>
```

## Old commits

Early commits contained example device and user tokens in `scripts/` and `tools/radiomaster-bridge/`. They are removed at HEAD and the scripts read `FLYON_DEVICE_TOKEN` / `FLYON_USER_TOKEN` from the environment. The user tokens have expired. Treat any device token from that history as compromised and regenerate it as above. The `secret-scan` workflow and the pre-commit hook keep new ones out.
