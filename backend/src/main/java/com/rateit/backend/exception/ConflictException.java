package com.rateit.backend.exception;

import org.springframework.http.HttpStatus;

public class ConflictException extends BaseException {

    private ConflictException(String message) {
        super(message, null, ErrorCode.CONFLICT, HttpStatus.CONFLICT);
    }

    public static ConflictException conflict(String message) {
        return new ConflictException(message);
    }

    public static ConflictException ratingAlreadyExists(Long rateableItemId) {
        return new ConflictException("Current user has already rated rateable item " + rateableItemId);
    }
}
