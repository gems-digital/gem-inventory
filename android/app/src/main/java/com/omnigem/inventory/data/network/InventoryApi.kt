package com.omnigem.inventory.data.network

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface InventoryApi {
    // Requires a valid JWT (added by AuthInterceptor). Optional filters are
    // omitted from the query string when null.
    @GET("inventory/items")
    suspend fun listItems(
        @Query("product_type") productType: String? = null,
        @Query("menh") menh: String? = null,
        @Query("q") query: String? = null,
    ): Response<ItemsEnvelope>
}
