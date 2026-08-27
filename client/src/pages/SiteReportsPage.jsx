import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

import PageTransition from '../components/layout/PageTransition.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import PageHeading from '../components/ui/PageHeading.jsx'
import SegmentedControl from '../components/ui/SegmentedControl.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'

import Modal from '../components/ui/Modal.jsx'
import DailyReportForm from './RaportOnSite.jsx'

/**
 * Singura pagină a utilizatorilor non-admin: rapoartele on-site proprii.
 *
 * Coloanele urmăresc exact corpul cererii POST din siteReportsController
 * (parc, echipa, data, oreLucrate, inductieOre, mediuOre, nearMiss, toolBox,
 * mentenantaCorectiva, mentenantaPreventiva).
 */

/**
 * Aceeași definiție de grilă pentru antet și pentru rânduri, ca să rămână
 * aliniate. Sub lățimea minimă tabelul derulează orizontal în loc să se rearanjeze —
 * cele șapte coloane numerice devin ilizibile dacă se înghesuie.
 */
const GRID = {
  display: 'grid',
  gridTemplateColumns:
    '96px minmax(160px, 1.2fr) minmax(170px, 1.2fr) 96px 96px 88px 96px 96px 120px 120px 160px',
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
 * Îl poartă un înveliș, nu fiecare rând în parte, ca antetul, rândurile, mesajele
 * și subsolul să aibă toate aceeași lățime — altfel, derulat la dreapta, subsolul
 * se termină înaintea tabelului și lasă o bandă albă.
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
  { label: '' },
]

const SKELETON_ROWS = 5

/**
 * Rând-fantomă pentru intervalul cât se încarcă datele.
 *
 * Folosește aceeași grilă și aceleași paddinguri verticale ca rândurile reale,
 * ca antetul, scheletul și tabelul încărcat să fie aliniate și să nu sară nimic
 * când sosesc datele. Lățimile barelor variază ușor de la un rând la altul, ca
 * teancul să semene a conținut, nu a tipar repetat.
 */
function ReportRowSkeleton({ index = 0 }) {
  const wide = index % 2 === 0

  return (
    <div
      style={GRID}
      className="items-center border-b border-line-faint px-[22px] py-[15px]"
    >
      <Skeleton className="h-[11px] w-[68px]" />

      <Skeleton className={`h-[11px] ${wide ? 'w-[78%]' : 'w-[62%]'}`} />

      <span className="flex min-w-0 flex-col gap-[6px]">
        <Skeleton className={`h-[10px] ${wide ? 'w-[76%]' : 'w-[58%]'}`} />
        <Skeleton className="h-[9px] w-[52px]" />
      </span>

      {/* Cele șapte coloane numerice, aliniate la dreapta ca valorile reale. */}
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="ml-auto h-[11px] w-[32px]" />
      ))}

      <Skeleton className="h-[9px] w-[54px] justify-self-end" />
    </div>
  )
}

function ReportCardSkeleton() {
  return (
    <div className="border-b border-line-faint px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-[13px] w-[52%]" />
        <Skeleton className="h-[11px] w-[64px]" />
      </div>
      <Skeleton className="mt-[6px] h-[10px] w-[70%]" />
      <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-[10px] w-[70%]" />
        ))}
      </div>
    </div>
  )
}

function ReportCard({ report, onEdit, onDelete }) {
  const echipaCount = Array.isArray(report.echipa)
    ? report.echipa.length
    : report.echipa
    ? 1
    : 0

  const fields = [
    { label: 'Ore lucrate', value: report.ore_lucrate },
    { label: 'Inducție', value: report.inductie_ore },
    { label: 'Mediu', value: report.mediu_ore },
    { label: 'Near miss', value: report.near_miss, danger: report.near_miss > 0 },
    { label: 'Toolbox', value: report.toolbox },
    { label: 'Ment. corectivă', value: report.mentenanta_corectiva },
    { label: 'Ment. preventivă', value: report.mentenanta_preventiva },
  ]

  return (
    <div className="border-b border-line-faint px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-bold text-ink">{report.parc}</span>
        <span className="shrink-0 text-meta text-ink-400">{formatData(report.data)}</span>
      </div>

      <div className="mt-[3px] flex flex-col gap-[2px]">
        <span className="truncate text-cta text-ink-700">
          {Array.isArray(report.echipa)
            ? report.echipa.join(', ')
            : (report.echipa || 'Echipă nespecificată')}
        </span>
        <span className="text-meta text-ink-400">
          {echipaCount} {echipaCount === 1 ? 'lucrător' : 'lucrători'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col">
            <span className="text-meta text-ink-400">{f.label}</span>
            <span
              className={`font-mono text-cta ${f.danger ? 'font-bold text-danger' : 'text-ink-700'}`}
            >
              {formatNumar(f.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-5 border-t border-line-faint pt-3">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editează raportul din ${formatData(report.data)} — ${report.parc}`}
          className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-brand transition-colors duration-150 hover:text-brand-hover"
        >
          Editează
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Sterge raportul din ${formatData(report.data)} — ${report.parc}`}
          className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-danger transition-colors duration-150 hover:text-danger-hover"
        >
          Șterge
        </button>
      </div>
    </div>
  )
}

const formatData = (data) => {
  if (!data) return '-'; 
  try {
    const dateStr = String(data).includes('T') ? data : `${data}T00:00:00`;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return data; 
    return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (err) {
    return data;
  }
}

const formatNumar = (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(n)

const normalizeText = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export default function SiteReportsPage() {
  const [reports, setReports] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const [parc, setParc] = useState('toate')
  const [query, setQuery] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingReport, setEditingReport] = useState(null);

  const parcOptions = useMemo(
    () => [
      { value: 'toate', label: 'Toate' },
      ...[...new Set(reports.map((r) => r.parc))].map((p) => ({ value: p, label: p })),
    ],
    [reports],
  )

  const rows = useMemo(() => {
    const q = normalizeText(query.trim())

    return reports
      .filter((r) => parc === 'toate' || r.parc === parc)
      .filter((r) => {
        if (!q) return true
        const searchString = `${r.parc} ${Array.isArray(r.echipa) ? r.echipa.join(' ') : (r.echipa || '')}`        
        return normalizeText(searchString).includes(q)
      })
  }, [reports, parc, query])

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

        const res = await fetch('/api/site-reports', {method: 'GET', headers: {
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

  const handleAdd = () => {
    setEditingReport(null);
    setIsFormOpen(true);
  }

  const handleFormSuccess = () => {
    fetchResponse();
  }

  const handleEdit = (report) => {
    setEditingReport(report);
    setIsFormOpen(true);
  }

  const closeTimeoutRef = useRef(null);

  const handleCloseModal = () => {
    setIsFormOpen(false);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => setEditingReport(null), 200);
  }

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    }
  }, [])

  const handleDelete = async(report) => {

    //confirmation
    if (!window.confirm(`Ești sigur că vrei să ștergi raportul din ${formatData(report.data)} (${report.parc})?\nAceastă acțiune este ireversibilă.`)) {
      return; 
    }

    setError(null);

    try{

      const jwt = localStorage.getItem('token');
      const res = await fetch(`/api/site-reports/${encodeURIComponent(report.id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${jwt}`
        }      
      })

      if(!res.ok){
        throw new Error(`A apărut o eroare la stergerea datelor (${res.status})`)
      }

      const data = await res.json();
      if(data.error){
        throw new Error(data.error);
      }
     
      setReports(reports => reports.filter(r => r.id !== report.id))

    }catch(err){
      setError(err.message)
    }

  }

  useEffect(() => {
    //create controller for active request that handles request cancelation
    fetchResponse();
    //clean up function - useEffect runs when something (which we set) changes
    //or when the component is destroyed - in both cases, if a request is running, we stop it
    return () => {
      if(abortControllerRef.current){
        abortControllerRef.current.abort();
      }
    }

  }, [])

  return (


    <PageTransition>

      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseModal}
        label={editingReport ? 'Editează raportul' : 'Raport zilnic de lucru'}
      >
        <DailyReportForm 
          onSuccess={handleFormSuccess} 
          initialData={editingReport} //send the report data to the form - null or report to be edited data
          title={editingReport ? "Editează raportul" : "Raport zilnic de lucru"}
          submitLabel={editingReport ? "Salvează modificările" : "Trimite raportul"}
        />
      </Modal>

      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-7 pb-[72px] pt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeading
            title="Rapoarte on-site"
            subtitle="Rapoartele zilnice trimise de tine, cu orele-om și indicatorii HSE raportați."
          />

          <Button onClick={handleAdd}>Adaugă raport</Button>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <SegmentedControl
            label="Filtrează după parc"
            options={parcOptions}
            value={parc}
            onChange={setParc}
          />

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după parc sau membru al echipei"
            aria-label="Caută rapoarte"
            className="h-10 w-full border border-line-strong bg-surface px-3 text-body-sm text-ink-900 outline-0 transition-colors duration-150 focus:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-[340px] sm:max-w-full"
          />
        </div>

        <Card className="sm:overflow-x-auto">

          {/* ── Mobile: card stack ── */}
          <div className="sm:hidden">
            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.div key="loading-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                    <ReportCardSkeleton key={i} />
                  ))}
                </motion.div>
              ) : error ? (
                <motion.div key="error-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="px-4 py-8 text-center text-body-sm text-danger">
                  {error}
                </motion.div>
              ) : (
                <motion.div key="content-mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <AnimatePresence initial={false}>
                    {rows.map((report) => (
                      <motion.div key={report.id} layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <ReportCard
                          report={report}
                          onEdit={() => handleEdit(report)}
                          onDelete={() => handleDelete(report)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {rows.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="px-4 py-8 text-center text-body-sm text-ink-400">
                      Nu există rapoarte care corespund filtrului selectat.
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!isLoading && (
              <div className="px-4 py-3 text-meta text-ink-400">
                {`${rows.length} din ${reports.length} rapoarte`}
              </div>
            )}
          </div>

          <div style={TABLE_SHELL} className='hidden sm:block'>
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

            {/* `mode="wait"` ține cele trei stări una după alta: scheletul iese
                complet înainte să intre tabelul, altfel cele două s-ar suprapune
                o clipă și ar da impresia de salt. */}
            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                    <ReportRowSkeleton key={i} index={i} />
                  ))}
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="px-[22px] py-[34px] text-center text-body-sm text-danger"
                >
                  {error}
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <AnimatePresence initial={false}>
                    {rows.map((report, i) => (
                      <motion.div
                        key={report.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        // Decalaj mic, plafonat: primele rânduri intră în cascadă,
                        // dar un tabel lung nu așteaptă secunde până se așază.
                        transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.025 }}
                        style={GRID}
                        className="items-center border-b border-line-faint px-[22px] py-[15px] text-body-sm text-ink-700 transition-colors duration-150 hover:bg-surface-alt"
                      >
                        <span className="text-ink-600">{formatData(report.data)}</span>

                        <span className="truncate font-bold text-ink">{report.parc}</span>

                        <span className="flex min-w-0 flex-col gap-[3px]">
                          <span className="truncate text-cta text-ink-700">
                            {Array.isArray(report.echipa)
                              ? report.echipa.join(', ')
                              : (report.echipa || 'Echipă nespecificată')}
                          </span>
                          <span className="text-meta text-ink-400">
                            {Array.isArray(report.echipa) ? report.echipa.length : report.echipa ? 1 : 0} {
                              (Array.isArray(report.echipa) ? report.echipa.length : report.echipa ? 1 : 0) === 1
                                ? 'lucrător'
                                : 'lucrători'
                            }
                          </span>
                        </span>

                        <span className="text-right font-mono text-cta text-ink-700">
                          {formatNumar(report.ore_lucrate)}
                        </span>
                        <span className="text-right font-mono text-cta text-ink-700">
                          {formatNumar(report.inductie_ore)}
                        </span>
                        <span className="text-right font-mono text-cta text-ink-700">
                          {formatNumar(report.mediu_ore)}
                        </span>

                        <span
                          className={`text-right font-mono text-cta ${
                            report.near_miss > 0 ? 'font-bold text-danger' : 'text-ink-700'
                          }`}
                        >
                          {formatNumar(report.near_miss)}
                        </span>

                        <span
                          className="text-right font-mono text-cta text-ink-700"
                        >
                          {formatNumar(report.toolbox)}
                        </span>

                        <span className="text-right font-mono text-cta text-ink-700">
                          {formatNumar(report.mentenanta_corectiva)}
                        </span>
                        <span className="text-right font-mono text-cta text-ink-700">
                          {formatNumar(report.mentenanta_preventiva)}
                        </span>

                        <span className="justify-self-end flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleEdit(report)}
                            aria-label={`Editează raportul din ${formatData(report.data)} — ${report.parc}`}
                            className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-brand transition-colors duration-150 hover:text-brand-hover hover:underline"
                          >
                            Editează
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(report)}
                            aria-label={`Sterge raportul din ${formatData(report.data)} — ${report.parc}`}
                            className="cursor-pointer border-0 bg-transparent p-0 text-label font-bold uppercase tracking-label text-danger transition-colors duration-150 hover:text-danger-hover hover:underline"
                          >
                            Șterge
                          </button>
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {rows.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      className="px-[22px] py-[34px] text-center text-body-sm text-ink-400"
                    >
                      Nu există rapoarte care corespund filtrului selectat.
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-4 px-[22px] py-[13px] text-meta text-ink-400">
              {/* Cât se încarcă, contorul e o bară de lățimea textului pe care îl
                  înlocuiește, ca subsolul să nu se redimensioneze la sosirea datelor. */}
              {isLoading ? (
                <Skeleton className="h-[10px] w-[104px]" />
              ) : (
                <span>{`${rows.length} din ${reports.length} rapoarte`}</span>
              )}
            </div>
          </div>
        </Card>
      </main>
    </PageTransition>
  )
}