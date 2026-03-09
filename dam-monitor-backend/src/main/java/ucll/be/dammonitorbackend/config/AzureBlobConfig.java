package ucll.be.dammonitorbackend.config; 

import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.common.StorageSharedKeyCredential;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class AzureBlobConfig {

    @Autowired
    private AzureStorageProperties props;

    @Bean
    public BlobServiceClient blobServiceClient() {
        StorageSharedKeyCredential credential =
            new StorageSharedKeyCredential(props.getAccountName(), props.getAccountKey());

        return new BlobServiceClientBuilder()
            .endpoint("https://" + props.getAccountName() + ".blob.core.windows.net")
            .credential(credential)
            .buildClient();
    }

    @Bean
    public BlobContainerClient blobContainerClient(BlobServiceClient blobServiceClient) {
        BlobContainerClient containerClient =
            blobServiceClient.getBlobContainerClient(props.getContainerName());

        if (!containerClient.exists()) {
            containerClient.create();
        }
        return containerClient;
    }
}