package ucll.be.dammonitorbackend.controller;

import ucll.be.dammonitorbackend.service.SatelliteService;
import ucll.be.dammonitorbackend.service.SatelliteService.SatelliteImageResult;
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
 * Exposes:
 *
 *   GET /api/satellite
 *
 * Success (200):
 *   Content-Type: image/jpeg
 *   X-Image-Date: <ISO-8601 exact scene capture time from Sentinel Hub catalogue>
 *   Body: raw JPEG bytes
 *
 * Failure (500):
 *   Content-Type: text/plain
 *   Body: error message
 *
 * Usage:
 *   curl -D - http://localhost:8080/api/satellite -o dam.jpg
 *   # -D - prints headers to stdout so you can see X-Image-Date
 */
@RestController
@RequestMapping("/api")
public class SatelliteController {

    private static final Logger log = LoggerFactory.getLogger(SatelliteController.class);

    /**
     * Response header carrying the exact satellite capture datetime.
     * Value is sourced from {@code features[0].properties.datetime} in the
     * Sentinel Hub Catalogue API — not an estimate.
     * Format: ISO-8601, e.g. {@code 2026-03-18T08:42:11Z}
     */
    private static final String HEADER_IMAGE_DATE = "X-Image-Date";

    private final SatelliteService satelliteService;

    public SatelliteController(SatelliteService satelliteService) {
        this.satelliteService = satelliteService;
    }

    /**
     * Returns the most recent cloud-free Sentinel-2 image of Hartbeespoort Dam.
     *
     * The exact capture date verified by the Sentinel Hub Catalogue API is
     * included in the {@code X-Image-Date} response header so the frontend
     * can display it alongside the image without a separate request.
     */
    @GetMapping(value = "/satellite", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getSatelliteImage() {
        log.info("Received GET /api/satellite request");

        try {
            SatelliteImageResult result = satelliteService.fetchSatelliteImage();

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .contentLength(result.imageBytes().length)
                    .header("Content-Disposition", "inline; filename=\"satellite.jpg\"")
                    // Exact capture datetime from the Sentinel Hub catalogue
                    .header(HEADER_IMAGE_DATE, result.dateTaken().toString())
                    .body(result.imageBytes());

        } catch (Exception ex) {
            log.error("Failed to retrieve satellite image", ex);

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(("Error fetching satellite image: " + ex.getMessage()).getBytes());
        }
    }
}