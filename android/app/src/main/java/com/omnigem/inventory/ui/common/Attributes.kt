package com.omnigem.inventory.ui.common

import com.omnigem.inventory.data.network.Dimensions

/**
 * Enum option tables for Slice 5 attributes/dimensions. Each entry is
 * (apiValue, Vietnamese label): we SEND the ASCII apiValue and SHOW the label,
 * the same convention as menh (avoids the earlier 400 on diacritics).
 */
typealias Options = List<Pair<String, String>>

val SETTING_OPTIONS: Options = listOf(
    "silver" to "Ổ bạc", "plated" to "Xi mạ", "alloy" to "Hợp kim",
    "gold" to "Vàng", "stone" to "Ổ đá",
)
val CROSS_SECTION_OPTIONS: Options = listOf(
    "round" to "Tròn", "flat" to "Dẹt", "bamboo" to "Trúc", "oval" to "Bầu dục",
)
val INNER_SHAPE_OPTIONS: Options = listOf("round" to "Tròn", "oval" to "Bầu dục")
val BEAD_SHAPE_OPTIONS: Options = listOf("round" to "Tròn", "cylinder" to "Trụ", "other" to "Khác")

val TREATMENT_OPTIONS: Options = listOf(
    "A" to "A (tự nhiên)", "B" to "B (tẩm)", "C" to "C (nhuộm)", "BC" to "B+C",
)
val TRANSPARENCY_OPTIONS: Options = listOf(
    "opaque" to "Đục", "semi" to "Bán trong", "translucent" to "Trong",
    "ice" to "Băng", "glassy" to "Thủy",
)
val ORIGIN_OPTIONS: Options = listOf(
    "myanmar" to "Myanmar", "china" to "Trung Quốc", "vietnam" to "Việt Nam", "other" to "Khác",
)

/** Look up a label for an apiValue; falls back to the raw value. */
fun labelOf(options: Options, apiValue: String?): String? {
    if (apiValue.isNullOrBlank()) return null
    return options.firstOrNull { it.first == apiValue }?.second ?: apiValue
}

/** Trim a Double for display: 56.0 -> "56", 12.5 -> "12.5". */
fun numText(value: Double?): String? {
    if (value == null) return null
    return if (value % 1.0 == 0.0) value.toLong().toString() else value.toString()
}

/**
 * Compact size summary from dimensions (per productType), e.g.
 * "ĐK trong 56 · bản 12mm". Null when there is nothing to show.
 */
fun dimensionsSummary(productType: String, dim: Dimensions?): String? {
    if (dim == null || dim.isEmpty()) return null
    val parts = when (productType) {
        "ring" -> listOfNotNull(
            numText(dim.ringSizeVn?.toDouble())?.let { "ni $it" },
            numText(dim.innerDiameterMm)?.let { "ĐK trong $it" },
            numText(dim.faceWidthMm)?.let { "bản ${it}mm" },
        )
        "bracelet" -> listOfNotNull(
            numText(dim.innerDiameterMm)?.let { "ĐK trong $it" },
            numText(dim.widthMm)?.let { "bản ${it}mm" },
            numText(dim.thicknessMm)?.let { "dày ${it}mm" },
        )
        "beads" -> listOfNotNull(
            numText(dim.beadDiameterMm)?.let { "hạt ${it}mm" },
            dim.beadCount?.let { "$it hạt" },
            numText(dim.lengthCm)?.let { "dài ${it}cm" },
        )
        "pendant" -> {
            val l = numText(dim.lengthMm)
            val w = numText(dim.widthMm)
            val t = numText(dim.thicknessMm)
            listOfNotNull(
                if (l != null && w != null) "${l}×${w}${t?.let { "×$it" } ?: ""}mm" else null,
            )
        }
        else -> emptyList()
    }
    return parts.takeIf { it.isNotEmpty() }?.joinToString(" · ")
}
