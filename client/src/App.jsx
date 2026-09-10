import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './components/layout/AppLayout.jsx'
import AuthLayout from './components/layout/AuthLayout.jsx'
import ArchivePage from './pages/ArchivePage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PermitFormPage from './pages/PermitFormPage.jsx'
import EsgReportPage from './pages/ESGReportPage.jsx'
import DailyReportForm from './pages/RaportOnSite.jsx'
import SiteReportsPage from './pages/SiteReportsPage.jsx'
import AdminSiteReportsPage from './pages/AdminSiteReportsPage.jsx'
import CreateNewAccount from './pages/CreateNewAccount.jsx'
import SignupPage from './pages/SingupPage.jsx'

/**
 * No AnimatePresence here on purpose. Keying <Routes> by pathname remounts the
 * whole subtree on every navigation — including AppLayout, which would refetch
 * /api/auth/me on every click. The page transition lives inside AppLayout
 * instead, so the layout mounts once per session and only the page swaps.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup/:token" element={<SignupPage />} /> 
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/permise" element={<PermitFormPage />} />
        <Route path="/arhiva" element={<ArchivePage />} />
        <Route path="/raport-zilnic" element={<DailyReportForm />} />
        <Route path="/pagina-rapoarte" element={<SiteReportsPage />} />
        {/* Doar pentru admini — AppLayout întoarce non-adminii pe USER_HOME. */}
        <Route path="/rapoarte-on-site" element={<AdminSiteReportsPage />} />
        <Route path='/cont-nou' element = {<CreateNewAccount />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
