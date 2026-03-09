package ucll.be.dammonitorbackend.config; 

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "azure.storage")
public class AzureStorageProperties {

    private String accountName;
    private String accountKey;
    private String containerName;

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getAccountKey() { return accountKey; }
    public void setAccountKey(String accountKey) { this.accountKey = accountKey; }

    public String getContainerName() { return containerName; }
    public void setContainerName(String containerName) { this.containerName = containerName; }
}