package ucll.be.dammonitorbackend.service;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.BlobItem;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ImageStorageService {

    public record StoredImage(String blobName, String url) {
    }

    private final BlobContainerClient containerClient;

    public ImageStorageService(BlobContainerClient containerClient) {
        this.containerClient = containerClient;
    }

    public StoredImage uploadImage(MultipartFile file) throws IOException {
        String blobName = UUID.randomUUID() + "-" + file.getOriginalFilename();
        BlobClient blobClient = containerClient.getBlobClient(blobName);
        blobClient.upload(file.getInputStream(), file.getSize(), true);
        BlobHttpHeaders headers = new BlobHttpHeaders().setContentType(file.getContentType());
        blobClient.setHttpHeaders(headers);
        return new StoredImage(blobName, blobClient.getBlobUrl());
    }

    public byte[] downloadImage(String blobName) {
        BlobClient blobClient = containerClient.getBlobClient(blobName);
        return blobClient.downloadContent().toBytes();
    }

    public String getImageUrl(String blobName) {
        return containerClient.getBlobClient(blobName).getBlobUrl();
    }

    public void deleteImage(String blobName) {
        containerClient.getBlobClient(blobName).deleteIfExists();
    }

    public List<String> listImages() {
        return containerClient.listBlobs()
                .stream()
                .map(BlobItem::getName)
                .collect(Collectors.toList());
    }
}