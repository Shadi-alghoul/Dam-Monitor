# Dam Monitor

Satellite imaging monitoring app. Spring Boot backend + React frontend.

## Quick Start

### Prerequisites

- Java 17+, Node.js 18+

### Install & Run

**Terminal 1 (Backend):**

```bash
cd backend
mvn clean spring-boot:run
```

Runs on `http://localhost:8080`

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

**Backend:** Spring Boot 3.4.3, Spring Security, Hibernate, H2  
**Frontend:** React 19, TypeScript, Vite, React Router
