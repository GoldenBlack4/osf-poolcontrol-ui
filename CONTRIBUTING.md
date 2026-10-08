# Contributing

Thanks for helping! The most valuable contributions are **reports from other controller models and firmwares**.

## Supporting a new model

1. Run the app (Docker or add-on) pointed at your controller.
2. Collect the pages with the command in the [new model issue template](.github/ISSUE_TEMPLATE/new_model.md).
   It only reads pages. Check the output before posting (it should not contain your PIN).
3. Open an issue with the file and your model/firmware (*Service → about*).

Then the mock controller (`app/mock/mock-osf.js`) can be extended with your responses, so the change is testable
without your hardware.

## Code layout

| Path | Role |
|---|---|
| `app/osf.js` | Controller client: reading, parsing, commands, timers, login, request queue |
| `app/server.js` | HTTP API, server-sent events, static files |
| `app/mqtt.js` | MQTT bridge + Home Assistant discovery |
| `app/config.js` | Env / add-on options, Supervisor MQTT discovery |
| `app/public/` | Web UI (vanilla HTML/CSS/JS, no build step), `i18n.js` holds all texts |
| `app/mock/` | Fake controller used for development and tests |
| `poolcontrol/` | Home Assistant add-on definition |

## Rules

- Never send a `/modify` request you do not understand to a real controller.
- `npm test` must pass (`cd app && npm test`).
- New UI texts go into `public/i18n.js` for **en, fr and de**.
- Keep it dependency-light: no front-end framework, no build step.

## Releasing

1. Bump `version` in `poolcontrol/config.yaml` and `app/package.json`, update both CHANGELOGs.
2. `git tag v1.2.3 && git push --tags` — GitHub Actions builds and publishes the multi-arch image.
