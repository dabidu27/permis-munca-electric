import { NavLink } from 'react-router-dom'

import Wordmark from '../brand/Wordmark.jsx'
import LogoutButton from './LogoutButton.jsx'
import UserBadge from './UserBadge.jsx'
import { homePath } from '../../lib/roles.js'

const NAV = [
  { to: '/', label: 'Acasă', end: true },
  { to: '/permise', label: 'Permise' },
  { to: '/arhiva', label: 'Arhivă' },
  { to: '/rapoarte-on-site', label: 'Rapoarte on-site' },
  {to: '/cont-nou', label: 'Cont nou'}
]

export default function Header({ user }) {
  // Non-adminii au o singură pagină, deci nu au între ce naviga: rămân doar
  // sigla (care duce tot acolo), numele și ieșirea din cont.
  const nav = user.role === 'superuser' || user.role === 'admin' ? NAV : []

  return (
    <header className="flex h-[62px] flex-none items-center justify-between border-b border-line bg-surface px-7">
      <NavLink to={homePath(user.role)} aria-label="Permis Muncă Electric — pagina principală">
        <Wordmark />
      </NavLink>

      <div className="flex items-center gap-[22px]">
        <nav className="flex items-center gap-[22px] text-nav font-bold uppercase tracking-label">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'border-b-2 pb-0.5 no-underline transition-colors duration-150',
                  isActive
                    ? 'border-brand text-ink'
                    : 'border-transparent text-ink-500 hover:text-ink',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <UserBadge user={user} />
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
