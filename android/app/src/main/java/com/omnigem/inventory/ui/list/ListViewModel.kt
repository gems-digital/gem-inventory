package com.omnigem.inventory.ui.list

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.omnigem.inventory.data.inventory.InventoryRepository
import com.omnigem.inventory.data.inventory.ItemsResult
import com.omnigem.inventory.data.network.Item
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Exhaustive list screen state. */
sealed interface ListContent {
    data object Loading : ListContent
    data class Error(val message: String) : ListContent
    data class Ready(val items: List<Item>) : ListContent
}

data class ListUiState(
    val content: ListContent = ListContent.Loading,
    val filter: ProductTypeFilter = ProductTypeFilter.ALL,
    val query: String = "",
) {
    val isEmpty: Boolean
        get() = content is ListContent.Ready && content.items.isEmpty()
}

class ListViewModel(private val repository: InventoryRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(ListUiState())
    val uiState: StateFlow<ListUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun onFilterChange(filter: ProductTypeFilter) {
        if (filter == _uiState.value.filter) return
        _uiState.update { it.copy(filter = filter) }
        refresh()
    }

    fun onQueryChange(query: String) {
        _uiState.update { it.copy(query = query) }
    }

    /** Called on search submit (keyboard action) and after filter changes. */
    fun search() = refresh()

    fun refresh() {
        val current = _uiState.value
        _uiState.update { it.copy(content = ListContent.Loading) }
        viewModelScope.launch {
            val result = repository.listItems(
                productType = current.filter.apiValue,
                query = current.query,
            )
            val content = when (result) {
                is ItemsResult.Success -> ListContent.Ready(result.items)
                is ItemsResult.Failure -> ListContent.Error(result.message)
            }
            _uiState.update { it.copy(content = content) }
        }
    }

    class Factory(private val repository: InventoryRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return ListViewModel(repository) as T
        }
    }
}
