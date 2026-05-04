package ucll.be.dammonitorbackend.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ImageRejectedByAIException.class)
    public ResponseEntity<?> handleAIRejection(ImageRejectedByAIException ex) {
        return ResponseEntity.ok().body(
                Map.of(
                        "success", false,
                        "aiApproved", false,
                        "reason", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleValidation(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(
                Map.of(
                        "success", false,
                        "error", ex.getMessage()));
    }
}