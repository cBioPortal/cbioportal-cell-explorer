import { useEffect } from 'react'
import { Layout } from 'antd'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProfilePage } from '@cbioportal-cell-explorer/profiler'
import Home from './pages/Home'
import View from './pages/View'
import ZarrView from './pages/ZarrView'
import useAppStore from './store/useAppStore'

const { Content } = Layout

const ENABLE_PROFILER = import.meta.env.VITE_ENABLE_PROFILER === 'true'
const ENABLE_ZARR_VIEW = import.meta.env.VITE_ENABLE_ZARR_VIEW === 'true'

function App() {
  const probeBackend = useAppStore((s) => s.probeBackend)
  const checkAuth = useAppStore((s) => s.checkAuth)
  const fetchCatalog = useAppStore((s) => s.fetchCatalog)
  const user = useAppStore((s) => s.user)

  useEffect(() => {
    probeBackend().then(() => {
      const { backendInfo } = useAppStore.getState()
      if (backendInfo) fetchCatalog()
      if (backendInfo?.auth_enabled) checkAuth()
    })
  }, [probeBackend, checkAuth, fetchCatalog])

  // Re-fetch catalog when auth state changes
  useEffect(() => {
    const { backendInfo } = useAppStore.getState()
    if (backendInfo) fetchCatalog()
  }, [user, fetchCatalog])
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={
          <Layout style={{ minHeight: '100vh', background: '#fff' }}>
            <Content style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
              <Home />
            </Content>
          </Layout>
        } />
        <Route path="/view" element={<View />} />
        {ENABLE_ZARR_VIEW && (
          <Route path="/zarr_view" element={<ZarrView />} />
        )}
        {ENABLE_PROFILER && (
          <Route path="/profile" element={
            <Layout style={{ minHeight: '100vh', background: '#fff' }}>
              <Content style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px', overflow: 'auto' }}>
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
