---
name: preview-on-surge
description: Put one rig page on a public surge.sh link for review, then take the lane marker off it (ADR 0003). Use for a plan's "Preview for review" and "Clean up" issues.
---

# preview-on-surge

One HTML file on `https://<name>.surge.sh`, uploaded over in place. Needs Node (`npx`) and a
surge login (`npx surge login`, done once by the human; `npx surge whoami` checks it).

Ask the human before every upload: what goes up, where, who can see it, how to undo it.

## Put it up

```sh
pnpm start                                    # rig on :8787 with .env (LANE_MARKER set)
mkdir -p ../preview                           # outside the repo: previews are never committed
curl -s localhost:8787/<path> -o ../preview/index.html
npx surge ../preview <name>.surge.sh          # reply ends with the live link
curl -s https://<name>.surge.sh/ | grep -c "$LANE_MARKER"   # 1 = the reviewer sees the marker
```

Pick a `<name>` without the marker in it, so the link stays clean after clean-up.

## Take the marker off

```sh
# set LANE_MARKER= (empty) in .env, then restart rig: tsx reads .env at start
curl -s localhost:8787/<path> -o ../preview/index.html
grep -c "no marker set" ../preview/index.html                # 1
npx surge ../preview <name>.surge.sh                          # same link, new revision
npx surge <name>.surge.sh revs                                # list revisions
npx surge <name>.surge.sh discard <rev>                       # each revision that had the marker
curl -s https://<name>.surge.sh/ | grep -c "no marker set"    # 1
```

Restore `LANE_MARKER` in `.env` afterwards.

## Take it down completely

```sh
npx surge <name>.surge.sh teardown
```
