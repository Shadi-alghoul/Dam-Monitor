package ucll.be.dammonitorbackend.controller;

import ucll.be.dammonitorbackend.service.SatelliteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SatelliteController
 *
 * Exposes a single REST endpoint:
 *
 *   GET /api/satellite
 *
 * On success  → 200 OK with Content-Type: image/jpeg and the raw PNG bytes
 * On failure  → 500 Internal Server Error with a plain-text error message
 *
 * Usage:
 *   curl http://localhost:8080/api/satellite --output satellite.jpg
 *   # or open in a browser — most browsers will render PNG directly
 */
@RestController
@RequestMapping("/api")
public class SatelliteController {

    private static final Logger log = LoggerFactory.getLogger(SatelliteController.class);

    private final SatelliteService satelliteService;

    public SatelliteController(SatelliteService satelliteService) {
        this.satelliteService = satelliteService;
    }

    /**
     * Fetches a Sentinel-2 satellite image and returns it as a PNG.
     *
     * No request parameters are needed — the area, date range, and image size
     * are all hardcoded inside SatelliteService.
     *
     * @return 200 + PNG bytes, or 500 + error message
     */
    @GetMapping(value = "/satellite", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getSatelliteImage() {
        log.info("Received GET /api/satellite request");

        try {
            byte[] imageBytes = satelliteService.fetchSatelliteImage();

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .contentLength(imageBytes.length)
                    // Optional: tell the browser to display inline rather than download
                    .header("Content-Disposition", "inline; filename=\"satellite.jpg\"")
                    .body(imageBytes);

        } catch (Exception ex) {
            log.error("Failed to retrieve satellite image", ex);

            // Return 500 with the error message as plain text
            // (avoids leaking internal stack traces while still being useful for debugging)
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    // Switch to plain text for the error body
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(("Error fetching satellite image: " + ex.getMessage()).getBytes());
        }
    }
}
