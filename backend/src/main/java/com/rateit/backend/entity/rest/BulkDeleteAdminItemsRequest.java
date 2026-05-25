package com.rateit.backend.entity.rest;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record BulkDeleteAdminItemsRequest(
    @NotEmpty List<Long> ids
) {}
