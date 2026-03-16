package ucll.be.dammonitorbackend.controller;

import ucll.be.dammonitorbackend.service.EarthEngineService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/earthengine")
public class EarthEngineController {
    
    private final EarthEngineService earthEngineService;
    
    public EarthEngineController(EarthEngineService earthEngineService) {
        this.earthEngineService = earthEngineService;
    }
    
    @GetMapping("/image")
    public ResponseEntity<byte[]> getSatelliteImage(
            @RequestParam double longitude,
            @RequestParam double latitude,
            @RequestParam(defaultValue = "2024-01-01") String startDate,
            @RequestParam(defaultValue = "2024-12-31") String endDate,
            @RequestParam(defaultValue = "5000") int radiusMeters,
            @RequestParam(defaultValue = "1024") int dimensions) throws IOException {
        
        byte[] image = earthEngineService.getDamSatelliteImage(
            longitude, latitude, startDate, endDate, radiusMeters, dimensions
        );
        
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .body(image);
    }
}