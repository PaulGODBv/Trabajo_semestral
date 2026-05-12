import { useCallback, useEffect, useMemo, useState } from 'react'
import SalonMap from './components/SalonMap'
import ReservaForm from './components/ReservaForm'
import AdminPanel from './components/AdminPanel'
import AdminLoginModal from './components/AdminLoginModal'
import { getMesas } from './services/mesasService'
import { supabase } from './services/supabaseClient'
import './App.css'

function App() {
  const [vistaActiva, setVistaActiva] = useState('cliente')
  const [mesas, setMesas] = useState([])
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null)
  const [adminSession, setAdminSession] = useState(null)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargarMesas = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: supabaseError } = await getMesas()

    if (supabaseError) {
      console.error(supabaseError)
      setError('No se pudieron cargar las mesas. Revisa la conexión con Supabase o las políticas RLS.')
      setMesas([])
    } else {
      setMesas(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    cargarMesas()
  }, [cargarMesas])

  useEffect(() => {
    let authSubscription

    const initSession = async () => {
      const { data } = await supabase.auth.getSession()
      setAdminSession(data.session || null)
      setCheckingSession(false)
    }

    initSession()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminSession(session || null)

      if (!session) {
        setVistaActiva((currentView) => currentView === 'admin' ? 'cliente' : currentView)
      }
    })

    authSubscription = data.subscription

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [])

  const resumen = useMemo(() => {
    const disponibles = mesas.filter((mesa) => mesa.estado === 'disponible').length
    const ocupadas = mesas.filter((mesa) => mesa.estado === 'ocupada').length

    return {
      total: mesas.length,
      disponibles,
      ocupadas
    }
  }, [mesas])

  const handleSeleccionMesa = (mesa) => {
    setMensaje('')
    setMesaSeleccionada(mesa)
  }

  const handleReservaCreada = async () => {
    setMesaSeleccionada(null)
    setMensaje('Reserva confirmada correctamente. La mesa quedó marcada como ocupada.')
    await cargarMesas()
  }

  const abrirVistaAdmin = () => {
    setMensaje('')
    setError('')
    setMesaSeleccionada(null)

    if (adminSession) {
      setVistaActiva('admin')
      return
    }

    setShowAdminLogin(true)
  }

  const volverVistaCliente = () => {
    setVistaActiva('cliente')
    setMesaSeleccionada(null)
    setMensaje('')
    setError('')
  }

  const handleAdminLoginSuccess = (session) => {
    setAdminSession(session)
    setShowAdminLogin(false)
    setVistaActiva('admin')
    setMesaSeleccionada(null)
    setMensaje('Sesión de administrador iniciada correctamente.')
  }

  const cerrarSesionAdmin = async () => {
    await supabase.auth.signOut()
    setAdminSession(null)
    setVistaActiva('cliente')
    setMesaSeleccionada(null)
    setMensaje('Sesión de administrador cerrada.')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header__content">
          <div className="brand-block">
            <img
              src="/the-gordo-logo.png"
              alt="Logo de The Gordo"
              className="app-logo"
            />

            <div>
              <p className="eyebrow">Sistema de reservas</p>
              <h1>The Gordo</h1>
              <p className="app-header__description">
                Selecciona una mesa disponible en el salón, completa los datos del cliente y confirma la reserva.
              </p>
            </div>
          </div>
        </div>

        <div className="header-side">
          <div className="admin-top-actions">
            {vistaActiva === 'admin' ? (
              <button
                type="button"
                className="admin-access-button admin-access-button--secondary"
                onClick={volverVistaCliente}
              >
                Vista cliente
              </button>
            ) : (
              <button
                type="button"
                className="admin-access-button"
                onClick={abrirVistaAdmin}
                disabled={checkingSession}
              >
                Administrador
              </button>
            )}

            {adminSession && (
              <button
                type="button"
                className="admin-access-button admin-access-button--logout"
                onClick={cerrarSesionAdmin}
              >
                Cerrar sesión
              </button>
            )}
          </div>

          <section className="summary-panel" aria-label="Resumen del salón">
            <article>
              <strong>{resumen.total}</strong>
              <span>Mesas</span>
            </article>
            <article>
              <strong>{resumen.disponibles}</strong>
              <span>Disponibles</span>
            </article>
            <article>
              <strong>{resumen.ocupadas}</strong>
              <span>Ocupadas</span>
            </article>
          </section>
        </div>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {mensaje && <p className="alert alert--success">{mensaje}</p>}

      {vistaActiva === 'admin' && adminSession ? (
        <AdminPanel onMesasChanged={cargarMesas} />
      ) : (
        <section className="reservation-layout">
          <SalonMap
            mesas={mesas}
            loading={loading}
            mesaSeleccionada={mesaSeleccionada}
            onSelectMesa={handleSeleccionMesa}
          />

          <aside className="booking-panel" aria-label="Panel de reserva">
            {mesaSeleccionada ? (
              <ReservaForm
                mesa={mesaSeleccionada}
                onCancel={() => setMesaSeleccionada(null)}
                onReservaCreada={handleReservaCreada}
              />
            ) : (
              <div className="empty-selection">
                <span className="empty-selection__icon">🍽️</span>
                <h2>Elige una mesa</h2>
                <p>
                  Las mesas verdes están disponibles. Haz clic en una para iniciar la reserva.
                </p>
              </div>
            )}
          </aside>
        </section>
      )}

      {showAdminLogin && (
        <AdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      )}
    </main>
  )
}

export default App