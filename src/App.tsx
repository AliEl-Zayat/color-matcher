import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { MatchPage } from '@/pages/MatchPage'
import { LivePage } from '@/pages/LivePage'
import { PalettesPage } from '@/pages/PalettesPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { SettingsPage } from '@/pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1_000,
      refetchOnWindowFocus: false,
    },
  },
})

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<MatchPage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="palettes" element={<PalettesPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
