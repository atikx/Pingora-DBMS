# Pingora

**CS F212 Database Management Systems — Group 26 — Full-Stack Database Application**

Pingora is a community publishing platform. Users write and publish posts (optionally scheduled for later), like and comment on them (nested threads), subscribe to authors, and request administrator privileges through an approval process. All data lives in a PostgreSQL database; the application is a thin layer on top of it.

## Team

| # | Name | Student ID | Contribution |
|---|------|-----------|--------------|
| 1 | Atiksh Gupta | 2024A8PS0500H | Server-side code and database code. Integration of all layers. |
| 2 | Sudhansh Khandelwal | 2024AAPS0255H | Testing of the application and database behaviour; ER/EER modelling. |
| 3 | J. Bhanu Srikar | 2024AAPS0241H | Dockerisation (Docker Compose setup for the full stack) and Redis modelling. |
| 4 | Nihal Ahmed Khan T A | 2024A8PS0512H | Client-side code (React front end). |

## Final submission

| Item | Value |
|---|---|
| Git tag | `final` (the version submitted for evaluation) |
| Code commit hash | `4fd896a4238296fed7e425099fc6b52054dd797b` (tag `final` points to the following commit, which only records this hash in the docs) |
| Database Design Document | [`docs/Pingora_Design_Document.pdf`](docs/Pingora_Design_Document.pdf) (4 pages; source `docs/design_document.html`) |
| Demo Sheet | [`docs/Demo_Sheet_Group26.pdf`](docs/Demo_Sheet_Group26.pdf) (one page) |

## Tech stack

| Layer | Technology |
|---|---|
| Front end | React (Vite, TypeScript), Zustand, TanStack Query, Tailwind CSS, shadcn/ui, Recharts |
| Back end | Node.js (ES modules), Express REST API, `node-postgres` (`pg`) connection pool |
| Database | PostgreSQL 17 (extensions: `uuid-ossp`, `pg_trgm`, `pgcrypto`) |
| Other | Redis (response caching), Docker Compose, pgAdmin (database GUI for demo) |

## Quick start (Docker)

```bash
cp .env.sample .env                    # root .env (database password etc.)
cp server/.env.sample server/.env      # server secrets; see notes below
docker compose up -d --build
```

On the **first start with an empty database volume**, Postgres automatically runs, in order:

1. `server/schema/schema.sql` — tables, constraints, indexes, triggers
2. `server/schema/views.sql` — the six views
3. `server/schema/seed.sql` — demo data (10 users, 50 posts, 500 comments, ...)

| Service | URL |
|---|---|
| Web app | http://localhost:5173 |
| API | http://localhost:5000 |
| pgAdmin (database GUI, no login) | http://localhost:5050 |
| PostgreSQL | `localhost:3001` (user `postgres`) |

**Demo login** (all seeded users are verified admins): `1@1.1` … `10@10.10`, password `password123`.

`server/.env` must contain at least: `DB_USER=postgres`, `DB_PASSWORD` (same as the root `.env`, default `postgres`), `DB_HOST=postgres`, `DB_PORT=5432`, `DB_NAME=postgres`, `PORT=5000`, `ACCESS_TOKEN_SECRET`, `CLIENT_URL=http://localhost:5173`, `REDIS_HOST=redis`, `REDIS_PORT=6379` (the API will not start without Redis), plus mail and Cloudinary keys if you want e-mails and image upload to work.

### Re-creating the database

```bash
docker compose down -v          # WARNING: deletes the database volume
docker compose up -d
```

To reload only the demo data on a running database (this wipes posts, likes, comments, subscriptions and admin requests, never users):

```bash
docker compose exec -T postgres psql -U postgres < server/schema/seed.sql
```

### Without Docker

Install PostgreSQL 14+, then:

```bash
createdb pingora
psql -d pingora -f server/schema/schema.sql
psql -d pingora -f server/schema/views.sql
psql -d pingora -f server/schema/seed.sql
cd server && npm i && npm run dev        # needs Redis on localhost:6379
cd client && npm i && npm run dev
```

## Database design

Six relations: `users`, `posts`, `likes`, `comments`, `subscriptions`, `admin_requests`.
See the design document (final report) for the ER/EER diagram, relational mapping and normalization argument.

| File | Contents |
|---|---|
| `server/schema/schema.sql` | Tables, PK/FK/UNIQUE/NOT NULL/CHECK, 15 indexes, 2 trigger functions (6 triggers); commented-out proposed normalized tables |
| `server/schema/views.sql` | `post_stats`, `author_leaderboard`, `trending_posts`, `comment_threads`, `admin_request_overview`, `user_activity_summary` |
| `server/schema/seed.sql` | Re-runnable demo data (deterministic) |
| `server/schema/queries_demo.sql` | 8 showcase queries (join/group/having, subquery, NOT EXISTS, window functions, recursive CTE, ...) |

### DBMS features used

| Feature | Where |
|---|---|
| Integrity constraints | PRIMARY KEY, FOREIGN KEY (`ON DELETE CASCADE`), UNIQUE, NOT NULL, CHECK (9 named), ENUM `request_status` |
| Views (6) | `server/schema/views.sql`, read by the Reports page |
| Triggers | `set_updated_at` on 4 tables; `prevent_last_admin_loss` (update + delete) |
| Indexes (15) | B-tree, partial, GIN (arrays) and trigram GIN (`ILIKE '%text%'` search) |
| Transactions | Admin-request review: `BEGIN` / lock / 3 updates / `COMMIT` or `ROLLBACK` (`server/routes/admin.routes.js`) |
| Window functions, CTEs, recursive CTE, correlated subqueries | views and `queries_demo.sql` |

## Major application workflows

1. **Transaction — reviewing an admin request** (`Admin → Admin Requests`). Approve runs one transaction: lock the pending request (`SELECT ... FOR UPDATE`), mark it approved, promote the user, close the user's other pending requests, commit. The **Test rollback** button runs the same transaction, throws an error at the end and shows that every change was undone.
2. **Reporting — analytics dashboard** (`Admin → Reports → Analytics`). Nine live reports computed by PostgreSQL views and queries, each with its SQL and the DBMS concept it demonstrates, plus charts.
3. **Constraint enforcement — Integrity Lab** (`Admin → Reports → Integrity Lab`). Eleven scenarios try to break a rule (duplicate like, self-subscription, negative views, orphan foreign key, last admin removal, ...). Each runs in a transaction that is always rolled back; the page shows the SQLSTATE and constraint name the **database** raised. The same errors surface in normal use as friendly 4xx responses (for example, liking a post twice returns `409`).
4. **Everyday flows** — register / OTP verify, write and schedule posts, like, nested comments, subscribe, search and filter with pagination.

## Project structure

```
Pingora-DBMS/
├── client/                React front end
│   └── src/pages/reports/ Reports + Integrity Lab
├── server/
│   ├── routes/            Express routers (admin, reports, user, verifiedUser, general)
│   ├── queries/queries.js All SQL used by the API, plus the report definitions
│   ├── functions/         mailer, scheduler, DB-error mapping (dbErrors.js)
│   └── schema/            schema.sql, views.sql, seed.sql, queries_demo.sql
├── docker/pgadmin/        pgAdmin server registration
├── docs/                  Design document (PDF) and Demo Sheet
└── docker-compose.yml
```

## Screenshots

1. Home page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851477/Screenshot_2025-06-02_133232_mjahry.png)

2. Profile page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851574/Screenshot_2025-06-02_133605_uzuoea.png)

3. Final Post Upload Page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851805/Screenshot_2025-06-02_133957_yn9ufb.png)

4. Your Posts page
5. 
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851860/Screenshot_2025-06-02_134047_umual1.png)

6. Post page

![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748851976/Screenshot_2025-06-02_134243_ho2uvr.png)

6. Nested comments Section
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852321/Screenshot_2025-06-02_134829_ueltla.png)

7. Subscriptions page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852404/Screenshot_2025-06-02_134954_u0pqys.png)

8. Admin Requests page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852470/Screenshot_2025-06-02_135101_iibvfs.png)

9. New Post page
![App Screenshot](https://res.cloudinary.com/dae3h92th/image/upload/v1748852553/Screenshot_2025-06-02_135221_uamf9t.png)


