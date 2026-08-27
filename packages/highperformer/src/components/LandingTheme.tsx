import { ConfigProvider } from 'antd'

/**
 * antd defaults to a 6px corner; about.cbioportal.org and curation.cbioportal.org
 * both set shadcn's `--radius: .5rem`. Matching it exactly reads as deliberate,
 * where a two-pixel miss reads as accident.
 *
 * Scoped to the catalogue pages rather than set in `main.tsx`, so the viewer's
 * chrome is not restyled as a side effect of a landing-page decision.
 */
export default function LandingTheme({ children }: { children: React.ReactNode }) {
  return (
    // antd derives LG and SM radii from `borderRadius` rather than reusing it,
    // so a large input lands on 10px unless all three are pinned.
    <ConfigProvider
      theme={{ token: { borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 8, fontSize: 15 } }}
    >
      {children}
    </ConfigProvider>
  )
}
