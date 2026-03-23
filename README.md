# Dam Monitor

Satellite imaging monitoring app. Spring Boot backend + React frontend.

## Quick Start

### Prerequisites

- Java 17+, Node.js 18+
- PostgreSQL 14+

### Install & Run

**Terminal 1 (Backend):**

```bash
cd backend
set DB_URL=jdbc:postgresql://localhost:5432/dammonitor
set DB_USERNAME=postgres
set DB_PASSWORD=postgres
mvn clean spring-boot:run
or
./mvnw.cmd clean spring-boot:run
```

Runs on `http://localhost:8080`

### Database Setup

- The backend now uses PostgreSQL as the only application database.
- On startup, the backend auto-creates the target PostgreSQL database from `DB_URL` if it does not exist yet.
- This requires a PostgreSQL user with permission to create databases (`CREATEDB`).
- H2 is enabled only for its web console UI at `http://localhost:8080/h2-console`.
- In the H2 console login screen, connect to PostgreSQL with:
  - `Driver Class`: `org.postgresql.Driver`
  - `JDBC URL`: same value as `DB_URL`
  - `User Name`: same value as `DB_USERNAME`
  - `Password`: same value as `DB_PASSWORD`

This way, H2 acts as a SQL console for the same PostgreSQL DB instead of creating a second database.

**Terminal 2 (Frontend):**

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

### Login

- **Username:** admin
- **Password:** admin123

Or register a new account.

## API Endpoints

- `GET /api/satellite` - Live satellite image
- `GET /api/images` - List stored images
- `POST /api/images/upload` - Upload image
- `DELETE /api/images/{blobName}` - Delete image

## Stack

**Backend:** Spring Boot 3.4.3, Spring Security, Hibernate, PostgreSQL (H2 console for admin UI)  
**Frontend:** React 19, TypeScript, Vite, React Router
