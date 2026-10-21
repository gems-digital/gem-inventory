package com.omnigem.inventory.ui.detail

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.omnigem.inventory.ui.theme.Ivory
import com.omnigem.inventory.ui.theme.Jade
import com.omnigem.inventory.ui.theme.Muted

/** Placeholder for item detail — built in slice 3. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailPlaceholderScreen(itemId: String, onBack: () -> Unit, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = Ivory,
        topBar = {
            TopAppBar(
                title = { Text("Chi tiết món") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹", color = Ivory) } },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Jade,
                    titleContentColor = Ivory,
                ),
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "Chi tiết món ($itemId) — sắp có",
                color = Muted,
                style = MaterialTheme.typography.bodyLarge,
            )
        }
    }
}
