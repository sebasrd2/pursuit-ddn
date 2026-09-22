import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Knowledge } from './routes/Knowledge'
import { RfpCreate } from './routes/RfpCreate'
import { RfpList } from './routes/RfpList'
import { RfpOverview } from './routes/RfpOverview'
import { QuestionsWorkspace } from './routes/QuestionsWorkspace'
import { Settings } from './routes/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<RfpList />} />
          <Route path="/rfps/new" element={<RfpCreate />} />
          <Route path="/rfps/:id" element={<RfpOverview />} />
          <Route path="/rfps/:id/questions" element={<QuestionsWorkspace />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
