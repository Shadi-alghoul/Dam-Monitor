package ucll.be.dammonitorbackend.service;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class EarthEngineService {
    
    private final GoogleCredentials credentials;
    private final WebClient webClient;
    private final Gson gson;
    
    private static final String EE_API_BASE = "https://earthengine.googleapis.com/v1";
    
    public EarthEngineService(GoogleCredentials credentials) {
        this.credentials = credentials;
        this.webClient = WebClient.builder().build();
        this.gson = new Gson();
    }
    
    private String getAccessToken() throws IOException {
        credentials.refreshIfExpired();
        AccessToken token = credentials.getAccessToken();
        return token.getTokenValue();
    }
    
    public byte[] getDamSatelliteImage(double longitude, double latitude, 
                                        String startDate, String endDate,
                                        int radiusMeters, int dimensions) throws IOException {
        
        String accessToken = getAccessToken();
        
        Map<String, Object> request = buildImageRequest(
            longitude, latitude, startDate, endDate, radiusMeters, dimensions
        );
        
        String thumbnailUrl = requestThumbnail(request, accessToken);
        
        return downloadImage(thumbnailUrl);
    }
    
    private Map<String, Object> buildImageRequest(double longitude, double latitude,
                                                    String startDate, String endDate,
                                                    int radiusMeters, int dimensions) {
        
        Map<String, Object> request = new HashMap<>();
        
        Map<String, Object> expression = new HashMap<>();
        Map<String, Object> functionInvocation = new HashMap<>();
        
        functionInvocation.put("functionName", "Image.visualize");
        
        Map<String, Object> arguments = new HashMap<>();
        
        arguments.put("image", buildSentinel2ImageCollection(longitude, latitude, startDate, endDate));
        
        arguments.put("bands", buildArrayValue("B4", "B3", "B2"));
        arguments.put("min", buildConstant(0));
        arguments.put("max", buildConstant(3000));
        
        functionInvocation.put("arguments", arguments);
        expression.put("functionInvocationValue", functionInvocation);
        
        request.put("expression", expression);
        request.put("fileFormat", "PNG");
        
        request.put("grid", Map.of(
            "dimensions", Map.of("width", dimensions, "height", dimensions)
        ));
        
        return request;
    }
    
    private Map<String, Object> buildSentinel2ImageCollection(double longitude, double latitude,
                                                                String startDate, String endDate) {
        Map<String, Object> firstCall = new HashMap<>();
        firstCall.put("functionName", "Collection.first");
        
        Map<String, Object> sortCall = new HashMap<>();
        sortCall.put("functionName", "Collection.sort");
        
        Map<String, Object> filterBoundsCall = new HashMap<>();
        filterBoundsCall.put("functionName", "Collection.filterBounds");
        
        Map<String, Object> filterDateCall = new HashMap<>();
        filterDateCall.put("functionName", "Collection.filterDate");
        
        Map<String, Object> loadCall = new HashMap<>();
        loadCall.put("functionName", "ImageCollection.load");
        loadCall.put("arguments", Map.of(
            "id", buildConstant("COPERNICUS/S2_SR")
        ));
        
        filterDateCall.put("arguments", Map.of(
            "collection", Map.of("functionInvocationValue", loadCall),
            "start", buildConstant(startDate),
            "end", buildConstant(endDate)
        ));
        
        filterBoundsCall.put("arguments", Map.of(
            "collection", Map.of("functionInvocationValue", filterDateCall),
            "geometry", buildPoint(longitude, latitude)
        ));
        
        sortCall.put("arguments", Map.of(
            "collection", Map.of("functionInvocationValue", filterBoundsCall),
            "property", buildConstant("CLOUDY_PIXEL_PERCENTAGE")
        ));
        
        firstCall.put("arguments", Map.of(
            "collection", Map.of("functionInvocationValue", sortCall)
        ));
        
        return Map.of("functionInvocationValue", firstCall);
    }
    
    private Map<String, Object> buildPoint(double longitude, double latitude) {
        Map<String, Object> pointCall = new HashMap<>();
        pointCall.put("functionName", "GeometryConstructors.Point");
        pointCall.put("arguments", Map.of(
            "coordinates", buildArrayValue(longitude, latitude)
        ));
        
        return Map.of("functionInvocationValue", pointCall);
    }
    
    private Map<String, Object> buildConstant(Object value) {
        return Map.of("constantValue", value);
    }
    
    private Map<String, Object> buildArrayValue(Object... values) {
        Object[] wrappedValues = new Object[values.length];
        for (int i = 0; i < values.length; i++) {
            wrappedValues[i] = buildConstant(values[i]);
        }
        
        return Map.of("arrayValue", Map.of("values", wrappedValues));
    }
    
    private String requestThumbnail(Map<String, Object> request, String accessToken) {
        String url = EE_API_BASE + "/projects/earthengine-legacy/thumbnails";
        
        String response = webClient.post()
            .uri(url)
            .header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(String.class)
            .block();
        
        JsonObject responseJson = gson.fromJson(response, JsonObject.class);
        return responseJson.get("name").getAsString();
    }
    
    private byte[] downloadImage(String imageUrl) {
        return webClient.get()
            .uri(imageUrl)
            .retrieve()
            .bodyToMono(byte[].class)
            .block();
    }
}