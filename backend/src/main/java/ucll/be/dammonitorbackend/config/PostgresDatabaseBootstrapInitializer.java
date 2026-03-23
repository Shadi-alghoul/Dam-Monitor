package ucll.be.dammonitorbackend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Ensures the target PostgreSQL database from spring.datasource.url exists
 * before DataSource/JPA auto-configuration starts.
 */
public class PostgresDatabaseBootstrapInitializer
        implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static final Logger log = LoggerFactory.getLogger(PostgresDatabaseBootstrapInitializer.class);
    private static final Pattern JDBC_POSTGRES_PATTERN = Pattern.compile(
            "^jdbc:postgresql://([^/:?#]+)(?::(\\d+))?/([^?]+)(\\?.*)?$",
            Pattern.CASE_INSENSITIVE);

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        Environment env = applicationContext.getEnvironment();

        String jdbcUrl = firstNonBlank(
                env.getProperty("spring.datasource.url"),
                env.getProperty("DB_URL"));

        if (jdbcUrl == null || !jdbcUrl.toLowerCase(Locale.ROOT).startsWith("jdbc:postgresql://")) {
            return;
        }

        Matcher matcher = JDBC_POSTGRES_PATTERN.matcher(jdbcUrl);
        if (!matcher.matches()) {
            log.warn("Skipping PostgreSQL database bootstrap. Unsupported JDBC URL format: {}", jdbcUrl);
            return;
        }

        String host = matcher.group(1);
        String port = matcher.group(2) == null ? "5432" : matcher.group(2);
        String databaseName = matcher.group(3);
        String queryPart = matcher.group(4) == null ? "" : matcher.group(4);

        if (!isValidIdentifier(databaseName)) {
            log.warn("Skipping PostgreSQL database bootstrap. Invalid database name: {}", databaseName);
            return;
        }

        if ("postgres".equalsIgnoreCase(databaseName)) {
            return;
        }

        String username = firstNonBlank(
                env.getProperty("spring.datasource.username"),
                env.getProperty("DB_USERNAME"));
        String password = firstNonBlank(
                env.getProperty("spring.datasource.password"),
                env.getProperty("DB_PASSWORD"));

        String maintenanceJdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/postgres" + queryPart;

        try (Connection connection = DriverManager.getConnection(maintenanceJdbcUrl, username, password)) {
            if (databaseExists(connection, databaseName)) {
                return;
            }

            try (Statement statement = connection.createStatement()) {
                statement.execute("CREATE DATABASE \"" + databaseName + "\"");
                log.info("Created PostgreSQL database '{}' automatically.", databaseName);
            }
        } catch (SQLException e) {
            log.warn("Could not auto-create PostgreSQL database '{}'. {}", databaseName, e.getMessage());
        }
    }

    private static boolean databaseExists(Connection connection, String databaseName) throws SQLException {
        String sql = "SELECT 1 FROM pg_database WHERE datname = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, databaseName);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }
        }
    }

    private static boolean isValidIdentifier(String value) {
        return value != null && value.matches("[A-Za-z0-9_]+") && value.length() <= 63;
    }

    private static String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        if (second != null && !second.isBlank()) {
            return second;
        }
        return null;
    }
}
