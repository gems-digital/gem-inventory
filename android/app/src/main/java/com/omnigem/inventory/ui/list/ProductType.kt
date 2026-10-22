package com.omnigem.inventory.ui.list

/**
 * Product-type filter options. `apiValue == null` means "Tất cả" (no filter).
 * Keeps the Vietnamese label next to the API enum value in one place.
 */
enum class ProductTypeFilter(val label: String, val apiValue: String?) {
    ALL("Tất cả", null),
    RING("Nhẫn", "ring"),
    BRACELET("Vòng", "bracelet"),
    BEADS("Chuỗi", "beads"),
    PENDANT("Mặt dây", "pendant"),
}

/** Display label for an item's productType enum value. */
fun productTypeLabel(apiValue: String): String = when (apiValue) {
    "ring" -> "Nhẫn"
    "bracelet" -> "Vòng"
    "beads" -> "Chuỗi hạt"
    "pendant" -> "Mặt dây"
    else -> apiValue
}

/** Display label for item kind. */
fun itemKindLabel(apiValue: String): String = when (apiValue) {
    "unique" -> "Độc bản"
    "batch" -> "Hàng loạt"
    else -> apiValue
}

/**
 * Mệnh options as (apiValue, displayLabel). The backend enum is ASCII
 * (Kim/Moc/Thuy/Hoa/Tho) — we send apiValue and show the diacritic label.
 */
val MENH_OPTIONS: List<Pair<String, String>> = listOf(
    "Kim" to "Kim",
    "Moc" to "Mộc",
    "Thuy" to "Thủy",
    "Hoa" to "Hỏa",
    "Tho" to "Thổ",
)

/** Display label for a menh enum value sent by / to the API. */
fun menhLabel(apiValue: String): String =
    MENH_OPTIONS.firstOrNull { it.first == apiValue }?.second ?: apiValue
