# OSF PoolControl UI — Home Assistant add-on

> **Unofficial.** Not affiliated with or endorsed by OSF. Use at your own risk.

## Installation

1. *Settings → Add-ons → Add-on store → ⋮ → Repositories* and add
   `https://github.com/GoldenBlack4/osf-poolcontrol-ui`
2. Install **OSF PoolControl UI**.
3. In the **Configuration** tab set:
   - **Controller address**: IP of your PoolControl .NET (controller menu *Service → network settings*)
   - **User PIN**: 4-digit PIN (needed to send commands)
4. Start the add-on and open **Pool** in the sidebar.

## Home Assistant entities

If the official **Mosquitto broker** add-on is installed, the add-on connects to it automatically and a
device **Pool** appears (MQTT discovery) with water/solar temperature, filtration and heating status,
water setpoint, manual pump, light (AUX), ECO mode and a backwash button.

## Notes

- The light (AUX output) is usually interlocked with the filter pump. With *Light starts the pump*
  enabled, switching the light on starts the pump first.
- Tested on PoolControl-40.NET, firmware 2.6. Other models may differ — please open an issue with the
  output of `/api/debug?page=/index.jsn` and the menu pages.
- The optional port 8080 gives access without Home Assistant. Set a **Web UI password** if you open it.
