package ucll.be.dammonitorbackend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import ucll.be.dammonitorbackend.model.EnvironmentalReport;
import ucll.be.dammonitorbackend.model.ProblemType;
import ucll.be.dammonitorbackend.service.EnvironmentalReportService;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final EnvironmentalReportService reportService;

    public ReportController(EnvironmentalReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("description") String description,
            @RequestParam("problemType") ProblemType problemType) {
        try {
            EnvironmentalReport saved = reportService.createReport(file, description, problemType);
            return ResponseEntity.ok(toResponse(saved));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, ex.getMessage(), ex);
        } catch (IOException ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Failed to upload image.", ex);
        }
    }

    @GetMapping
    public ResponseEntity<List<ReportResponse>> listReports() {
        List<ReportResponse> reports = reportService.findAllReports().stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(reports);
    }

    private ReportResponse toResponse(EnvironmentalReport report) {
        return new ReportResponse(
                report.getId(),
                report.getDescription(),
                report.getProblemType(),
                report.getBlobName(),
                report.getImageUrl(),
                report.getCreatedAt());
    }

    public record ReportResponse(
            Long id,
            String description,
            ProblemType problemType,
            String blobName,
            String imageUrl,
            Instant createdAt) {
    }
}