package ucll.be.dammonitorbackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Service to validate environmental reports using a local AI model (Ollama).
 * Sends the report image to the Ollama model for classification.
 */
@Service
public class AIValidationService {

    private static final Logger logger = LoggerFactory.getLogger(AIValidationService.class);

    private final ObjectMapper objectMapper;
    private final String ollamaBaseUrl;
    private final String ollamaModel;

    public AIValidationService(
            ObjectMapper objectMapper,
            @Value("${ollama.base-url:http://localhost:11435}") String ollamaBaseUrl,
            @Value("${ollama.model:gemma3:12b}") String ollamaModel) {
        this.objectMapper = objectMapper;
        this.ollamaBaseUrl = ollamaBaseUrl;
        this.ollamaModel = ollamaModel;

        logger.info("=== AI Validation Service Initialized ===");
        logger.info("Ollama Base URL: {}", ollamaBaseUrl);
        logger.info("Ollama Model: {}", ollamaModel);
        logger.info("========================================");
    }

    /**
     * Validation result from AI model
     */
    public record ValidationResult(
            boolean approved,
            String reason) {
    }

    /**
     * Validates an environmental report image using the Ollama AI model.
     * The model will analyze the image and determine if it contains an
     * environmental issue.
     *
     * @param file The image file to validate
     * @return ValidationResult with approval status and reason
     */
    public ValidationResult validateImage(MultipartFile file) {
        try {
            logger.debug("Starting image validation for file: {}", file.getOriginalFilename());

            byte[] imageBytes = file.getBytes();
            logger.debug("Image size: {} bytes", imageBytes.length);

            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            logger.debug("Image encoded to base64: {} characters", base64Image.length());

            // Call Ollama API
            logger.info("Sending image to Ollama API at {} for validation with model: {}",
                    ollamaBaseUrl, ollamaModel);
            long startTime = System.currentTimeMillis();

            String response = callOllamaAPI(base64Image);

            long duration = System.currentTimeMillis() - startTime;
            logger.debug("Ollama API responded in {} ms", duration);

            // Parse response to determine approval
            ValidationResult result = parseOllamaResponse(response);

            if (result.approved()) {
                logger.info("✓ Image APPROVED: Environmental issue detected");
            } else {
                logger.info("✗ Image REJECTED: {}", result.reason());
            }

            return result;
        } catch (IOException e) {
            logger.error("IOException during image validation: {}", e.getMessage(), e);
            return new ValidationResult(false, "Image validation failed: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error during validation: {}", e.getMessage(), e);
            return new ValidationResult(false, "Unexpected validation error: " + e.getMessage());
        }
    }

    /**
     * Calls the Ollama API with the base64-encoded image.
     * Uses the HTTP endpoint for compatibility with local Ollama instances.
     */
    private String callOllamaAPI(String base64Image) throws IOException {
        try {
            // Build request for Ollama HTTP API
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", ollamaModel);
            requestBody.put("prompt", "Analyze this image for environmental issues.");
            requestBody.put("images", new String[] { base64Image });
            requestBody.put("stream", false);

            String requestJson = objectMapper.writeValueAsString(requestBody);

            // Since we're in a backend service, we'll use a ProcessBuilder to call ollama
            // CLI
            // as a simpler alternative to HTTP requests (works with local ollama
            // installations)
            return callOllamaCLI(base64Image);
        } catch (Exception e) {
            throw new IOException("Failed to call Ollama API: " + e.getMessage(), e);
        }
    }

    /**
     * Alternative method using Ollama CLI directly for local instances.
     * This approach is more reliable for local development.
     */
    private String callOllamaCLI(String base64Image) throws IOException {
        try {
            // Create a temporary image file or use process input
            // For now, we'll skip the CLI approach and use HTTP
            return callOllamaHTTP(base64Image);
        } catch (Exception e) {
            throw new IOException("Failed to execute Ollama: " + e.getMessage(), e);
        }
    }

    /**
     * Calls Ollama using HTTP API (requires Ollama running with API enabled).
     */
    private String callOllamaHTTP(String base64Image) throws IOException {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", ollamaModel);
            requestBody.put("prompt", "Analyze this environmental image for issues.");
            requestBody.put("images", new String[] { base64Image });
            requestBody.put("stream", false);

            String requestJson = objectMapper.writeValueAsString(requestBody);
            byte[] postData = requestJson.getBytes("UTF-8");

            // Make HTTP POST request to Ollama
            java.net.URL url = new java.net.URL(ollamaBaseUrl + "/api/generate");
            logger.debug("Connecting to Ollama at: {}", url);

            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Content-Length", String.valueOf(postData.length));
            conn.setDoOutput(true);
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(60000);

            logger.debug("Sending request to Ollama with image data...");
            try (java.io.OutputStream os = conn.getOutputStream()) {
                os.write(postData);
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            logger.debug("Ollama API response code: {}", responseCode);

            if (responseCode == 200) {
                try (java.io.InputStream is = conn.getInputStream()) {
                    String response = new String(is.readAllBytes(), "UTF-8");
                    logger.debug("Ollama API response length: {} characters", response.length());
                    return response;
                }
            } else {
                logger.error("Ollama API returned error code: {}", responseCode);
                throw new IOException("Ollama API returned status code: " + responseCode);
            }
        } catch (java.net.ConnectException e) {
            logger.error("❌ Failed to connect to Ollama at {}: {}", ollamaBaseUrl, e.getMessage());
            logger.error("Make sure Ollama is running on port 11435");
            throw new IOException("Cannot connect to Ollama at " + ollamaBaseUrl + ". Is it running?", e);
        } catch (Exception e) {
            logger.error("HTTP request to Ollama failed: {}", e.getMessage(), e);
            throw new IOException("HTTP request to Ollama failed: " + e.getMessage(), e);
        }
    }

    /**
     * Parses the Ollama model response to determine if the image was approved.
     * According to the Modelfile:
     * - If issue detected: responds with "true"
     * - If no issue: responds with {"result": false, "message": "reason"}
     */
    private ValidationResult parseOllamaResponse(String response) {
        try {
            // Try to parse as JSON first (for rejection response)
            try {
                JsonNode jsonResponse = objectMapper.readTree(response);

                // Check if it has "response" field (Ollama's JSON format)
                if (jsonResponse.has("response")) {
                    String modelResponse = jsonResponse.get("response").asText().trim();
                    return parseModelResponse(modelResponse);
                }

                // Direct JSON response from model
                if (jsonResponse.has("result")) {
                    boolean result = jsonResponse.get("result").asBoolean();
                    if (!result && jsonResponse.has("message")) {
                        String message = jsonResponse.get("message").asText();
                        return new ValidationResult(false, message);
                    }
                }
            } catch (Exception e) {
                // If not JSON, try parsing as plain text
            }

            // If response is just "true" or "false"
            return parseModelResponse(response.trim());

        } catch (Exception e) {
            // Default to rejection on parse error
            return new ValidationResult(false, "Could not parse AI model response");
        }
    }

    /**
     * Parses the model's direct text response.
     */
    private ValidationResult parseModelResponse(String response) {
        String trimmed = response.trim().toLowerCase();

        if (trimmed.equals("true") || trimmed.contains("issue detected")) {
            return new ValidationResult(true, "Image contains environmental issue - approved for review");
        }

        if (trimmed.equals("false")) {
            return new ValidationResult(false, "No environmental issue detected in image");
        }

        // If it's a JSON object in the response
        if (trimmed.contains("result")) {
            try {
                JsonNode node = objectMapper.readTree(trimmed);
                if (node.has("result")) {
                    boolean result = node.get("result").asBoolean();
                    String message = node.has("message") ? node.get("message").asText() : "No details provided";
                    return new ValidationResult(result, message);
                }
            } catch (Exception e) {
                // Fall through to default
            }
        }

        // Default response
        return new ValidationResult(false, "Image validation inconclusive: " + trimmed);
    }
}
