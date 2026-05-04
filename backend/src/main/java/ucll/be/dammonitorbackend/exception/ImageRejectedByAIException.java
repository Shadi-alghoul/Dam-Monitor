package ucll.be.dammonitorbackend.exception;

/**
 * Exception thrown when an image is rejected by AI validation.
 */
public class ImageRejectedByAIException extends RuntimeException {
    private final String rejectionReason;

    public ImageRejectedByAIException(String rejectionReason) {
        super("Image rejected by AI validation: " + rejectionReason);
        this.rejectionReason = rejectionReason;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }
}
