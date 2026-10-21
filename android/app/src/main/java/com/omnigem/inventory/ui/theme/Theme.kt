package com.omnigem.inventory.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// Light-only scheme: this is an internal shop tool with a fixed ivory/jade look.
private val OmniGemColorScheme = lightColorScheme(
    primary = Jade,
    onPrimary = Surface,
    primaryContainer = JadeSoft,
    onPrimaryContainer = JadeDark,
    secondary = JadeDark,
    onSecondary = Surface,
    background = Ivory,
    onBackground = Ink,
    surface = Surface,
    onSurface = Ink,
    surfaceVariant = JadeSoft,
    onSurfaceVariant = Muted,
    outline = Line,
    error = WarnOrange,
    onError = Surface,
    errorContainer = WarnOrangeBg,
    onErrorContainer = WarnOrange,
)

@Composable
fun OmniGemTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = OmniGemColorScheme,
        typography = AppTypography,
        content = content,
    )
}
