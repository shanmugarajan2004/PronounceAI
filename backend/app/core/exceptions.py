from fastapi import HTTPException, status

class AudioValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )

class AIServiceError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Speech evaluation AI service failed: {detail}"
        )

class ConsentRequiredError(HTTPException):
    def __init__(self, detail: str = "Explicit consent for speech processing is required."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )
