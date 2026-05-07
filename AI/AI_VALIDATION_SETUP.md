# AI-Powered Environmental Report Validation

## Overview

This implementation adds automatic AI validation to the environmental report submission workflow using your local Ollama model. When a user submits an image report, it's validated against the AI model before being saved to the database.

## Architecture

### Workflow

```
User submits report
    ↓
Frontend sends image + metadata
    ↓
ReportController receives request
    ↓
AIValidationService calls Ollama API
    ↓
Model analyzes image (gemma3:12b)
    ↓
Returns: true (approved) or {"result": false, "message": "reason"}
    ↓
Backend stores result + approval status
    ↓
Frontend displays: ✓ Approved OR ✗ Rejected with reason
```

## Components

### Backend

#### 1. **AIValidationService** (`service/AIValidationService.java`)

- Handles communication with Ollama API
- Converts images to base64
- Sends HTTP POST request to Ollama's `/api/generate` endpoint
- Parses model responses (both JSON and plain text)
- Returns `ValidationResult(approved: Boolean, reason: String)`

**Key Methods:**

- `validateImage(MultipartFile)`: Main entry point
- `callOllamaHTTP()`: Makes HTTP request to Ollama
- `parseOllamaResponse()`: Interprets model output

#### 2. **EnvironmentalReport Model** (`model/EnvironmentalReport.java`)

- **New fields:**
  - `aiApproved` (Boolean): Validation result
  - `aiRejectionReason` (String, optional): Why it was rejected

#### 3. **EnvironmentalReportService** (`service/EnvironmentalReportService.java`)

- Updated `createReport()` to call `AIValidationService` before saving
- Sets approval status on the report entity
- Always saves to database (includes rejected reports for auditing)

#### 4. **ReportController** (`controller/ReportController.java`)

- Updated `ReportResponse` DTO to include:
  - `aiApproved`: Whether report passed AI validation
  - `aiRejectionReason`: Reason for rejection (if applicable)

### Database

#### Migration: `V2__add_ai_validation.sql`

```sql
ALTER TABLE environmental_reports
ADD COLUMN ai_approved BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN ai_rejection_reason VARCHAR(1000);
```

### Frontend

#### 1. **Types** (`src/types.ts`)

Updated `EnvironmentalReport` type:

```typescript
export type EnvironmentalReport = {
  // ... existing fields ...
  aiApproved: boolean;
  aiRejectionReason?: string;
};
```

#### 2. **ReportPage** (`pages/ReportPage.tsx`)

- **New state:** `submissionResult` tracks approval status
- **Updated submission handler:**
  - Calls updated API endpoint
  - Receives approval status in response
  - Shows different UI based on result
  - **Approved:** Green success message → redirect after 3s
  - **Rejected:** Red error message with reason → allow retry

## Configuration

### Application Properties

Add to `application.properties`:

```properties
# Ollama AI Model Configuration
ollama.base-url=${OLLAMA_BASE_URL:http://localhost:11435}
ollama.model=${OLLAMA_MODEL:gemma3:12b}
```

**Environment Variables:**

- `OLLAMA_BASE_URL`: URL to Ollama API (default: `http://localhost:11435`)
- `OLLAMA_MODEL`: Model name (default: `gemma3:12b`)

## Setup Instructions

### 1. Ensure Ollama is Running

```bash
# Navigate to AI folder
cd AI

# Start Ollama service on custom port
./start-ollama.ps1  # Windows PowerShell
# OR
./start-ollama.sh   # Linux/macOS

# In another terminal, pull the model (if not auto-pulled)
ollama pull gemma3:12b
```

Verify Ollama API is accessible:

```bash
curl -X POST http://localhost:11435/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:12b","prompt":"test"}'
```

### 2. Update Database

Run the migration:

```bash
# Spring will auto-run Flyway migrations on startup
# Or manually execute: src/main/resources/db/migration/V2__add_ai_validation.sql
```

### 3. Rebuild and Start Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### 4. Update Frontend

The frontend changes are already included. Just rebuild:

```bash
cd frontend
npm install
npm run dev
```

## Testing

### Test Image Validation

1. **Open the Report Page** in frontend
2. **Pin a location** on the satellite map
3. **Select an image** with clear environmental issue
4. **Submit** and observe:
   - **Approved:** ✓ Green message, redirects to dashboard
   - **Rejected:** ✗ Red message with reason, stays on form

### Manual API Test

```bash
curl -X POST http://localhost:8080/api/reports/upload \
  -F "file=@test_image.jpg" \
  -F "description=Test pollution" \
  -F "problemType=POLLUTION" \
  -F "latitude=-25.77" \
  -F "longitude=27.89"
```

Response:

```json
{
  "id": 1,
  "description": "Test pollution",
  "problemType": "POLLUTION",
  "aiApproved": true,
  "aiRejectionReason": null,
  ...
}
```

## AI Model Response Examples

The Modelfile specifies these response formats:

### Approved (Issue Detected)

```
true
```

### Rejected (No Issue)

```json
{ "result": false, "message": "No environmental issue detected in image" }
```

## Database Schema

### Reports Table Structure

```sql
CREATE TABLE environmental_reports (
    id SERIAL PRIMARY KEY,
    description VARCHAR(1000) NOT NULL,
    problem_type VARCHAR(64) NOT NULL,
    blob_name VARCHAR(512),
    image_url VARCHAR(2048),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    pixel_x INTEGER,
    pixel_y INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- NEW FIELDS:
    ai_approved BOOLEAN NOT NULL DEFAULT FALSE,
    ai_rejection_reason VARCHAR(1000)
);
```

## Frontend User Experience

### Approval Flow

```
Submit → Processing... → ✓ Approved! → Redirect to Dashboard (3s)
```

### Rejection Flow

```
Submit → Processing... → ✗ Rejected: [reason] → Stay on form, allow edit & retry
```

## Error Handling

### Network Errors

- If Ollama is unreachable → Report rejected with error message
- User can retry submission

### Parse Errors

- If response format unexpected → Defaults to rejection
- Error logged for debugging

### Image Errors

- Unsupported formats → Rejected before upload
- Corrupted images → AI returns rejection

## Performance Considerations

- **AI Processing Time:** 5-30 seconds per image (depending on model)
- **HTTP Timeout:** 60 seconds for Ollama requests
- **Async Option:** Consider making validation async for better UX
  - Show "In Review" status
  - Notify user when decision is made

## Future Enhancements

1. **Async Validation**
   - Return immediate response
   - Validate in background job
   - Update status via WebSocket/polling

2. **Admin Review Queue**
   - Manual review of rejected reports
   - Override AI decisions
   - Track false positives/negatives

3. **Multiple Models**
   - Compare results from multiple models
   - Weighted voting system
   - Confidence scoring

4. **Analytics**
   - Track approval/rejection rates
   - Monitor model performance
   - User engagement metrics

5. **Model Fine-Tuning**
   - Train on actual dam photos
   - Improve accuracy for specific issues
   - Domain-specific validation

## Troubleshooting

### Ollama Connection Error

```
Failed to call Ollama API: Connection refused
```

**Solution:** Ensure Ollama is running on correct host/port

### Model Not Found

```
Ollama API returned status code: 404
```

**Solution:** Run `ollama pull gemma3:12b`

### Timeout Error

```
Ollama API request timed out
```

**Solution:** Model may be loading. Increase timeout or check Ollama logs

### All Reports Being Rejected

- Check Ollama model output format
- Verify Modelfile is correctly configured
- Test with manual Ollama call

## Files Modified

### Backend

- `model/EnvironmentalReport.java` - Added AI fields
- `service/AIValidationService.java` - NEW
- `service/EnvironmentalReportService.java` - Updated to validate
- `controller/ReportController.java` - Updated DTO
- `resources/application.properties` - Added config
- `resources/db/migration/V2__add_ai_validation.sql` - NEW

### Frontend

- `src/types.ts` - Updated EnvironmentalReport type
- `src/pages/ReportPage.tsx` - Updated submission workflow and UI

### AI Scripts (in `AI/` folder)

- `start-ollama.ps1` - PowerShell startup
- `start-ollama.bat` - Batch startup
- `start-ollama.sh` - Bash startup
- `verify-ollama.ps1` - Verification script

## Security Notes

1. **Image Validation** - Backend validates image before sending to Ollama
2. **Timeout Protection** - 60-second timeout on Ollama requests
3. **Error Messages** - Generic errors to users, detailed logs for admin
4. **Database Audit Trail** - All submissions stored (approved + rejected)
