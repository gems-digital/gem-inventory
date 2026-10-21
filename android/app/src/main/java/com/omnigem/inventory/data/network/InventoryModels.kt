package com.omnigem.inventory.data.network

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Inventory item as returned by the API. Margin fields are computed server-side
 * at read time (BUILD.md) — never stored, never recomputed on the client.
 * Sensitive prices (cost/floor) only ever travel over the authenticated channel.
 */
@JsonClass(generateAdapter = true)
data class Item(
    @Json(name = "id") val id: String,
    @Json(name = "code") val code: String,
    @Json(name = "name") val name: String? = null,
    @Json(name = "itemKind") val itemKind: String,          // "unique" | "batch"
    @Json(name = "productType") val productType: String,     // ring|bracelet|beads|pendant
    @Json(name = "jadeType") val jadeType: String? = null,
    @Json(name = "color") val color: String? = null,
    @Json(name = "size") val size: String? = null,
    @Json(name = "menh") val menh: List<String> = emptyList(),
    @Json(name = "note") val note: String? = null,
    @Json(name = "photoUrls") val photoUrls: List<String> = emptyList(),
    @Json(name = "quantity") val quantity: Int = 0,
    @Json(name = "costPriceVnd") val costPriceVnd: Long? = null,
    @Json(name = "salePriceVnd") val salePriceVnd: Long = 0,
    @Json(name = "floorPriceVnd") val floorPriceVnd: Long? = null,
    @Json(name = "marginVnd") val marginVnd: Long? = null,
    @Json(name = "marginPct") val marginPct: Double? = null,
    @Json(name = "belowFloorWarn") val belowFloorWarn: Boolean = false,
)

/** Pagination / summary metadata; all fields optional to stay tolerant. */
@JsonClass(generateAdapter = true)
data class ListMeta(
    @Json(name = "total") val total: Int? = null,
    @Json(name = "page") val page: Int? = null,
    @Json(name = "limit") val limit: Int? = null,
)

/** Envelope specialised for list endpoints so it can carry `meta`. */
@JsonClass(generateAdapter = true)
data class ItemsEnvelope(
    @Json(name = "success") val success: Boolean,
    @Json(name = "data") val data: List<Item>? = null,
    @Json(name = "error") val error: String? = null,
    @Json(name = "meta") val meta: ListMeta? = null,
)
