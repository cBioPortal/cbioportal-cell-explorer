/**
 * Proactive auth token refresh.
 *
 * While the user is authenticated, this hook calls `POST /api/auth/refresh`
 * every ~4 minutes (well before the 5-minute access-cookie TTL elapses).
 * This:
 *
 *  - Avoids the reactive refresh path on the streaming chat endpoint —
 *    requests always have a fresh access cookie at boundary time, so the
 *    rotation race between parallel refreshes never fires.
 *  - Recovers from transient Keycloak hiccups on the next tick rather than
 *    surfacing as "Session expired" to the user mid-conversation.
 *  - Costs ~15 requests/hour. Each is a thin POST that returns 204.
 *
 * Also fires once on `visibilitychange` to visible — if the tab was
 * suspended for long enough that the next interval would have arrived
 * past the cookie boundary, this catches up immediately.
 */
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 240_000; // 4 minutes; access TTL is 5 minutes

export function useTokenRefresh(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      try {
        await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Best-effort. If this fails, the reactive refresh on the next real
        // request remains the fallback. Don't surface to the user.
      }
    };

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, REFRESH_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);
}
