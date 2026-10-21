package com.omnigem.inventory.ui.util

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

// Vietnamese money formatting: dot as thousands separator, "đ" suffix.
private val vndSymbols = DecimalFormatSymbols(Locale("vi", "VN")).apply {
    groupingSeparator = '.'
}
private val vndFormat = DecimalFormat("#,###", vndSymbols)

/** 1500000 -> "1.500.000 đ". Null/blank-safe for optional sensitive prices. */
fun formatVnd(amount: Long?): String {
    if (amount == null) return "—"
    return "${vndFormat.format(amount)} đ"
}

/** 0.42 -> "42%". Rounds to the nearest whole percent. */
fun formatPercent(fraction: Double?): String {
    if (fraction == null) return "—"
    return "${Math.round(fraction * 100)}%"
}
