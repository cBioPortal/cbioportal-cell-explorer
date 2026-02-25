import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * Returns a function that builds a path preserving current query params.
 * Usage: const linkTo = useLinkWithParams();
 *        <Link to={linkTo("/load")}>
 */
export default function useLinkWithParams() {
  const [searchParams] = useSearchParams();
  return useCallback(
    (path) => {
      const qs = searchParams.toString();
      return qs ? `${path}?${qs}` : path;
    },
    [searchParams]
  );
}
