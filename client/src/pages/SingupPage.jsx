import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Wordmark from '../components/brand/Wordmark.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import FieldLabel from '../components/ui/FieldLabel.jsx'
import IconField, { LockIcon, UserIcon } from '../components/ui/IconField.jsx'

export default function SignupPage() {
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const {token} = useParams()

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('Parola trebuie să conțină minimum 8 caractere.')
      return
    }

    setLoading(true)

    try {
      //call the endpoint
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: password,
          token: token
        })
      })

      const data = await response.json();

      //handle server-side errors
      if (!response.ok) {
        throw new Error(data.error || 'Date de autentificare incorecte.');
      }

      setSuccess(data.message)

      //navigate on success — back to wherever the guard interrupted them
      navigate('/login', { replace: true })

    } catch (err) {
      setError(err.message || 'A aparut o eroare. Va rugam sa incercati din nou');
    } finally {
      //stop loading regardless of success or failure
      setLoading(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center gap-2 text-center"
      >
        <h1 className="m-0 text-display font-medium tracking-[0.005em] text-ink-800">
          Bine ai venit
        </h1>
        <p className="m-0 max-w-[420px] text-lead text-ink-550 [text-wrap:pretty]">
          Setează-ți parola pentru a finaliza crearea contului tău
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06, ease: 'easeOut' }}
        className="w-full max-w-[476px]"
      >
        <Card className="px-10 pb-[34px] pt-9">
          <div className="flex items-center justify-center gap-3.5">
            <Wordmark size="lg" />
          </div>

          <div className="mb-[26px] mt-[30px] h-px bg-line-soft" />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            <div className="flex flex-col gap-[7px]">
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel htmlFor="pme-pass">Parolă</FieldLabel>
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-brand transition-colors duration-150 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {reveal ? 'Ascunde' : 'Afișează'}
                </button>
              </div>
              <IconField
                id="pme-pass"
                type={reveal ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••••"
                icon={<LockIcon />}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                  setSuccess('')
                }}
              />
            </div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  key="login-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <Alert tone="error">{error}</Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" size="lg" fullWidth loading={loading} className="mt-1.5">
              {loading ? 'Se înregistrează…' : 'Înregistrare'}
            </Button>

            {success && <Alert tone="success">{success}</Alert>}

          </form>
        </Card>
      </motion.div>
    </>
  )
}
