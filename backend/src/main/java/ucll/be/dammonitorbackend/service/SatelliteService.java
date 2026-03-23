package ucll.be.dammonitorbackend.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * SatelliteService
 *
 * Three-step flow:
 *
 *   1. OAuth2       — obtains a bearer token via client credentials.
 *
 *   2. Catalogue API — queries the Sentinel Hub STAC catalogue for the most
 *                      recent Sentinel-2 L2A scene over Hartbeespoort Dam with
 *                      ≤ 20 % cloud cover.  Reads the exact capture datetime
 *                      directly from {@code properties.datetime} in the response.
 *
 *   3. Process API  — fetches a true-colour JPEG, with the time window pinned to
 *                      the 24-hour day of the verified scene date so that the
 *                      image and the date are guaranteed to match.
 *
 * The result is a {@link SatelliteImageResult} whose {@code dateTaken} field
 * is sourced from the catalogue — it is the real satellite overpass time,
 * not an estimate.
 */
@Service
public class SatelliteService {

    private static final Logger log = LoggerFactory.getLogger(SatelliteService.class);

    // ── Injected properties ───────────────────────────────────────────────────

    @Value("${sentinel.hub.client-id}")
    private String clientId;

    @Value("${sentinel.hub.client-secret}")
    private String clientSecret;

    @Value("${sentinel.hub.token-url}")
    private String tokenUrl;

    @Value("${sentinel.hub.process-url}")
    private String processUrl;

    /** Added to application.properties:
     *  sentinel.hub.catalogue-url=https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search */
    @Value("${sentinel.hub.catalogue-url}")
    private String catalogueUrl;

    // ── Hartbeespoort Dam bounding box (WGS84 lon/lat) ───────────────────────

    private static final double BBOX_MIN_LON =  27.78822;
    private static final double BBOX_MIN_LAT = -25.77346;
    private static final double BBOX_MAX_LON =  27.907053;
    private static final double BBOX_MAX_LAT = -25.723519;

    // ── Output image dimensions ───────────────────────────────────────────────

    private static final int IMAGE_WIDTH  = 1920;
    private static final int IMAGE_HEIGHT = 1080;

    // ── Catalogue lookback window ─────────────────────────────────────────────
    // How many days back to search when looking for the latest cloud-free scene.
    private static final int CATALOGUE_LOOKBACK_DAYS = 30;

    private final WebClient webClient;

    public SatelliteService(WebClient webClient) {
        this.webClient = webClient;
    }

    // =========================================================================
    //  Public result type
    // =========================================================================

    /**
     * Carries both the image and its verified capture date.
     *
     * @param imageBytes  Raw JPEG bytes ready to stream to the client.
     * @param dateTaken   Exact satellite overpass time read from the Sentinel Hub
     *                    Catalogue API ({@code features[0].properties.datetime}).
     *                    This is not an estimate — it is the actual capture time
     *                    recorded in the STAC metadata.
     */
    public record SatelliteImageResult(byte[] imageBytes, Instant dateTaken) {}

    // =========================================================================
    //  Public API
    // =========================================================================

    /**
     * Fetches the most recent cloud-free Sentinel-2 image of Hartbeespoort Dam
     * together with its exact, catalogue-verified capture date.
     *
     * @return {@link SatelliteImageResult}
     * @throws RuntimeException on auth failure, no scenes found, or image fetch error
     */
    public SatelliteImageResult fetchSatelliteImage() {
        log.info("Fetching Sentinel-2 image for Hartbeespoort Dam");

        // Step 1 — authenticate once; token is reused for both subsequent calls
        String token = fetchAccessToken();
        log.info("Access token obtained");

        // Step 2 — ask the catalogue for the exact overpass time of the latest scene
        Instant dateTaken = fetchLatestSceneDate(token);
        log.info("Catalogue confirmed scene date: {}", dateTaken);

        // Step 3 — fetch the image pinned to that scene's calendar day
        byte[] imageBytes = fetchImage(token, dateTaken);
        log.info("Image received ({} bytes)", imageBytes.length);

        return new SatelliteImageResult(imageBytes, dateTaken);
    }

    // =========================================================================
    //  Step 1 — OAuth2 client-credentials token
    // =========================================================================

    private String fetchAccessToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type",    "client_credentials");
        form.add("client_id",     clientId);
        form.add("client_secret", clientSecret);

        JsonNode resp = webClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(form))
                .retrieve()
                .onStatus(
                        s -> s.is4xxClientError() || s.is5xxServerError(),
                        r -> r.bodyToMono(String.class).map(body -> {
                            log.error("Token request failed: {} — {}", r.statusCode(), body);
                            return new RuntimeException("Token failed: " + body);
                        })
                )
                .bodyToMono(JsonNode.class)
                .block();

        if (resp == null || !resp.has("access_token")) {
            throw new RuntimeException("No access_token in response");
        }
        return resp.get("access_token").asText();
    }

    // =========================================================================
    //  Step 2 — Catalogue API: resolve the exact capture datetime
    // =========================================================================

    /**
     * Calls the Sentinel Hub STAC Catalogue ({@code /catalog/1.0.0/search}) to
     * find the single most recent Sentinel-2 L2A scene that:
     * <ul>
     *   <li>intersects the Hartbeespoort Dam bounding box</li>
     *   <li>has ≤ 20 % cloud cover ({@code eo:cloud_cover})</li>
     *   <li>was captured within the last {@value #CATALOGUE_LOOKBACK_DAYS} days</li>
     * </ul>
     *
     * The catalogue response is a GeoJSON FeatureCollection.  With
     * {@code "sortby": [{ "field": "datetime", "direction": "desc" }]} and
     * {@code "limit": 1}, the first (and only) feature is guaranteed to be the
     * newest qualifying scene.  We read {@code features[0].properties.datetime}
     * — an ISO-8601 string such as {@code "2026-03-18T08:42:11Z"} — and parse
     * it directly into an {@link Instant}.
     *
     * @param token OAuth2 bearer token
     * @return the verified scene capture {@link Instant}
     */
    private Instant fetchLatestSceneDate(String token) {
        Instant now  = Instant.now();
        Instant from = now.minus(CATALOGUE_LOOKBACK_DAYS, ChronoUnit.DAYS);

        String catalogueBody = String.format("""
                {
                  "collections": ["sentinel-2-l2a"],
                  "bbox": [%f, %f, %f, %f],
                  "datetime": "%s/%s",
                  "limit": 1,
                  "sortby": [{ "field": "datetime", "direction": "desc" }],
                  "filter": {
                    "op": "lte",
                    "args": [
                      { "property": "eo:cloud_cover" },
                      20
                    ]
                  },
                  "filter-lang": "cql2-json"
                }
                """,
                BBOX_MIN_LON, BBOX_MIN_LAT, BBOX_MAX_LON, BBOX_MAX_LAT,
                from.toString(), now.toString()
        );

        log.debug("Catalogue request:\n{}", catalogueBody);

        JsonNode catalogueResp = webClient.post()
                .uri(catalogueUrl)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(catalogueBody)
                .retrieve()
                .onStatus(
                        s -> s.is4xxClientError() || s.is5xxServerError(),
                        r -> r.bodyToMono(String.class).map(body -> {
                            log.error("Catalogue API failed: {} — {}", r.statusCode(), body);
                            return new RuntimeException("Catalogue API failed: " + body);
                        })
                )
                .bodyToMono(JsonNode.class)
                .block();

        if (catalogueResp == null) {
            throw new RuntimeException("Null response from Catalogue API");
        }

        // GeoJSON FeatureCollection → features[0].properties.datetime
        JsonNode features = catalogueResp.path("features");
        if (!features.isArray() || features.isEmpty()) {
            throw new RuntimeException(
                    "No Sentinel-2 scenes found in the last " + CATALOGUE_LOOKBACK_DAYS
                    + " days with ≤ 20 % cloud cover over Hartbeespoort Dam. "
                    + "Consider increasing CATALOGUE_LOOKBACK_DAYS.");
        }

        String datetimeStr = features.get(0)
                .path("properties")
                .path("datetime")
                .asText(null);

        if (datetimeStr == null || datetimeStr.isBlank()) {
            throw new RuntimeException(
                    "Catalogue feature is missing properties.datetime — "
                    + "raw feature: " + features.get(0));
        }

        log.info("Catalogue properties.datetime = {}", datetimeStr);
        return Instant.parse(datetimeStr);  // e.g. "2026-03-18T08:42:11Z"
    }

    // =========================================================================
    //  Step 3 — Process API: fetch the image pinned to the verified scene date
    // =========================================================================

    /**
     * Requests a JPEG from the Sentinel Hub Process API.
     *
     * The time window is the 24-hour calendar day of {@code dateTaken}
     * (midnight-to-midnight UTC), ensuring the Process API renders the
     * same scene that the catalogue identified.
     *
     * @param token     OAuth2 bearer token
     * @param dateTaken exact scene capture time from the catalogue
     * @return raw JPEG bytes
     */
    private byte[] fetchImage(String token, Instant dateTaken) {
        // Pin to the calendar day of the exact scene — midnight UTC to midnight UTC
        Instant windowStart = dateTaken.truncatedTo(ChronoUnit.DAYS);
        Instant windowEnd   = windowStart.plus(1, ChronoUnit.DAYS);

        String requestBody = buildProcessRequestBody(windowStart, windowEnd);
        log.debug("Process API request:\n{}", requestBody);

        byte[] bytes = webClient.post()
                .uri(processUrl)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.IMAGE_JPEG)
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(
                        s -> s.is4xxClientError() || s.is5xxServerError(),
                        r -> r.bodyToMono(String.class).map(b -> {
                            log.error("Process API failed: {} — {}", r.statusCode(), b);
                            return new RuntimeException("Process API failed: " + b);
                        })
                )
                .bodyToMono(byte[].class)
                .block();

        if (bytes == null || bytes.length == 0) {
            throw new RuntimeException("Empty image response from Process API");
        }
        return bytes;
    }

    // =========================================================================
    //  Process API request body
    // =========================================================================

    /**
     * Builds the JSON payload for the Sentinel Hub Process API.
     *
     * Evalscript: true-colour composite —
     *   B04 (red), B03 (green), B02 (blue), scaled ×2.5 for visual brightness.
     *
     * @param from window start (00:00:00 UTC of the scene's calendar day)
     * @param to   window end   (00:00:00 UTC of the following day)
     */
    private String buildProcessRequestBody(Instant from, Instant to) {
        return String.format("""
                {
                  "input": {
                    "bounds": {
                      "bbox": [%f, %f, %f, %f]
                    },
                    "data": [{
                      "type": "sentinel-2-l2a",
                      "dataFilter": {
                        "timeRange": {
                          "from": "%s",
                          "to":   "%s"
                        },
                        "maxCloudCoverage": 20
                      }
                    }]
                  },
                  "output": {
                    "width":  %d,
                    "height": %d,
                    "responses": [{
                      "identifier": "default",
                      "format": { "type": "image/jpeg" }
                    }]
                  },
                  "evalscript": "//VERSION=3\\nfunction setup() {\\n  return {\\n    input: [\\"B02\\", \\"B03\\", \\"B04\\"],\\n    output: { bands: 3 }\\n  };\\n}\\nfunction evaluatePixel(sample) {\\n  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];\\n}"
                }
                """,
                BBOX_MIN_LON, BBOX_MIN_LAT, BBOX_MAX_LON, BBOX_MAX_LAT,
                from.toString(), to.toString(),
                IMAGE_WIDTH, IMAGE_HEIGHT
        );
    }
}