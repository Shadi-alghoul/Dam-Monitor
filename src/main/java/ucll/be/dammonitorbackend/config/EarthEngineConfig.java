package ucll.be.dammonitorbackend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

@Configuration
public class EarthEngineConfig {
    
    private final ResourceLoader resourceLoader;
    
    @Value("${google.earth.engine.service.account.key}")
    private String serviceAccountKeyPath;
    
    private static final String EARTH_ENGINE_SCOPE = 
        "https://www.googleapis.com/auth/earthengine";
    
    public EarthEngineConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }
    
    @Bean
    public GoogleCredentials googleCredentials() throws IOException {
        InputStream credentialsStream;
        
        if (serviceAccountKeyPath.startsWith("classpath:")) {
            Resource resource = resourceLoader.getResource(serviceAccountKeyPath);
            credentialsStream = resource.getInputStream();
        } else {
            credentialsStream = new java.io.FileInputStream(serviceAccountKeyPath);
        }
        
        return ServiceAccountCredentials
            .fromStream(credentialsStream)
            .createScoped(Collections.singleton(EARTH_ENGINE_SCOPE));
    }
}