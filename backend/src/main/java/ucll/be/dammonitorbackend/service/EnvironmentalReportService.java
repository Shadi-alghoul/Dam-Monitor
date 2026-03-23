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
            Instant satelliteTakenAt) throws IOException {
        validate(file, description, problemType);

        ImageStorageService.StoredImage storedImage = imageStorageService.uploadImage(file);

        EnvironmentalReport report = new EnvironmentalReport();
        report.setDescription(description.trim());
        report.setProblemType(problemType);
        report.setBlobName(storedImage.blobName());
        report.setImageUrl(storedImage.url());
        report.setSatelliteImageUrl(satelliteImageUrl);
        report.setSatelliteTakenAt(satelliteTakenAt);

        return reportRepository.save(report);
    }

    public List<EnvironmentalReport> findAllReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc();
    }

    private static void validate(MultipartFile file, String description, ProblemType problemType) {
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
    }
}
