---
"@cbioportal-cell-explorer/highperformer": patch
---

Add a proactive token refresh timer. While a user is signed in, the app
calls `POST /api/auth/refresh` every 4 minutes (well before the 5-minute
access-cookie TTL) so chat requests always cross the boundary with a
fresh cookie. Also fires once on `visibilitychange` to visible, in case
the tab was suspended longer than the interval. Replaces the reactive
refresh-on-401 path for normal usage — the rotation race and clock-skew
edge cases no longer surface as `Session expired` mid-conversation.
