package com.omnigem.inventory.ui.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.omnigem.inventory.data.inventory.InventoryRepository
import com.omnigem.inventory.data.inventory.ItemResult
import com.omnigem.inventory.data.network.Item
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Exhaustive detail screen state. */
sealed interface DetailState {
    data object Loading : DetailState
    data class Error(val message: String) : DetailState
    data class Ready(val item: Item) : DetailState
}

class DetailViewModel(
    private val repository: InventoryRepository,
    private val itemId: String,
) : ViewModel() {

    private val _state = MutableStateFlow<DetailState>(DetailState.Loading)
    val state: StateFlow<DetailState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = DetailState.Loading
        viewModelScope.launch {
            _state.value = when (val result = repository.getItem(itemId)) {
                is ItemResult.Success -> DetailState.Ready(result.item)
                is ItemResult.Failure -> DetailState.Error(result.message)
            }
        }
    }

    class Factory(
        private val repository: InventoryRepository,
        private val itemId: String,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return DetailViewModel(repository, itemId) as T
        }
    }
}
