package com.omnigem.inventory.ui.list

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.omnigem.inventory.data.inventory.InventoryRepository
import com.omnigem.inventory.ui.theme.Ink
import com.omnigem.inventory.ui.theme.Ivory
import com.omnigem.inventory.ui.theme.Jade
import com.omnigem.inventory.ui.theme.JadeSoft
import com.omnigem.inventory.ui.theme.Muted

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ListScreen(
    inventoryRepository: InventoryRepository,
    onOpenItem: (String) -> Unit,
    onAddItem: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel: ListViewModel = viewModel(factory = ListViewModel.Factory(inventoryRepository))
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    // Re-fetch when returning to the list (e.g. after add/edit saves), but skip
    // the initial resume since the ViewModel already loads on creation.
    var firstResume by remember { mutableStateOf(true) }
    LifecycleResumeEffect(Unit) {
        if (firstResume) firstResume = false else viewModel.refresh()
        onPauseOrDispose {}
    }

    Scaffold(
        modifier = modifier,
        containerColor = Ivory,
        topBar = {
            TopAppBar(
                title = { Text("Danh sách hàng") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Jade,
                    titleContentColor = Ivory,
                ),
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddItem,
                containerColor = Jade,
                contentColor = Ivory,
            ) {
                Text(text = "＋", style = MaterialTheme.typography.headlineLarge)
            }
        },
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            SearchField(
                query = state.query,
                onQueryChange = viewModel::onQueryChange,
                onSearch = viewModel::search,
            )
            FilterChipRow(selected = state.filter, onSelect = viewModel::onFilterChange)

            when (val content = state.content) {
                is ListContent.Loading -> CenterBox { CircularProgressIndicator(color = Jade) }

                is ListContent.Error -> CenterBox {
                    ErrorState(message = content.message, onRetry = viewModel::refresh)
                }

                is ListContent.Ready ->
                    if (content.items.isEmpty()) {
                        CenterBox { EmptyState() }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            items(content.items, key = { it.id }) { item ->
                                ItemCard(item = item, onClick = { onOpenItem(item.id) })
                            }
                        }
                    }
            }
        }
    }
}

@Composable
private fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        singleLine = true,
        placeholder = { Text("🔍  Tìm theo mã hoặc tên") },
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(onSearch = { onSearch() }),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Jade,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            cursorColor = Jade,
            focusedTextColor = Ink,
            unfocusedTextColor = Ink,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterChipRow(
    selected: ProductTypeFilter,
    onSelect: (ProductTypeFilter) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        ProductTypeFilter.entries.forEach { filter ->
            FilterChip(
                selected = filter == selected,
                onClick = { onSelect(filter) },
                label = { Text(filter.label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Jade,
                    selectedLabelColor = Ivory,
                    containerColor = JadeSoft,
                    labelColor = Ink,
                ),
            )
        }
    }
}

@Composable
private fun EmptyState() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Chưa có món nào", color = Ink, style = MaterialTheme.typography.titleLarge)
        Text(
            "Nhấn ＋ để thêm món đầu tiên.",
            color = Muted,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = message,
            color = Ink,
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
        )
        Button(onClick = onRetry, shape = RoundedCornerShape(12.dp)) {
            Text("Thử lại")
        }
    }
}

@Composable
private fun CenterBox(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) { content() }
}
