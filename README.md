# Dam Monitor

A full-stack satellite imaging monitoring application with a Spring Boot backend and React TypeScript frontend.

## Project Structure

```
dam-monitor-backend/
├── backend/               # Spring Boot REST API
│   ├── src/main/java/     # Backend source code
│   ├── pom.xml            # Maven dependencies
│   └── mvnw               # Maven wrapper
├── frontend/              # React + TypeScript SPA
│   ├── src/               # Frontend source code
│   ├── package.json       # NPM dependencies
│   └── vite.config.ts     # Vite configuration
└── README.md              # This file
```

## Features

- **User Authentication**: Register and login with email/username
- **Live Satellite Imagery**: Fetch real-time Sentinel-2 satellite images
- **Image Gallery**: View and manage stored satellite images
- **Protected Dashboard**: Authenticated users can view satellite data
- **Responsive UI**: Modern dark-themed interface with React Router

## Prerequisites

- **Java 17+** (for backend)
- **Node.js 18+** (for frontend)
- **Maven 3.6+** (comes with mvnw wrapper)
- **npm** (comes with Node.js)

## Setup & Installation

### 1. Backend Setup

From the `backend/` directory:

```bash
# Navigate to backend
cd backend

# The project uses Maven wrapper, so no separate Maven installation needed
# Dependencies will be downloaded automatically
```

### 2. Frontend Setup

From the `frontend/` directory:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install
```

## Running the Application

You need **two terminal windows** to run both services.

### Terminal 1: Start Backend

```bash
cd backend
mvn clean spring-boot:run
```

The backend will start on **http://localhost:8080**

Expected output:

```
Tomcat started on port 8080 (http) with context path '/'
Started DamMonitorBackendApplication in X seconds
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on **http://localhost:5173**

Expected output:

```
VITE v8.0.1 ready in X ms
➜  Local:   http://localhost:5173/
```

### 3. Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

## Authentication

### Demo Credentials

Use these credentials to test the application:

- **Username**: admin
- **Password**: admin123

Or create a new account using the registration page.

### How It Works

- **Register**: Create a new account with name, email, and password
- **Login**: Sign in with your registered email/username and password
- **Dashboard**: After login, view live satellite images and stored gallery

## API Endpoints

### Satellite Data

- `GET /api/satellite` - Fetch current Sentinel-2 satellite image (JPEG)

### Image Management

- `GET /api/images` - List all stored images
- `GET /api/images/{blobName}` - Get a specific stored image
- `POST /api/images/upload` - Upload a new image
- `DELETE /api/images/{blobName}` - Delete an image

## Building for Production

### Frontend Build

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`

### Backend Build

```bash
cd backend
mvn clean package
```

JAR file generated at `backend/target/dam-monitor-backend-0.0.1-SNAPSHOT.jar`

## Troubleshooting

### Backend won't start

1. Clear old compiled classes:

   ```bash
   mvn clean
   ```

2. Check Java version:
   ```bash
   java -version
   ```

### Frontend dev server stuck

1. Kill the process and restart:

   ```bash
   npm run dev
   ```

2. Clear npm cache if needed:
   ```bash
   npm cache clean --force
   ```

### Login not working

- Clear browser local storage for localhost:5173
- Try the demo credentials: admin / admin123
- Ensure backend is running on port 8080

## Tech Stack

**Backend:**

- Spring Boot 3.4.3
- Spring Security
- Hibernate/JPA
- H2 Database (in-memory)
- Maven

**Frontend:**

- React 19
- TypeScript 5.9
- Vite 8
- React Router 7
- CSS Grid/Flexbox

## Environment Variables

Backend uses application.properties for configuration. Key properties:

```properties
spring.application.name=dam-monitor-backend
spring.datasource.url=jdbc:h2:mem:dammonitordb
spring.jpa.hibernate.ddl-auto=update
```

For Azure Storage and Sentinel Hub integration, set environment variables:

- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_ACCOUNT_KEY`
- `AZURE_STORAGE_CONTAINER_NAME`
- `SENTINAL_HUB_CLIENT_ID`
- `SENTINAL_HUB_CLIENT_SECRET`

## Development Workflow

1. Backend runs on port 8080
2. Frontend dev server on port 5173 with API proxy to backend
3. Changes in TypeScript auto-reload via Vite HMR
4. Backend changes require manual restart

## License

Project created for satellite imaging monitoring system.

---

For more information, check the individual README files in `backend/` and `frontend/` directories.
