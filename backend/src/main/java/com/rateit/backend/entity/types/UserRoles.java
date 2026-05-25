package com.rateit.backend.entity.types;

public final class UserRoles {

    public static final String USER = "ROLE_USER";
    public static final String ADMIN = "ROLE_ADMIN";
    public static final String TEST_USER = "ROLE_TEST_USER";

    private UserRoles() {
    }

    public static boolean isTestUser(String role) {
        return TEST_USER.equals(role);
    }
}
