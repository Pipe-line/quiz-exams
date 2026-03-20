import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Blocks from './pages/Blocks'
import BlockDetail from './pages/BlockDetail'
import Test from './pages/Test'
import TestResults from './pages/TestResults'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/blocks"
              element={
                <ProtectedRoute>
                  <Blocks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/blocks/:id"
              element={
                <ProtectedRoute>
                  <BlockDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:attemptId"
              element={
                <ProtectedRoute>
                  <Test />
                </ProtectedRoute>
              }
            />
            <Route
              path="/test/:attemptId/results"
              element={
                <ProtectedRoute>
                  <TestResults />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
