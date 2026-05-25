package com.rateit.backend.exception;

import org.springframework.http.HttpStatus;

public class BadRequestException extends BaseException {

    private BadRequestException(String message) {
        super(message, null, ErrorCode.BAD_REQUEST, HttpStatus.BAD_REQUEST);
    }

    public static BadRequestException invalidRating(String message) {
        return new BadRequestException(message);
    }
}
