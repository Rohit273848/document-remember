# Hearth Implementation Plan

## Objective

Deliver a family document workspace that stores document metadata in MongoDB Atlas, keeps files private in Cloudinary, enforces family membership and roles on the server, and schedules renewal reminders in each family’s time zone.

## Architecture

- **Web client:** React 18, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Recharts and Lucide. Pages are grouped by public access, dashboard, documents and family workspace. Shared auth, feedback, table and dialog components provide consistent behavior.
- **API:** Express REST API with route modules, controllers, Joi validation and centralized error handling. JWTs are stored in HttpOnly cookies; bcrypt hashes passwords.
- **Database:** MongoDB Atlas through Mongoose. Collections cover users, families, memberships, invitations, documents, versions, reminders, notifications and activity logs. Unique and query indexes support identity, membership, versioning and reminder de-duplication. Transactions group related writes where Atlas supports them.
- **File storage:** Cloudinary authenticated image assets for image uploads and authenticated raw assets for PDFs. The API checks membership and document access before issuing a short-lived signed download URL. MongoDB stores metadata and storage identifiers, never file bytes.
- **Background work:** `node-cron` scans due work on a schedule. Reminder creation is keyed by document, expiry snapshot, milestone and recipient; delivery status and notification history are persisted. SMTP email is optional for local development; in-app notification records use MongoDB.

## Delivery phases

| Phase | Work | Completion evidence |
|---|---|---|
| 1. Inspect and plan | Review workspace, choose module boundaries, data flows and security boundaries. | This plan and the source tree. |
| 2. Foundation | Set up the Vite client, Express server, workspace scripts, environment validation and shared error handling. | Client production build and server syntax checks. |
| 3. Persistence | Define Mongoose schemas, references, indexes and Atlas connection configuration. | Models and index setup script; live persistence requires Atlas credentials. |
| 4. Identity and access | Add registration, login/logout, reset flow, session cookie, family roles and server-side membership checks. | Auth and family route implementations; live account flows require Atlas and SMTP. |
| 5. Family workspace | Add family creation, invitations, membership changes, role assignment and Backup Person rules. | Family and invitation screens/API; invitation email requires SMTP. |
| 6. Document library | Add validated uploads, metadata, filtering, detail/edit/archive flows, renewal versions and authorized delivery. | Document routes, storage service and document screens; file flows require Cloudinary. |
| 7. Renewal engine | Calculate local calendar milestones, account for family time zones, handle expiry changes and prevent duplicate schedule records. | Date unit tests and reminder service/job. |
| 8. Notifications and activity | Persist in-app notices, delivery history and family-scoped audit events. | Notification, reminder and activity API modules and screens. |
| 9. Dashboard and UI | Connect dashboard totals/charts to API responses; finish responsive pages, empty/loading/error states and form feedback. | Dashboard and page modules; values come from API queries. |
| 10. Verification and handoff | Run automated checks, compile the client, document environment setup and explain remaining credential-dependent checks. | Results recorded below and in the README. |

## Access and data rules

- Family role membership is scoped by family, so a user may have different responsibilities across workspaces.
- The server resolves the active family and checks membership and role before returning or changing family data. Client-supplied family and owner IDs are not treated as proof of access.
- Document versions remain linked to their document; renewal updates the active metadata while preserving prior file identifiers and expiry snapshots.
- Invitations and password-reset links use expiring, hashed tokens. API responses exclude password hashes and storage credentials.
- Reminder scheduling uses local family dates and a unique key. Rescheduling changes pending work while preserving sent history.

## Verification status

- `npm test`: **passed, 6 tests**. Covers calendar date parsing, family-time-zone scheduling, daylight-saving offsets, expiry classification, the health handler and the standard not-found response.
- `npm run build`: **passed** after the current Recharts upgrade.
- Server JavaScript syntax checks: **passed** for every `.js` file under `server/`.
- `npm audit`: **0 reported vulnerabilities** on the installed dependency tree at the last audit.
- Not run against live services: registration/persistence, Cloudinary upload and signed download, SMTP delivery, invitation email and full browser end-to-end flows. These require the user’s Atlas, Cloudinary and SMTP settings in `.env`.

## Local run

Follow [README.md](README.md): copy `.env.example` to `.env`, configure the service settings, run `npm install`, then `npm run dev`. Use `npm test`, `npm run build` and `npm run indexes` for the documented checks and index initialization.
