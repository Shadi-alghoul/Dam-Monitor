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

@Service
public class SatelliteService {

    private static final Logger log = LoggerFactory.getLogger(SatelliteService.class);

    @Value("${sentinel.hub.client-id}")
    private String clientId;

    @Value("${sentinel.hub.client-secret}")
    private String clientSecret;

    @Value("${sentinel.hub.token-url}")
    private String tokenUrl;

    @Value("${sentinel.hub.process-url}")
    private String processUrl;

    // ── Exact bounding box from your working curl request ────────────────────
    private static final double BBOX_MIN_LON =  27.78822;
    private static final double BBOX_MIN_LAT = -25.77346;
    private static final double BBOX_MAX_LON =  27.907053;
    private static final double BBOX_MAX_LAT = -25.723519;

    // ── Exact output dimensions from your working curl request ───────────────
    // Rounded to integers — Sentinel Hub requires whole numbers
    private static final int IMAGE_WIDTH  = 1920;
    private static final int IMAGE_HEIGHT = 1080;
   
    
    private final WebClient webClient;

    public SatelliteService(WebClient webClient) {
        this.webClient = webClient;
    }

    public byte[] fetchSatelliteImage() {
        log.info("Fetching Sentinel-2 image for Hartbeespoort Dam");
        String token = fetchAccessToken();
        log.info("Access token obtained");
        byte[] image = fetchImage(token);
        log.info("Image received ({} bytes)", image.length);
        return image;
    }

    // ── Step 1: OAuth2 token ─────────────────────────────────────────────────

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
                            log.error("Token failed: {} — {}", r.statusCode(), body);
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

    // ── Step 2: Process API → image bytes ────────────────────────────────────

    private byte[] fetchImage(String token) {
        String body = buildRequestBody();
        log.debug("Request body:\n{}", body);

        byte[] bytes = webClient.post()
                .uri(processUrl)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                // Changed to JPEG to match your working curl request
                .accept(MediaType.IMAGE_JPEG)
                .bodyValue(body)
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
            throw new RuntimeException("Empty image response");
        }
        return bytes;
    }

    // ── Request body — exact copy of your working curl request ───────────────

    private String buildRequestBody() {
      // setting the latest time range from now until 7 days ago to ensure we get a recent image,
      // since the curl request you provided had a fixed date range that may no longer contain any images
        Instant now = Instant.now();
        Instant from = now.minus(7, ChronoUnit.DAYS); // last 7 days (adjust if needed)

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
                from.toString(), now.toString(),
                IMAGE_WIDTH, IMAGE_HEIGHT
                
        );
    }
}
