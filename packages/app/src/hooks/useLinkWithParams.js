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
    (path) => `${path}${window.location.search}`,
    [searchParams] // re-create when params change
  );
}
