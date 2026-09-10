import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import Wordmark from '../components/brand/Wordmark.jsx'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import FieldLabel from '../components/ui/FieldLabel.jsx'
import IconField, { UserIcon } from '../components/ui/IconField.jsx'
import PageTransition from '../components/layout/PageTransition.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

export default function CreateNewAccount() {

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [role, setRole] = useState('')
  const {profile} = useOutletContext();
  const canInviteAdmin = profile.role === 'superuser'

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!EMAIL_RE.test(email.trim())) {
      setError('Introduceți o adresă de email de serviciu validă.')
      return
    }
    if (username.trim() === '') {
      setError('Numele este obligatoriu')
      return
    }

    setLoading(true)
    try {
      const jwt = localStorage.getItem('token')
      //call the endpoint
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          role: role
        })
      })

      const data = await response.json();

      //handle server-side errors
      if (!response.ok) {
        throw new Error(data.error || 'Cererea a esuat');
      }

      setSuccess(data.message)
      setEmail('')
      setUsername('')
      setRole('')

    } catch (err) {
      setError(err.message || 'A aparut o eroare. Va rugam sa incercati din nou');
    } finally {
      //stop loading regardless of success or failure
      setLoading(false);
    }
  }

  return (
    <PageTransition>
     <main className="flex min-h-[calc(100vh-62px)] flex-col items-center justify-center gap-[26px] px-5 py-14">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center gap-2 text-center"
      >
        <h1 className="m-0 text-display font-medium tracking-[0.005em] text-ink-800">
          Crează un cont nou
        </h1>
        <p className="m-0 max-w-[420px] text-lead text-ink-550 [text-wrap:pretty]">
          Adaugă un nou utilizator
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
              <FieldLabel htmlFor="pme-email">Email de serviciu</FieldLabel>
              <IconField
                id="pme-email"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="nume@companie.ro"
                icon={<UserIcon />}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                  setSuccess('')
                }}
              />
            </div>

            <div className="flex flex-col gap-[7px]">
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel htmlFor="pme-username">Nume</FieldLabel>
              </div>
              <IconField
                id="pme-username"
                type={'text'}
                name="username"
                placeholder="EX: Popescu Ion"
                icon={<UserIcon />}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                  setSuccess('')
                }}
              />
            </div>

            <div className="flex flex-col gap-[7px]">
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel htmlFor="pme-role">Rol</FieldLabel>
              </div>
              <select
                id="pme-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setError('')
                  setSuccess('')
                }}
                  className="h-[46px] w-full border border-line bg-surface px-3 text-body-sm text-ink-800"
              >

                <option value = "">Selectează rolul</option>
                <option value = "user">Utilizator</option>
                {canInviteAdmin && (
                   <option value = "admin">Administrator</option>
                )}
              </select>
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
              {loading ? 'Se invită…' : 'Invită'}
            </Button>

            {success && <Alert tone="success">{success}</Alert>}

          </form>
        </Card>
      </motion.div>
      </main>
    </PageTransition>
  )
}
