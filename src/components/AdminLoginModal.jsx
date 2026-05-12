import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabaseClient'

function AdminLoginModal({ onClose, onLoginSuccess }) {
  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [loading, onClose])

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }))

    setErrors({})
  }

  const validarFormulario = () => {
    const nextErrors = {}
    const email = form.email.trim()

    if (!email) {
      nextErrors.email = 'Ingresa el correo del administrador.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      nextErrors.email = 'Ingresa un correo válido.'
    }

    if (!form.password) {
      nextErrors.password = 'Ingresa la contraseña.'
    } else if (form.password.length < 6) {
      nextErrors.password = 'La contraseña debe tener mínimo 6 caracteres.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validarFormulario()) return

    setLoading(true)
    setErrors({})

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password
    })

    if (error) {
      console.error(error)
      setErrors({
        general: 'Correo o contraseña incorrectos. Intenta de nuevo.'
      })
      setLoading(false)
      return
    }

    setLoading(false)
    onLoginSuccess(data.session)
  }

  return createPortal(
    <div className="modal-overlay">
      <section
        className="admin-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
      >
        <div className="admin-login-modal__header">
          <p className="eyebrow">Acceso restringido</p>
          <h2 id="admin-login-title">Ingreso administrador</h2>
          <p>
            Solo el personal autorizado puede modificar mesas y estados del salón.
          </p>
        </div>

        {errors.general && <p className="alert alert--error">{errors.general}</p>}

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          <label>
            Correo
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@thegordo.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <small>{errors.email}</small>}
          </label>

          <label>
            Contraseña
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <small>{errors.password}</small>}
          </label>

          <div className="admin-login-modal__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="button button--primary"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )
}

export default AdminLoginModal