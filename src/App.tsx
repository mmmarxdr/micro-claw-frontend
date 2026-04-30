import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'
import { SetupProvider } from './contexts/SetupContext'
import { SetupGuard } from './components/SetupGuard'
import { AuthGate } from './components/AuthGate'
import { AppLayout } from './components/layout/AppLayout'
import { OverviewPage } from './pages/OverviewPage'
import { MetricsPage } from './pages/MetricsPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { MemoryPage } from './pages/MemoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { ToolsPage } from './pages/ToolsPage'
import { LogsPage } from './pages/LogsPage'
import { MCPPage } from './pages/MCPPage'
import { DesignPage } from './pages/DesignPage'
import { useMetricsSocket } from './hooks/useMetricsSocket'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// Maintains a persistent WS connection to /ws/metrics and pushes
// updates into TanStack Query cache so Overview auto-refreshes.
function MetricsSyncSocket() {
  useMetricsSocket()
  return null
}

function AuthedApp() {
  return (
    <SetupProvider>
      <SetupGuard>
        <AuthGate>
          <MetricsSyncSocket />
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="metrics" element={<MetricsPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="memory" element={<MemoryPage />} />
              {/* /chat is rendered by AppLayout (always-mounted) so the chat
                  survives navigation to other routes and can show as a floating dock. */}
              <Route path="chat" element={null} />
              <Route path="tools" element={<ToolsPage />} />
              <Route path="mcp" element={<MCPPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="logs" element={<LogsPage />} />
            </Route>
          </Routes>
        </AuthGate>
      </SetupGuard>
    </SetupProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public preview — no auth, no setup required (visual validation only) */}
            <Route element={<AppLayout />}>
              <Route path="design" element={<DesignPage />} />
            </Route>
            {/* Authenticated app */}
            <Route path="*" element={<AuthedApp />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
