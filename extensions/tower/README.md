# Tower

Open the Tower planning app at <https://tower.wecourts.com/> as a full Ghostex
view. The extension ships no code of its own: it declares the site's URL and
Ghostex loads it directly, so you always get the current version of Tower.

## Sign-in

Extension views share Ghostex's persistent cookie store, so signing in once
keeps you signed in — across closing the view and across Ghostex restarts.

## Notes

Tower sits behind Cloudflare, so the first load after a while may show a brief
verification check before the app appears.

## Permissions

- `network`: the view loads Tower and its API over the network.
