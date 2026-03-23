package ucll.be.dammonitorbackend;

import ucll.be.dammonitorbackend.config.PostgresDatabaseBootstrapInitializer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DamMonitorBackendApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(DamMonitorBackendApplication.class);
        app.addInitializers(new PostgresDatabaseBootstrapInitializer());
        app.run(args);
    }

}
