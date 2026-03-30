package ucll.be.dammonitorbackend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "environmental_reports")
public class EnvironmentalReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private ProblemType problemType;

    @Column(nullable = false, length = 512, unique = true)
    private String blobName;

    @Column(nullable = false, length = 2048)
    private String imageUrl;

    @Column(length = 2048)
    private String satelliteImageUrl;

    @Column
    private Instant satelliteTakenAt;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column
    private Integer pixelX;

    @Column
    private Integer pixelY;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
    
    public Long getId() {
        return id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ProblemType getProblemType() {
        return problemType;
    }

    public void setProblemType(ProblemType problemType) {
        this.problemType = problemType;
    }

    public String getBlobName() {
        return blobName;
    }

    public void setBlobName(String blobName) {
        this.blobName = blobName;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getSatelliteImageUrl() {
        return satelliteImageUrl;
    }

    public void setSatelliteImageUrl(String satelliteImageUrl) {
        this.satelliteImageUrl = satelliteImageUrl;
    }

    public Instant getSatelliteTakenAt() {
        return satelliteTakenAt;
    }

    public void setSatelliteTakenAt(Instant satelliteTakenAt) {
        this.satelliteTakenAt = satelliteTakenAt;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Integer getPixelX() {
        return pixelX;
    }

    public void setPixelX(Integer pixelX) {
        this.pixelX = pixelX;
    }

    public Integer getPixelY() {
        return pixelY;
    }

    public void setPixelY(Integer pixelY) {
        this.pixelY = pixelY;
    }
}
