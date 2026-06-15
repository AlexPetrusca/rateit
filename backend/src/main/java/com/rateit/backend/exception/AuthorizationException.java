package com.rateit.backend.exception;

import org.springframework.http.HttpStatus;

public class AuthorizationException extends BaseException {

    private AuthorizationException(String message) {
        super(message, null, ErrorCode.AUTHORIZATION_ERROR, HttpStatus.FORBIDDEN);
    }

    public static AuthorizationException forbidden(String message) {
        return new AuthorizationException(message);
    }
}
