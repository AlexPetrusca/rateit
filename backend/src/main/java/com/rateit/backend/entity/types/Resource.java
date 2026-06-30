package com.rateit.backend.entity.types;

public enum Resource {
    USER("User"),
    RATING("Rating"),
    RATING_COMMENT("Rating comment"),
    RATEABLE_ITEM("Rateable item"),
    RATING_SCALE("Rating scale"),
    SUGGESTION("Suggestion"),
    ADMIN_JOB("Admin job"),
    TOURNEY_TOURNAMENT("Tourney tournament"),
    TOURNEY_PLAYER("Tourney player"),
    TOURNEY_TOURNAMENT_PLAYER("Tourney tournament player"),
    TOURNEY_TEAM("Tourney team"),
    TOURNEY_MATCH("Tourney match");

    private final String value;

    Resource(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}
