import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Shield, UtensilsCrossed } from 'lucide-react'
import SalonMap from './components/SalonMap'
import ReservaForm from './components/ReservaForm'
import ReservaConfirmada from './components/ReservaConfirmada'
import AdminPanel from './components/AdminPanel'
import AdminLoginModal from './components/AdminLoginModal'
import ProtectedRoute from './components/ProtectedRoute'
import Toast from './components/Toast'
import { getMesas } from './services/mesasService'
import { AuthContext } from './context/AuthContext'
import { useToast } from './context/ToastContext'
import './App.css'

function AppHeader({ mesas, onAbrirAdmin, onVolverCliente, onSignOut, checkingSession }) {
  const location = useLocation()
  const isAdmin = location.pathname === '/admin'
  const { session } = useContext(AuthContext)

  const resumen = useMemo(() => ({
    total: mesas.length,
    disponibles: mesas.filter(m => m.estado === 'disponible').length,
    ocupadas: mesas.filter(m => m.estado === 'ocupada').length
  }), [mesas])

  return (
    <header className="app-header">
      <div className="app-header__content">
        <div className="brand-block">
          <img src="/the-gordo-logo.png" alt="Logo del restaurante Comidas Rápidas The Gordo" className="app-logo" />
          <div>
            <p className="eyebrow">Sistema de reservas</p>
            <h1> The Gordo</h1>
            <p className="app-header__description">
              Selecciona una mesa disponible en el salón, completa los datos y confirma tu reserva.
            </p>
          </div>
        </div>
      </div>

      <div className="header-side">
        <div className="admin-top-actions">
          {isAdmin ? (
            <button type="button" className="admin-access-button admin-access-button--secondary" onClick={onVolverCliente}>
              Vista cliente
            </button>
          ) : (
            <button type="button" className="admin-access-button" onClick={onAbrirAdmin} disabled={checkingSession}>
              Administrador
            </button>
          )}
          {session && (
            <button type="button" className="admin-access-button admin-access-button--logout" onClick={onSignOut}>
              Cerrar sesión
            </button>
          )}
        </div>

        <section className="summary-panel" aria-label="Resumen del salón">
          <article><strong>{resumen.total}</strong><span> Mesas</span></article>
          <article><strong>{resumen.disponibles}</strong><span>Disponibles</span></article>
          <article><strong>{resumen.ocupadas}</strong><span> Ocupadas</span></article>
        </section>
      </div>
    </header>
  )
}

function ClienteView({ mesas, loading, onMesasChanged }) {
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null)
  const [reservaConfirmada, setReservaConfirmada] = useState(null)

  const handleReservaCreada = async (datos) => {
    setMesaSeleccionada(null)
    setReservaConfirmada(datos)
    await onMesasChanged()
  }

  const handleVolver = async () => {
    setReservaConfirmada(null)
    setMesaSeleccionada(null)
    await onMesasChanged()
  }

  return (
    <>
      <section className="reservation-layout">
        <SalonMap mesas={mesas} loading={loading} mesaSeleccionada={mesaSeleccionada} onSelectMesa={m => { setReservaConfirmada(null); setMesaSeleccionada(m) }} />
        <aside className="booking-panel" aria-label="Panel de reserva">
          {mesaSeleccionada ? (
            <ReservaForm mesa={mesaSeleccionada} onCancel={() => setMesaSeleccionada(null)} onReservaCreada={handleReservaCreada} />
          ) : (
            <div className="empty-selection">
              <span className="empty-selection__icon" aria-hidden="true">
                <UtensilsCrossed size={40} strokeWidth={1.5} />
              </span>
              <h2> Elige una mesa</h2>
              <p>Las mesas verdes están disponibles. Haz clic en una para iniciar tu reserva.</p>
            </div>
          )}
        </aside>
      </section>

      {/* Modal de confirmación post-reserva */}
      {reservaConfirmada && (
        <ReservaConfirmada reserva={reservaConfirmada} onVolver={handleVolver} />
      )}
    </>
  )
}

function App() {
  const navigate = useNavigate()
  const { session, loading: checkingSession, signOut } = useContext(AuthContext)
  const { addToast } = useToast()

  const [mesas, setMesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdminLogin, setShowAdminLogin] = useState(false)

  const cargarMesas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getMesas()
    if (error) { addToast('No se pudieron cargar las mesas.', 'error'); setMesas([]) }
    else setMesas(data || [])
    setLoading(false)
  }, [addToast])

  useEffect(() => { cargarMesas() }, [cargarMesas])

  const abrirAdmin = () => {
    if (session) navigate('/admin')
    else setShowAdminLogin(true)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    addToast('Sesión cerrada correctamente.', 'info')
  }

  const handleLoginSuccess = () => {
    setShowAdminLogin(false)
    navigate('/admin')
    addToast('Bienvenido al panel de administración.', 'success')
  }

  return (
    <main className="app-shell">
      <Toast />
      <AppHeader mesas={mesas} onAbrirAdmin={abrirAdmin} onVolverCliente={() => navigate('/')}
        onSignOut={handleSignOut} checkingSession={checkingSession} />

      <Routes>
        <Route path="/" element={<ClienteView mesas={mesas} loading={loading} onMesasChanged={cargarMesas} />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel onMesasChanged={cargarMesas} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showAdminLogin && (
        <AdminLoginModal onClose={() => setShowAdminLogin(false)} onLoginSuccess={handleLoginSuccess} />
      )}
    </main>
  )
}

export default App
