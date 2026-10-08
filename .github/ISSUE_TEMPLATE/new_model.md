---
name: Support for another OSF model / firmware
about: Help add support for your controller
labels: new-model
---

**Model and firmware** (Service → about):

Please attach the output of these commands (replace the address of your app).
They only **read** pages; no PIN or personal data is included, but check before posting.

```bash
for p in /index.jsn /menu.htm /menheat.htm /menfilt.htm /menaux.htm /meneco.htm /menhand.htm /setfuhr1.htm /setfuw01.htm; do
  echo "===== $p"; curl -s "http://APP_ADDRESS:8080/api/debug?page=$p"
done > osf-pages.txt
```
