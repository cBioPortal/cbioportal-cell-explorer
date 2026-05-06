import { useEffect, useState } from "react";
import { chat } from "../api";
import { HttpError, type ContextResponse } from "./types";

export type UseChatContextResult = {
  data: ContextResponse | undefined;
  error: HttpError | Error | undefined;
  loading: boolean;
};

export function useChatContext(slug: string): UseChatContextResult {
  const [data, setData] = useState<ContextResponse | undefined>(undefined);
  const [error, setError] = useState<HttpError | Error | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError(undefined);
    setLoading(true);
    chat
      .getContext(slug, controller.signal)
      .then((d) => {
        if (!controller.signal.aborted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => controller.abort();
  }, [slug]);

  return { data, error, loading };
}
