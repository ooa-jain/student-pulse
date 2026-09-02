import { Navigate, Route, Routes } from 'react-router-dom'

import Admin from './pages/Admin'
import Survey from './pages/Survey'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Survey />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
