/**
 * The mark from the official cBioPortal 2024 lockup, isolated from its wordmark.
 *
 * Traced from `design/cbioportal-logo-2024.zip` (also shipped whole at
 * `public/brand/cbioportal-logo-2024.svg`). Paths are verbatim; only the CSS
 * classes of the source file are resolved to their literal fills, and the
 * viewBox is cropped to the mark's own bounding box so it sizes predictably
 * next to type. Brand colors are unaltered.
 *
 * Inlined rather than loaded from `public/` so it paints with the rest of the
 * header instead of arriving a request later.
 */
export default function CBioPortalMark({
  size = 40,
  title = 'cBioPortal',
}: {
  size?: number
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="20.1 13.41 79.7 79.7"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <path
        d="M25.16,27.26c0-4.75,3.86-8.61,8.61-8.61h45.32v-5.07h-45.32c-7.54,0-13.67,6.13-13.67,13.67v24.91h5.07v-24.91Z"
        fill="#c0c0c3"
      />
      <path
        d="M94.73,79.25c0,4.75-3.86,8.61-8.61,8.61h-45.49v5.07h45.49c7.54,0,13.67-6.13,13.67-13.68v-24.54h-5.07v24.54Z"
        fill="#c0c0c3"
      />
      <rect x="61.13" y="34.08" width="17.96" height="18.09" fill="#1c7a43" />
      <rect x="40.62" y="54.71" width="17.96" height="18.08" fill="#1c7a43" />
      <rect x="20.1" y="75.35" width="17.96" height="17.58" fill="#3986c7" />
      <path d="M81.64,52.16c9.92,0,17.96-8.1,17.96-18.09h-17.96v18.09Z" fill="#3986c7" />
      <path d="M61.13,72.79c9.92,0,17.96-8.1,17.96-18.08h-17.96v18.08Z" fill="#cd1c3d" />
      <path d="M58.57,34.08c-9.92,0-17.96,8.1-17.96,18.09h17.96v-18.09Z" fill="#cd1c3d" />
      <path d="M38.05,54.71c-9.92,0-17.96,8.09-17.96,18.08h17.96s0-18.08,0-18.08Z" fill="#3986c7" />
      <rect x="81.65" y="13.58" width="18.15" height="17.94" fill="#3986c7" />
    </svg>
  )
}
