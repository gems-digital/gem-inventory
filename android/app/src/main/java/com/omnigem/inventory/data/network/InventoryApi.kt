package com.omnigem.inventory.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
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

    @GET("inventory/items/{id}")
    suspend fun getItem(@Path("id") id: String): Response<ItemEnvelope>

    @POST("inventory/items")
    suspend fun createItem(@Body body: ItemInput): Response<ItemEnvelope>

    @PATCH("inventory/items/{id}")
    suspend fun updateItem(@Path("id") id: String, @Body body: ItemInput): Response<ItemEnvelope>

    @POST("inventory/photos/sign")
    suspend fun signPhotos(@Body body: PhotoSignRequest): Response<PhotoSignEnvelope>
}
