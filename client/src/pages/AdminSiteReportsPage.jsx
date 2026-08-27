import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState, useRef } from 'react'

import PageTransition from '../components/layout/PageTransition.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'

/**
 * Vederea de admin peste rapoartele on-site: toate rapoartele, ale tuturor
 * utilizatorilor, nu doar ale celui autentificat (GET /api/site-reports/admin).
 *
 * Față de pagina utilizatorului: o coloană în plus cu cine a raportat, filtrare
 * pe lună și export Excel — și niciun buton de editare, pentru că adminul
 * citește rapoartele, nu le corectează.
 *
 * TODO: datele sunt placeholder — de înlocuit cu GET /api/site-reports/admin.
 * Câmpurile respectă deja `snake_case`-ul coloanelor din `site_reports`, ca
 * înlocuirea să nu ceară și rescrierea celulelor.
 */

/**
 * Aceeași definiție de grilă pentru antet și pentru rânduri, ca să rămână
 * aliniate. Sub lățimea minimă tabelul derulează orizontal în loc să se
 * rearanjeze — coloanele numerice devin ilizibile dacă se înghesuie.
 */
const GRID = {
  display: 'grid',
  gridTemplateColumns:
    '96px minmax(160px, 1.2fr) minmax(170px, 1.2fr) 96px 96px 88px 96px 96px 120px 120px',
  gap: '16px',
  width: '100%',
}

/**
 * Învelișul tuturor rândurilor din interiorul cardului care derulează orizontal.
 *
 * `min-content` se calculează din chiar coloanele grilei — suma minimelor, plus
 * spațiile dintre ele, plus paddingul — deci nu poate rămâne în urmă când se
 * schimbă o coloană. O lățime scrisă de mână și rămasă prea mică taie exact
 * invers decât pare: cutia se oprește mai devreme, iar celulele ies din fundal.
 *
 * Îl poartă un înveliș, nu fiecare rând în parte, ca antetul, rândurile, mesajul
 * de tabel gol și subsolul să aibă toate aceeași lățime — altfel, derulat la
 * dreapta, subsolul se termină înaintea tabelului și lasă o bandă albă.
 */
const TABLE_SHELL = { minWidth: 'min-content' }

const COLUMNS = [
  { label: 'Data' },
  { label: 'Parc' },
  { label: 'Echipă' },
  { label: 'Ore lucrate', align: 'text-right' },
  { label: 'Inducție', align: 'text-right' },
  { label: 'Mediu', align: 'text-right' },
  { label: 'Near miss', align: 'text-right' },
  { label: 'Toolbox', align: 'text-right' },
  { label: 'Ment. corectivă', align: 'text-right' },
  { label: 'Ment. preventivă', align: 'text-right' },
]


const TOATE = 'toate'

const formatData = (data) => {
  if (!data) return '-'
  try {
    const dateStr = String(data).includes('T') ? data : `${data}T00:00:00`
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return data
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch (err) {
    return data
  }
}

const formatNumar = (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(n)

const normalizeText = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** `2026-08-14` (sau ISO complet) → `2026-08`, cheia după care grupăm lunile. */
const lunaKey = (data) => String(data ?? '').slice(0, 7)

/** `2026-08` → `August 2026`. */
const lunaLabel = (key) => {
  const d = new Date(`${key}-01T00:00:00`)
  if (isNaN(d.getTime())) return key
  const label = d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function AdminSiteReportsPage() {
  const [reports, setReports] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [parc, setParc] = useState(TOATE)
  const [luna, setLuna] = useState(TOATE)
  const [query, setQuery] = useState('')

  const parcOptions = useMemo(
    () => [
      { value: TOATE, label: 'Toate' },
      ...[...new Set(reports.map((r) => r.parc))].map((p) => ({ value: p, label: p })),
    ],
    [reports],
  )

  const lunaOptions = useMemo(
    () =>
      [...new Set(reports.map((r) => lunaKey(r.data)))]
        .filter(Boolean)
        .sort()
        .reverse()
        .map((key) => ({ value: key, label: lunaLabel(key) })),
    [reports],
  )

  const rows = useMemo(() => {
    const q = normalizeText(query.trim())

    return reports
      .filter((r) => parc === TOATE || r.parc === parc)
      .filter((r) => luna === TOATE || lunaKey(r.data) === luna)
      .filter((r) => {
        if (!q) return true
        const searchString = `${r.utilizator ?? ''} ${r.parc} ${
          Array.isArray(r.echipa) ? r.echipa.join(' ') : r.echipa || ''
        }`
        return normalizeText(searchString).includes(q)
      })
  }, [reports, parc, luna, query])

  //we keep the current active controller in a reference
  const abortControllerRef = useRef(null);

  const fetchResponse = async() => {

      //create controller for active request that handles request cancelation
      const controller = new AbortController();

      //if there is an active request (controller)
      if(abortControllerRef.current){
        //stop it before we start another request to avoid concurrency problems, like an old request overwriting the latest request
        abortControllerRef.current.abort();
      }
      //save the new controller before starting the request
      abortControllerRef.current = controller;
      
      const jwt = localStorage.getItem('token');

      try{

        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/site-reports/admin", {method: 'GET', headers: {
          Authorization: `Bearer ${jwt}`},
          //if the request is cancelled, stop the fetch - this prevents the request keeping on running even though it was cancelled and in some cases
          //, when it finishes, try to set data on a component that is no longer rendered (if the user changed pages for example)
          signal: controller.signal
        });

        if(!res.ok)
          throw new Error(`A apărut o eroare la descărcarea datelor (${res.status})`)

        const data = await res.json();

        if(data.error){
          throw new Error(data.error);
        }

        //safety check - we make sure the current request is still the active one
        if(abortControllerRef.current === controller)
          setReports(Array.isArray(data?.data) ? data.data : []);

      }catch(err){
        //ignore the error is the request was cancelled by the user intentionally
        if(err.name !== 'AbortError' && abortControllerRef.current === controller)
          setError(err.message);
      }finally{
        //we stop the loading only if the current controller is still the active one
        //otherwise, stopping another request that ran before this one but did not finish
        //would be canceled and would also stop the loading of the new request
        if(abortControllerRef.current === controller)
          setIsLoading(false);
      }
    }

  useEffect(() => {
    fetchResponse();
    return () => {
      if(abortControllerRef.current)
        abortControllerRef.current.abort();
    }
  }, [])

  const handleDownloadExcel = async() => {
    try{

      setError(null);

      const jwt = localStorage.getItem('token');

      const params = new URLSearchParams();
      if(luna !== TOATE && parc !== TOATE){
        const tokens = luna.split('-');
        params.set('an', tokens[0]);
        params.set('luna', tokens[1]);
        params.set('parc', parc);
      }else if (luna !== TOATE){
        const tokens = luna.split('-');
        params.set('an', tokens[0]);
        params.set('luna', tokens[1]);
      }else if (parc !== TOATE){
        params.set('parc', parc);
      }
      const query = params.toString();
      const url = `/api/site-reports/admin/download${query ? `?${query}` : ''}`;
      
      const res = await fetch(url, {method: 'GET', headers: {Authorization: `Bearer ${jwt}`}})
      if(!res.ok){
        if(res.status === 404){
            throw new Error('Nu există rapoarte pentru luna selectată.');
        }
        throw new Error(`Eroare la descărcarea fișierului (${res.status})`);
      }

      const blob = await res.blob();

      //fallback name
      let filename = `Rapoarte_${luna !== TOATE ? luna : 'Toate'}.xlsx`;
      //try to extract filename from content-disposition header
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      //create an invisible url
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

    }catch(err){
      alert(err.message);
    }
    
    
  }

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-7 pb-[72px] pt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeading
            title="Rapoarte on-site"
            subtitle="Toate rapoartele zilnice trimise de echipe, cu orele-om și indicatorii HSE raportați."
          />

          <Button onClick={handleDownloadExcel} disabled={rows.length === 0}>
            Descarcă Excel
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            label="Filtrează după parc"
            options={parcOptions}
            value={parc}
            onChange={setParc}
          />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={luna}
              onChange={(e) => setLuna(e.target.value)}
              aria-label="Filtrează după lună"
              className="h-10 cursor-pointer border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <option value={TOATE}>Toate lunile</option>
              {lunaOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută utilizator, parc sau lucrător"
              aria-label="Caută rapoarte după utilizator, parc sau membru al echipei"
              className="h-10 w-[340px] max-w-full border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </div>
        </div>

        <Card className="overflow-x-auto">
          <div style={TABLE_SHELL}>
            <div
              style={GRID}
              className="items-center border-b border-line bg-surface-alt px-[22px] py-[13px] text-table-head font-bold uppercase tracking-label text-ink-400"
            >
              {COLUMNS.map((column, i) => (
                <span key={i} className={column.align ?? ''}>
                  {column.label}
                </span>
              ))}
            </div>

            {isLoading ? (
              <div className="px-[22px] py-[34px] text-center text-body-sm text-ink-400">
                Se încarcă rapoartele...
              </div>
            ) : error ? (
              <div className="px-[22px] py-[34px] text-center text-body-sm text-danger">
                {error}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {rows.map((report) => (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={GRID}
                    className="items-center border-b border-line-faint px-[22px] py-[15px] text-body-sm text-ink-700 transition-colors duration-150 hover:bg-surface-alt"
                  >
                    <span className="text-ink-600">{formatData(report.data)}</span>
                    <span className="truncate font-bold text-ink">{report.parc}</span>
                    <span className="flex min-w-0 flex-col gap-[3px]">
                      <span className="truncate text-cta text-ink-700">
                        {Array.isArray(report.echipa)
                          ? report.echipa.join(', ')
                          : report.echipa || 'Echipă nespecificată'}
                      </span>
                      <span className="text-meta text-ink-400">
                        {Array.isArray(report.echipa) ? report.echipa.length : report.echipa ? 1 : 0}{' '}
                        {(Array.isArray(report.echipa) ? report.echipa.length : report.echipa ? 1 : 0) === 1
                          ? 'lucrător'
                          : 'lucrători'}
                      </span>
                    </span>
                    <span className="text-right font-mono text-cta text-ink-700">{formatNumar(report.ore_lucrate)}</span>
                    <span className="text-right font-mono text-cta text-ink-700">{formatNumar(report.inductie_ore)}</span>
                    <span className="text-right font-mono text-cta text-ink-700">{formatNumar(report.mediu_ore)}</span>
                    <span className={`text-right font-mono text-cta ${report.near_miss > 0 ? 'font-bold text-danger' : 'text-ink-700'}`}>
                      {formatNumar(report.near_miss)}
                    </span>
                    <span className="text-right font-mono text-cta text-ink-700">{formatNumar(report.toolbox)}</span>
                    <span className="text-right font-mono text-cta text-ink-700">{formatNumar(report.mentenanta_corectiva)}</span>
                    <span className="text-right font-mono text-cta text-ink-700">{formatNumar(report.mentenanta_preventiva)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {!isLoading && !error && rows.length === 0 && (
              <div className="px-[22px] py-[34px] text-center text-body-sm text-ink-400">
                Nu există rapoarte care corespund filtrelor selectate.
              </div>
            )}

            <div className="flex items-center justify-between gap-4 px-[22px] py-[13px] text-meta text-ink-400">
              <span>{`${rows.length} din ${reports.length} rapoarte`}</span>
            </div>
          </div>
        </Card>
      </main>
    </PageTransition>
  )
}
