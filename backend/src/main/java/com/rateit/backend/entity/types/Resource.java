package com.rateit.backend.entity.types;

public enum Resource {
    USER("User"),
    RATING("Rating"),
    RATEABLE_ITEM("Rateable item");

    private final String value;

    Resource(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}
