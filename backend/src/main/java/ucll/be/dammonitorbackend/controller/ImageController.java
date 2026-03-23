package ucll.be.dammonitorbackend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import ucll.be.dammonitorbackend.service.ImageStorageService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageStorageService storageService;

    public ImageController(ImageStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) throws IOException {
        ImageStorageService.StoredImage storedImage = storageService.uploadImage(file);
        return ResponseEntity.ok(Map.of(
                "url", storedImage.url(),
                "blobName", storedImage.blobName()));
    }

    @GetMapping("/{blobName}")
    public ResponseEntity<byte[]> download(@PathVariable String blobName) {
        byte[] image = storageService.downloadImage(blobName);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG) // adjust as needed
                .body(image);
    }

    @DeleteMapping("/{blobName}")
    public ResponseEntity<Void> delete(@PathVariable String blobName) {
        storageService.deleteImage(blobName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<String>> list() {
        return ResponseEntity.ok(storageService.listImages());
    }
}