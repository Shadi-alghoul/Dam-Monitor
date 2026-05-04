package ucll.be.dammonitorbackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ucll.be.dammonitorbackend.model.EnvironmentalReport;

import java.util.List;

public interface EnvironmentalReportRepository extends JpaRepository<EnvironmentalReport, Long> {
    List<EnvironmentalReport> findAllByOrderByCreatedAtDesc();

    List<EnvironmentalReport> findAllByAiApprovedTrueOrderByCreatedAtDesc();
}
