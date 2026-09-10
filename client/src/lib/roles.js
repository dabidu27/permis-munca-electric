/**
 * Cine unde are voie.
 *
 * Utilizatorii non-admin au o singură pagină — rapoartele on-site proprii — așa
 * că navigația lor se reduce la ea: headerul nu le mai arată linkuri, iar
 * AppLayout îi întoarce pe `USER_HOME` din orice altă rută.
 *
 * Aici e doar regula de UI. Autorizarea reală stă în `requireAdmin` pe rutele de
 * API — un link ascuns nu protejează nimic prin el însuși.
 */

export const ADMIN_HOME = '/'
export const USER_HOME = '/pagina-rapoarte'

/** Rutele pe care le poate deschide un non-admin. */
const USER_PATHS = [USER_HOME, '/raport-zilnic']

/** Unde aterizează fiecare rol după autentificare. */
export const homePath = (role) => (role === 'superuser' || role === 'admin' ? ADMIN_HOME : USER_HOME)

/** Adminii ajung peste tot; ceilalți doar pe rutele din `USER_PATHS`. */
export const canVisit = (role, pathname) => role === 'superuser' || role === 'admin' || USER_PATHS.includes(pathname)
