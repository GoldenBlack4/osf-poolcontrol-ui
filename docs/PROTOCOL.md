# OSF PoolControl .NET — web protocol notes

Observed on **PoolControl-40.NET, firmware 2.6**. Unofficial; other models/firmwares may differ.
Everything is plain HTTP on port 80 of the controller.

## Important behaviours

- **One connection at a time.** Parallel requests are dropped. Serialize everything (the app uses a queue + one retry).
- **Links are relative** on the device (`setfuw01.htm`) but absolute through the osfdevice.de relay (`/setfuw01.htm`).
- **Login is per client IP.** Commands without login are ignored / redirected to `login.htm`.
- Pages are UTF-8, sometimes with a BOM and padding spaces before the JSON.

## Reading

| Request | Content |
|---|---|
| `GET /index.jsn` | Live status (JSON, see below) |
| `GET /menheat.htm` | Nominal temperature, heater mode, solar mode |
| `GET /menfilt.htm` | Backwash and rinse durations |
| `GET /menaux.htm` | AUX mode, time limit, cycle/pulse, **interlocking** |
| `GET /meneco.htm` | ECO temperature reduction |
| `GET /menhand.htm` | Manual states: icons `t-hand-0/1` (pump), `eco40-0/1`, `t-rck-0/1` (backwash) |
| `GET /setfuhr1.htm` `/setruhr1.htm` `/seteuhr1.htm` `/setauhr1.htm` | Timer lists (filtration, backwash, ECO, AUX) |
| `GET /setfuwNN.htm` … | One timer slot form (hidden field gives its code) |
| `GET /about.htm` | Model, serial, IP, MAC, firmware |
| `GET /logfile.txt` | Event log of the current month |
| `GET /logfiles/YYYYMM.csv` | Temperatures every 10 min (`date; water; solar;`) |

Menu pages contain lines like `<div class="menu-l">Label</div><div class="menu-r">Value</div>`.

### `/index.jsn`

```json
{ "logbild":"user.svg", "wtival":"21.6", "wtsval":"34.0", "wtsque":"setpoint",
  "stival":"24.3", "atival":"&nbsp;", "modest":"aux-0.gif",
  "hzstat":"heating is off", "flstat":"standby",
  "vbld":"blank.gif", "bbld":"blank.gif", "fbld":"blank.gif", "hbld":"zhlocked.gif", "sbld":"shlocked.gif" }
```

| Key | Meaning |
|---|---|
| `wtival` / `wtsval` | Water temperature / setpoint |
| `stival` / `atival` | Solar / air temperature (may be empty) |
| `modest` | AUX button icon, `aux-1.gif` = on |
| `hzstat` / `flstat` | Heating / filtration status text |
| `vbld` `bbld` `fbld` `hbld` `sbld` | Icons: valve, backwash, filter, heater, sun — `blank` = off, `*locked` = locked |

## Writing — `GET /modify?CODE=VALUE`

| Code | Value | Effect |
|---|---|---|
| `0003` | PIN / `0000` | Login / logout |
| `0110` | `28.0` | Water setpoint (0–40 °C) |
| `0111` | `2.0` | ECO reduction (0–20 °C) |
| `0126` | `200` | Backwash duration (0–900 s) |
| `0127` | `30` | Rinse duration (0–120 s) |
| `0084` | `180` | AUX limit after manual start (0–600 min) |
| `0025` | `i` | Manual filter pump (toggle) |
| `0026` | `i` | Backwash (toggle) |
| `0027` | `i` | ECO mode (toggle) |
| `0088` | `i` | AUX output (toggle) — ignored if interlocked and pump off |
| `0130` / `0131` / `0193` | `i` | Cycle heater / solar / AUX mode |
| `0900` | `L` | Login/logout page |

### Timers

`GET /modify?<slotcode>=<tag>&ED=<day>&EH=<hh>&EM=<mm>[&AD=<day>]&AH=<hh>&AM=<mm>`

| Timer | Slots | Slot codes | Tag | Fields |
|---|---|---|---|---|
| Filtration | 15 | `0301`–`0315` | `F` | `ED EH EM AD AH AM` |
| ECO | 15 | `0316`–`0330` | `E` | `ED EH EM AD AH AM` |
| Backwash | 15 | `0331`–`0345` | `R` | `ED EH EM` (start only) |
| AUX | 10 | `0401`–`0410` | `A` | `ED EH EM AH AM` |

Days: `7` daily, `1`–`6` Monday–Saturday, `0` Sunday, `-` = clear the slot (⚠ clearing not yet verified on a device).
Only the first empty slot after the programmed ones is editable.
