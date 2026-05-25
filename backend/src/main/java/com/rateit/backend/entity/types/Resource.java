package com.rateit.backend.entity.types;

public enum Resource {
    USER("User"),
    RATING("Rating"),
    RATING_COMMENT("Rating comment"),
    RATEABLE_ITEM("Rateable item"),
    RATING_SCALE("Rating scale");

    private final String value;

    Resource(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}
