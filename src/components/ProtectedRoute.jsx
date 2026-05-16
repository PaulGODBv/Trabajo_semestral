import { useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import AdminLoginModal from './AdminLoginModal'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useContext(AuthContext)
  const [showLogin, setShowLogin] = useState(true)

  if (loading) {
    return (
      <div className="admin-loading" style={{ minHeight: '60vh' }}>
        Verificando sesión...
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <Navigate to="/" replace />
        {showLogin && (
          <AdminLoginModal
            onClose={() => setShowLogin(false)}
            onLoginSuccess={() => setShowLogin(false)}
          />
        )}
      </>
    )
  }

  return children
}
