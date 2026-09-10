import { motion } from 'framer-motion'
import { Link, useOutletContext } from 'react-router-dom'

import PermitIcon from '../components/brand/PermitIcon.jsx'
import PageTransition from '../components/layout/PageTransition.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { useEffect, useState } from 'react'


export default function HomePage() {

  const { profile } = useOutletContext()
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const jwt = localStorage.getItem('token');
    fetch('/api/documents/stats', {method: 'GET', headers: {
      Authorization: `Bearer ${jwt}`
    }})
    .then(r => r.json()).then(d => {if(d.stats){setStats(d.stats)}})
      .catch((err) => {return;})
  }, [])

  // `to` matches the `stare` values in useArchiveFilters — "Total emise" carries
  // no param, which the archive reads as "Toate".
  const tiles = [
    { label: 'Necesită semnătura ta', value: stats?.emitentSignNeeded ?? '-', to: '/arhiva?stare=semnatura_ta', rule: 'border-l-warn', tone: 'text-warn-text' },
    { label: 'În așteptarea altora', value: stats?.sefLucrareSignNeeded ?? '-', to: '/arhiva?stare=asteapta_altii', rule: 'border-l-brand', tone: 'text-brand-text' },
    { label: 'Complet', value: stats?.completed ?? '-', to: '/arhiva?stare=complet', rule: 'border-l-ink', tone: 'text-ink' },
    { label: 'Total emise', value: stats?.total ?? '-', to: '/arhiva', rule: 'border-l-ink-200', tone: 'text-ink-500' },
  ]

  const prenume = profile.prenume;

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-[26px] px-7 pb-16 pt-11">
        <PageHeading
          title={`Bună, ${prenume}`}
          subtitle="Începe un permis de lucru electric nou și trimite-l spre semnare."
        />

        <div className="flex flex-wrap items-start gap-[26px]">
          <Card className="flex w-full max-w-[484px] flex-col items-center gap-5 px-[34px] pb-[30px] pt-[34px]">
            <PermitIcon />

            <div className="flex flex-col items-center gap-1.5 text-center">
              <h2 className="m-0 text-title font-medium text-ink-800">Permis de lucru nou</h2>
              <p className="m-0 text-body-sm text-ink-500">
                Completează datele lucrării și trimite permisul spre semnare
              </p>
            </div>

            <Button as={Link} to="/permise" size="lg" fullWidth>
              Creează permis
            </Button>
          </Card>


          <aside className="flex min-w-[240px] flex-1 flex-col gap-0.5">
            {tiles.map((tile, i) => (
              <motion.div
                key={tile.label}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.06 + i * 0.05, ease: 'easeOut' }}
              >
                <Link
                  to={tile.to}
                  className={`flex items-center gap-3.5 border border-line ${tile.rule} border-l-[3px] bg-surface px-4 py-3.5 no-underline transition-colors duration-150 hover:bg-surface-alt`}
                >
                  {stats ? (
                    <span className={`min-w-[26px] text-stat font-medium leading-none ${tile.tone}`}>
                      {tile.value}
                    </span>
                  ) : (
                    // Sized to the digit it replaces, so the row doesn't shift
                    // when the real count lands.
                    <Skeleton className="h-[22px] w-[26px] min-w-[26px]" />
                  )}
                  <span className="text-body-sm text-ink-700">{tile.label}</span>
                </Link>
              </motion.div>
            ))}
          </aside>
        </div>
      </main>
    </PageTransition>
  )
}
