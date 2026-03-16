package ucll.be.dammonitorbackend.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ucll.be.dammonitorbackend.service.EarthEngineService;

import java.io.IOException;

@RestController
@RequestMapping("/api/test/satellite")
@CrossOrigin(origins = "*") // For testing only
public class SatelliteTestController {
    
    private final EarthEngineService earthEngineService;
    
    public SatelliteTestController(EarthEngineService earthEngineService) {
        this.earthEngineService = earthEngineService;
    }
    
    /**
     * Simple health check
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Satellite service is running!");
    }
    
    /**
     * Test with a well-known dam location
     * Example: Hartbeespoort Dam in South Africa
     */
    @GetMapping("/test-dam")
    public ResponseEntity<byte[]> testDam() {
        try {
            // Hartbeespoort Dam coordinates
            double longitude = 27.8546;
            double latitude = -25.7461;
            
            byte[] image = earthEngineService.getDamSatelliteImage(
                longitude, 
                latitude,
                "2024-01-01",  // Start date
                "2024-03-01",  // End date
                5000,          // 5km radius
                512            // 512x512 pixels
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentDispositionFormData("attachment", "hartbeespoort-dam.png");
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(image);
                
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Test with custom coordinates
     */
    @GetMapping("/image")
    public ResponseEntity<byte[]> getImage(
            @RequestParam double longitude,
            @RequestParam double latitude,
            @RequestParam(defaultValue = "2024-01-01") String startDate,
            @RequestParam(defaultValue = "2024-03-01") String endDate,
            @RequestParam(defaultValue = "5000") int radiusMeters,
            @RequestParam(defaultValue = "512") int dimensions) {
        
        try {
            byte[] image = earthEngineService.getDamSatelliteImage(
                longitude, 
                latitude,
                startDate,
                endDate,
                radiusMeters,
                dimensions
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentDispositionFormData("attachment", "satellite-image.png");
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(image);
                
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(("Error: " + e.getMessage()).getBytes());
        }
    }
}