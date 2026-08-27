# Permis Munca Electric

Web application for creating, signing, archiving, and reporting on electrical work permits. The interface is in Romanian and is designed around two roles:

- **Admins / issuers** create permits, send them through the signing workflow, review the archive, and manage site-report exports.
- **Non-admin users** submit and manage their own daily on-site reports.

The project contains an Express 5 + TypeScript API and a separate React 18 + Vite client. Supabase stores users, documents, and reports; Upstash Redis revokes logged-out JWTs; Namirial provides electronic signatures; Resend sends signing emails.

## Features

- JWT login, logout, session recovery, and role-based access control
- Electrical work permit form with risks, safety measures, PPE, confirmations, executants, working hours, and close-out fields
- AcroForm PDF generation from `src/assets/PERMIS_ELECTRIC_acroform.pdf`
- Two-step Namirial signing: issuer first, work supervisor second
- Signed-document ZIP download containing the signed PDF and audit trail
- Permit archive with status filters, search, signing-link access, and downloads
- User-owned daily site reports with create, edit, delete, filtering, and search
- Admin site-report view with park/month filters and Excel export
- Swagger/OpenAPI documentation at `/api-docs`

## Architecture

```text
client/                 React/Vite single-page application
src/app.ts              Express application and route registration
src/server.ts           Local HTTP server entry point
api/index.ts            Vercel serverless entry point
src/controllers/        Auth, permit, signing webhook, and site-report logic
src/lib/                Supabase, Redis, Namirial, PDF, and ZIP integrations
src/assets/              PDF template used to create permits
src/docs/openapi.ts     OpenAPI specification used by Swagger UI
```

The client calls `/api/...`. During local development, Vite proxies those requests to `VITE_API_URL`, or to `http://localhost:3030` when that variable is not set.

## Requirements

- Node.js 20 or newer (the project uses native `process.loadEnvFile()` and modern Node APIs)
- npm
- A Supabase project with the required tables and a `Documents` Storage bucket
- An Upstash Redis database
- Namirial API credentials and a public webhook URL for deployed signing callbacks
- A Resend API key and a verified sender/domain

## Configuration

Create a root `.env` file. It is ignored by Git. The API reads these variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Local API port; defaults to `3030` |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_API_KEY` | Supabase API key used by the server |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `NAMIRIAL_BASE_URL` | Namirial API base URL |
| `NAMIRIAL_API_TOKEN` | Namirial API token |
| `RESEND_API_KEY` | Resend API key |
| `APP_URL` | Public API/application URL used to build the Namirial callback URL |
| `WEBHOOK_SECRET` | Secret embedded in and verified on the Namirial webhook path |

For the client, copy `client/.env.example` to `client/.env` and set `VITE_API_URL` to the API origin. Leave it unset when the API runs locally on port 3030. `VITE_API_URL` is a Vite development proxy setting; API URLs in the application are otherwise relative `/api` paths.

## Local Development

Install dependencies for both packages:

```bash
npm install
npm --prefix client install
```

Start the API in one terminal:

```bash
npm run dev
```

Start the Vite client in another terminal:

```bash
npm run dev:client
```

Then open `http://localhost:5173`. The API is available at `http://localhost:3030`, and its interactive documentation is at `http://localhost:3030/api-docs`.

## Production Builds

Build the API TypeScript output and the client bundle separately:

```bash
npm run build
npm run build:client
```

Run the compiled API locally with:

```bash
npm start
```

The root `vercel.json` deploys `api/index.ts` as a Node function and includes the PDF assets. The client has its own Vercel configuration in `client/vercel.json`; it rewrites `/api/*` to `https://permis-munca-electric.vercel.app/api/*` and serves the Vite SPA fallback. Update that API hostname when deploying a different backend URL.

## Permit Signing Workflow

1. An admin submits the permit form.
2. The API fills and flattens the PDF, uploads the unsigned file to Supabase Storage, creates a Namirial envelope, and stores the permit as `pending_emitent`.
3. The issuer opens the returned Namirial signing link and signs first.
4. Namirial calls `/api/namirial/webhook/{WEBHOOK_SECRET}`. The API obtains the supervisor viewer link and sends it with the six-character access code using Resend.
5. The supervisor signs. A second webhook downloads the signed files, stores the signed PDF, creates a ZIP with the audit trail, and emails it to the supervisor.
6. The document reaches `completed` and becomes downloadable from the archive.

Transient `processing_invite` and `processing_final_zip` statuses are conditional-claim states. They prevent duplicate concurrent webhook work and allow Namirial retries after an email, storage, or provider failure.

## API Overview

Authenticated endpoints expect `Authorization: Bearer <JWT>` unless noted otherwise.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Public | Create a bcrypt-hashed user |
| `POST` | `/api/auth/login` | Public | Return a JWT valid for one day |
| `POST` | `/api/auth/logout` | Authenticated | Blacklist the current JWT in Redis |
| `GET` | `/api/auth/me` | Authenticated | Return the current user |
| `POST` | `/api/documents/new` | Admin | Generate a permit and Namirial envelope |
| `GET` | `/api/documents/all` | Admin | List permits owned by the current user |
| `GET` | `/api/documents/stats` | Admin | Return archive counters |
| `GET` | `/api/documents/:id` | Admin | Read one owned permit |
| `GET` | `/api/documents/:id/download` | Admin | Download the completed signed ZIP |
| `POST` | `/api/site-reports` | Authenticated | Create a personal daily report |
| `GET` | `/api/site-reports` | Authenticated | List personal reports |
| `PUT` | `/api/site-reports/:id` | Authenticated | Update an owned report |
| `DELETE` | `/api/site-reports/:id` | Authenticated | Delete an owned report |
| `GET` | `/api/site-reports/admin` | Admin | List all reports |
| `GET` | `/api/site-reports/admin/download` | Admin | Export filtered reports as `.xlsx` |
| `GET` / `POST` | `/api/namirial/webhook/:secret` | Namirial | Process signing callbacks |

The complete request and response schemas are available in the Swagger UI and the source specification at `src/docs/openapi.ts`.

## Data Prerequisites

The repository does not include SQL migrations. The Supabase project must provide at least:

- `users`: `id`, `email`, `username`, `password_hash`, and `admin`
- `documents`: permit metadata, signing links, envelope id, access code, workflow status, and signature timestamps
- `site_reports`: `user_id`, `parc`, `echipa`, `data`, and the numeric HSE/reporting fields used by `siteReportsController.ts`
- `Documents` Storage bucket, writable by the server key, with `initialDocs/` and `signedDocs/` object paths

The PDF template has a fixed AcroForm contract. Keep the slugs in `client/src/lib/constants.js` synchronized with the field names expected by `src/lib/utils.ts`; unsupported checkbox values or more than three executants cause PDF generation to fail.

## Testing

There is currently no automated test suite configured. `npm test` is the default placeholder command and exits with an error. `test.ts` is a scratch utility for inspecting signature coordinates and is excluded from the normal TypeScript build.

The JSON files `test-payload.json` and `test-payload-2.json` contain example permit payloads for manual API testing. The second payload intentionally contains values that do not match every current PDF enum, so validate payloads against the OpenAPI schema before sending them.

## Current Scope Notes

- Authentication tokens are kept in browser `localStorage`; deployment should use HTTPS and a strong `JWT_SECRET`.
- The Namirial webhook secret is the endpoint authentication mechanism and must remain private.
- The ESG report component exists at `client/src/pages/ESGReportPage.jsx`, but it is not currently registered as a route in `client/src/App.jsx` and its submit action is local UI feedback rather than an API call.
- Error handling and API response shapes are functional but not fully standardized; consult the controllers and OpenAPI document when integrating new clients.