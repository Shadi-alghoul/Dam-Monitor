package ucll.be.dammonitorbackend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ucll.be.dammonitorbackend.model.EnvironmentalReport;
import ucll.be.dammonitorbackend.model.ProblemType;
import ucll.be.dammonitorbackend.repository.EnvironmentalReportRepository;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Service
public class EnvironmentalReportService {

    private final EnvironmentalReportRepository reportRepository;
    private final ImageStorageService imageStorageService;

    public EnvironmentalReportService(EnvironmentalReportRepository reportRepository,
            ImageStorageService imageStorageService) {
        this.reportRepository = reportRepository;
        this.imageStorageService = imageStorageService;
    }

    @Transactional
    public EnvironmentalReport createReport(MultipartFile file,
            String description,
            ProblemType problemType,
            String satelliteImageUrl,
            Instant satelliteTakenAt,
            Double latitude,
            Double longitude,
            Integer pixelX,
            Integer pixelY) throws IOException {

        validate(file, description, problemType, latitude, longitude);

        ImageStorageService.StoredImage storedImage = imageStorageService.uploadImage(file);

        EnvironmentalReport report = new EnvironmentalReport();
        report.setDescription(description.trim());
        report.setProblemType(problemType);
        report.setBlobName(storedImage.blobName());
        report.setImageUrl(storedImage.url());
        report.setSatelliteImageUrl(satelliteImageUrl);
        report.setSatelliteTakenAt(satelliteTakenAt);
        report.setLatitude(latitude);
        report.setLongitude(longitude);
        report.setPixelX(pixelX);
        report.setPixelY(pixelY);

        return reportRepository.save(report);
    }

    public List<EnvironmentalReport> findAllReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc();
    }

    // -------------------------------------------------------------------------
    //  Validation
    // -------------------------------------------------------------------------

    private static void validate(MultipartFile file,
            String description,
            ProblemType problemType,
            Double latitude,
            Double longitude) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required.");
        }
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed.");
        }
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("Description is required.");
        }
        if (description.length() > 1000) {
            throw new IllegalArgumentException("Description must be at most 1000 characters.");
        }
        if (problemType == null) {
            throw new IllegalArgumentException("Problem type is required.");
        }

        // Lat/lon must be supplied together or not at all
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("Latitude and longitude must both be provided together.");
        }
        if (latitude != null && (latitude < -90 || latitude > 90)) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90.");
        }
        if (longitude != null && (longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180.");
        }
    }
}
