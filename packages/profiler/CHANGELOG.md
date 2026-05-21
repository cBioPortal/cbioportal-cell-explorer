# @cbioportal-cell-explorer/profiler

## 0.2.0

### Minor Changes

- [#257](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/257) [`07e97e5`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/07e97e53d382aec2d34d67985b2d9923a2b59a5c) Thanks [@hweej](https://github.com/hweej)! - Add a close (X) button to the `ProfileBar` action group. Clicking it hides
  the bar for the current session — state is local to the component and
  resets on page reload, so the bar reappears automatically next time
  without a separate "show profiler" affordance. Helpful during dev when
  the bar overlaps UI controls.

- [#258](https://github.com/cBioPortal/cbioportal-cell-explorer/pull/258) [`72a55cb`](https://github.com/cBioPortal/cbioportal-cell-explorer/commit/72a55cb1940290feafc89a9dd54df9e2d6004287) Thanks [@hweej](https://github.com/hweej)! - Profile bar close button now fully removes the bar from the layout
  instead of just hiding it. ProfileBar gained an `onHide` callback prop;
  when invoked, the parent unmounts ProfileBar AND drops the reserved
  bottom padding, so page content reflows into the freed area.
  Behaviour is still session-only — refresh brings the bar back.
