import { useEffect } from 'react'
import { Layout } from 'antd'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProfilePage } from '@cbioportal-cell-explorer/profiler'
import Home from './pages/Home'
import LandingTheme from './components/LandingTheme'
import Collection from './pages/Collection'
import View from './pages/View'
import ZarrView from './pages/ZarrView'
import useAppStore from './store/useAppStore'
import { installMockCatalog, MOCK_CATALOG_ENABLED } from './utils/mockCatalog'
import { useTokenRefresh } from './hooks/useTokenRefresh'

const { Content } = Layout

const ENABLE_PROFILER = import.meta.env.VITE_ENABLE_PROFILER === 'true'
const ENABLE_ZARR_VIEW = import.meta.env.VITE_ENABLE_ZARR_VIEW === 'true'

function App() {
  const probeBackend = useAppStore((s) => s.probeBackend)
  const checkAuth = useAppStore((s) => s.checkAuth)
  const fetchCatalog = useAppStore((s) => s.fetchCatalog)
  const fetchCollections = useAppStore((s) => s.fetchCollections)
  const user = useAppStore((s) => s.user)

  useEffect(() => {
    // Dev fixture, when enabled, stands in for the backend entirely — probing
    // would only overwrite it with an empty catalog.
    if (installMockCatalog()) return

    probeBackend().then(() => {
      const { backendInfo } = useAppStore.getState()
      if (backendInfo) {
        fetchCatalog()
        // Collections feed the overview figure. This used to ride along with
        // the chips row on the landing page; that row is gone, so the fetch
        // belongs here with the rest of the bootstrap.
        fetchCollections()
      }
      if (backendInfo?.auth_enabled) checkAuth()
    })
  }, [probeBackend, checkAuth, fetchCatalog, fetchCollections])

  // Re-fetch catalog when auth state changes
  useEffect(() => {
    if (MOCK_CATALOG_ENABLED) return
    const { backendInfo } = useAppStore.getState()
    if (backendInfo) {
      fetchCatalog()
      fetchCollections()
    }
  }, [user, fetchCatalog, fetchCollections])

  // Keep the access cookie fresh while signed in. Sidesteps the rotation
  // race that surfaces as 'Session expired' on long-lived chat streams.
  useTokenRefresh(user !== null)
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Home owns its own full-bleed layout — the header band spans the
            viewport, so it must not sit inside a width-capped Content. */}
        <Route path="/" element={<LandingTheme><Home /></LandingTheme>} />
        {/* Like Home, Collection owns its own full-bleed layout. */}
        <Route path="/collections/:slug" element={<LandingTheme><Collection /></LandingTheme>} />
        <Route path="/view" element={<View />} />
        {ENABLE_ZARR_VIEW && (
          <Route path="/zarr_view" element={<ZarrView />} />
        )}
        {ENABLE_PROFILER && (
          <Route path="/profile" element={
            <Layout style={{ minHeight: '100vh', background: '#fff' }}>
              <Content style={{ width: 'min(100% - 96px, 1440px)', margin: '0 auto', padding: '32px 0', overflow: 'auto' }}>
                <ProfilePage />
              </Content>
            </Layout>
          } />
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App
