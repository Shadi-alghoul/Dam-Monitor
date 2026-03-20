package ucll.be.dammonitorbackend.config; 

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Provides a shared, pre-built WebClient bean.
 *
 * We define it here so it is created once and reused across the application.
 * The default codec buffer size is raised to 10 MB to comfortably handle
 * satellite image payloads returned by the Sentinel Hub process API.
 */
@Configuration
public class WebClientConfig {

    private static final int MAX_IN_MEMORY_SIZE = 10 * 1024 * 1024; // 10 MB

    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
                // Increase the in-memory buffer limit; satellite images can be several MB.
                .codecs(configurer ->
                        configurer.defaultCodecs().maxInMemorySize(MAX_IN_MEMORY_SIZE))
                .build();
    }
}
