package com.omnigem.inventory.data.network

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// Shared response envelope: { success, data?, error?, meta? } (BUILD.md).
@JsonClass(generateAdapter = true)
data class ApiEnvelope<T>(
    @Json(name = "success") val success: Boolean,
    @Json(name = "data") val data: T? = null,
    @Json(name = "error") val error: String? = null,
)

@JsonClass(generateAdapter = true)
data class LoginRequest(
    @Json(name = "username") val username: String,
    @Json(name = "password") val password: String,
)

@JsonClass(generateAdapter = true)
data class LoginData(
    @Json(name = "token") val token: String,
    @Json(name = "user") val user: AuthUser,
)

@JsonClass(generateAdapter = true)
data class AuthUser(
    @Json(name = "id") val id: String,
    @Json(name = "username") val username: String,
    @Json(name = "role") val role: String,
)
