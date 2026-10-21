package com.omnigem.inventory.data.network

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Request body for create (POST) and update (PATCH). Mirrors Item minus the
 * server-computed margin fields. Optional text fields are nullable so Moshi
 * omits them when blank.
 */
@JsonClass(generateAdapter = true)
data class ItemInput(
    @Json(name = "code") val code: String,
    @Json(name = "name") val name: String? = null,
    @Json(name = "itemKind") val itemKind: String,
    @Json(name = "productType") val productType: String,
    @Json(name = "jadeType") val jadeType: String? = null,
    @Json(name = "color") val color: String? = null,
    @Json(name = "size") val size: String? = null,
    @Json(name = "menh") val menh: List<String> = emptyList(),
    @Json(name = "note") val note: String? = null,
    @Json(name = "photoUrls") val photoUrls: List<String> = emptyList(),
    @Json(name = "quantity") val quantity: Int,
    @Json(name = "costPriceVnd") val costPriceVnd: Long,
    @Json(name = "salePriceVnd") val salePriceVnd: Long,
    @Json(name = "floorPriceVnd") val floorPriceVnd: Long,
)

// --- Photo presign (direct upload to object storage) ---

@JsonClass(generateAdapter = true)
data class PhotoSignRequest(
    @Json(name = "files") val files: List<PhotoSignFile>,
)

@JsonClass(generateAdapter = true)
data class PhotoSignFile(
    @Json(name = "contentType") val contentType: String,
)

@JsonClass(generateAdapter = true)
data class PhotoSign(
    @Json(name = "uploadUrl") val uploadUrl: String,
    @Json(name = "publicUrl") val publicUrl: String,
    @Json(name = "key") val key: String? = null,
)

@JsonClass(generateAdapter = true)
data class PhotoSignEnvelope(
    @Json(name = "success") val success: Boolean,
    @Json(name = "data") val data: List<PhotoSign>? = null,
    @Json(name = "error") val error: String? = null,
)
