import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabaseClient'

export default function AdminLoginModal({ onClose, onLoginSuccess }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef(null)
  const firstRef = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    document.body.style.overflow = 'hidden'
    firstRef.current?.focus()

    const focusable = 'button:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) { onClose(); return }
      if (e.key !== 'Tab') return
      const nodes = [...(dialogRef.current?.querySelectorAll(focusable) || [])]
      const first = nodes[0]; const last = nodes[nodes.length - 1]
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault()
        ;(e.shiftKey ? last : first)?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [loading, onClose])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors({})
  }

  const validar = () => {
    const next = {}
    if (!form.email.trim()) next.email = 'Ingresa el correo del administrador.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Ingresa un correo válido.'
    if (!form.password) next.password = 'Ingresa la contraseña.'
    else if (form.password.length < 6) next.password = 'La contraseña debe tener mínimo 6 caracteres.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validar()) return
    setLoading(true)
    setErrors({})

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password
    })

    if (error) {
      setErrors({ general: 'Correo o contraseña incorrectos. Intenta de nuevo.' })
      setLoading(false)
      return
    }

    setLoading(false)
    onLoginSuccess(data.session)
  }

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <section
        ref={dialogRef}
        className="admin-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-login-title"
      >
        <div className="admin-login-modal__header">
          <p className="eyebrow">Acceso restringido</p>
          <h2 id="admin-login-title">Ingreso administrador</h2>
          <p>Solo el personal autorizado puede gestionar mesas y reservas.</p>
        </div>

        {errors.general && <p className="alert alert--error" role="alert">{errors.general}</p>}

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="al-email">
            Correo
            <input
              id="al-email"
              ref={firstRef}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@thegordo.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'al-email-err' : undefined}
            />
            {errors.email && <small id="al-email-err" role="alert">{errors.email}</small>}
          </label>

          <label htmlFor="al-pass">
            Contraseña
            <input
              id="al-pass"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'al-pass-err' : undefined}
            />
            {errors.password && <small id="al-pass-err" role="alert">{errors.password}</small>}
          </label>

          <div className="admin-login-modal__actions">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )
}
