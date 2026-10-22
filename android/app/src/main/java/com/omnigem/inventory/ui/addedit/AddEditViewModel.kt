package com.omnigem.inventory.ui.addedit

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.omnigem.inventory.data.inventory.InventoryRepository
import com.omnigem.inventory.data.inventory.ItemResult
import com.omnigem.inventory.data.inventory.PhotoRepository
import com.omnigem.inventory.data.inventory.PhotoUploadResult
import com.omnigem.inventory.data.network.Dimensions
import com.omnigem.inventory.data.network.Item
import com.omnigem.inventory.data.network.ItemInput
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

const val MAX_PHOTOS = 8

/** A photo already stored on the server, or one just picked locally. */
sealed interface PhotoRef {
    data class Remote(val url: String) : PhotoRef
    data class Local(val uri: Uri) : PhotoRef
}

data class AddEditUiState(
    val isEdit: Boolean = false,
    val loadingExisting: Boolean = false,
    val loadError: String? = null,
    val code: String = "",
    val name: String = "",
    val itemKind: String = "unique",
    val quantity: String = "1",
    val productType: String = "ring",
    val jadeType: String = "",
    val color: String = "",
    val size: String = "",
    val menh: Set<String> = emptySet(),
    val note: String = "",
    val costPrice: String = "",
    val salePrice: String = "",
    val floorPrice: String = "",
    // Slice 5 — dimension inputs keyed by Dimensions field name (enum values hold
    // their ASCII apiValue; "hasBail" holds "true"/"false"); attributes below.
    val dim: Map<String, String> = emptyMap(),
    val treatment: String? = null,
    val transparency: String? = null,
    val origin: String? = null,
    val weightGram: String = "",
    val certificateCode: String = "",
    val photos: List<PhotoRef> = emptyList(),
    val isSaving: Boolean = false,
    val error: String? = null,
    val fieldErrors: Map<String, String> = emptyMap(),
    val saved: Boolean = false,
) {
    val canAddPhotos: Boolean get() = photos.size < MAX_PHOTOS

    /**
     * Soft, non-blocking warning: sale price lower than floor or cost is likely
     * a typo but still allowed to save. Null when prices look fine / incomplete.
     */
    val priceWarning: String?
        get() {
            val sale = salePrice.toLongOrNull() ?: return null
            val issues = buildList {
                floorPrice.toLongOrNull()?.let { if (it > sale) add("giá sàn cao hơn giá bán") }
                costPrice.toLongOrNull()?.let { if (it > sale) add("giá nhập cao hơn giá bán") }
            }
            return if (issues.isEmpty()) null else "Kiểm tra lại: ${issues.joinToString(" và ")}"
        }
}

class AddEditViewModel(
    private val inventoryRepository: InventoryRepository,
    private val photoRepository: PhotoRepository,
    private val itemId: String?,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddEditUiState(isEdit = itemId != null))
    val uiState: StateFlow<AddEditUiState> = _uiState.asStateFlow()

    init {
        if (itemId != null) loadExisting(itemId)
    }

    private fun loadExisting(id: String) {
        _uiState.update { it.copy(loadingExisting = true, loadError = null) }
        viewModelScope.launch {
            when (val result = inventoryRepository.getItem(id)) {
                is ItemResult.Success -> _uiState.update { prefill(it, result.item) }
                is ItemResult.Failure ->
                    _uiState.update { it.copy(loadingExisting = false, loadError = result.message) }
            }
        }
    }

    private fun prefill(state: AddEditUiState, item: Item): AddEditUiState = state.copy(
        loadingExisting = false,
        code = item.code,
        name = item.name.orEmpty(),
        itemKind = item.itemKind,
        quantity = item.quantity.toString(),
        productType = item.productType,
        jadeType = item.jadeType.orEmpty(),
        color = item.color.orEmpty(),
        size = item.size.orEmpty(),
        menh = item.menh.toSet(),
        note = item.note.orEmpty(),
        costPrice = item.costPriceVnd?.toString().orEmpty(),
        salePrice = item.salePriceVnd.toString(),
        floorPrice = item.floorPriceVnd?.toString().orEmpty(),
        dim = dimToMap(item.dimensions),
        treatment = item.treatment,
        transparency = item.transparency,
        origin = item.origin,
        weightGram = item.weightGram?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() }.orEmpty(),
        certificateCode = item.certificateCode.orEmpty(),
        photos = item.photoUrls.map { PhotoRef.Remote(it) },
    )

    private fun dimToMap(d: Dimensions?): Map<String, String> {
        if (d == null) return emptyMap()
        val m = LinkedHashMap<String, String>()
        fun put(k: String, v: Any?) {
            if (v != null) m[k] = numOrText(v)
        }
        put("ringSizeVn", d.ringSizeVn); put("innerDiameterMm", d.innerDiameterMm)
        put("faceWidthMm", d.faceWidthMm); put("faceLengthMm", d.faceLengthMm); put("setting", d.setting)
        put("widthMm", d.widthMm); put("thicknessMm", d.thicknessMm)
        put("crossSection", d.crossSection); put("innerShape", d.innerShape)
        put("beadDiameterMm", d.beadDiameterMm); put("beadCount", d.beadCount)
        put("lengthCm", d.lengthCm); put("beadShape", d.beadShape); put("accessories", d.accessories)
        put("lengthMm", d.lengthMm); put("motif", d.motif)
        put("hasBail", d.hasBail); put("bail", d.bail)
        return m
    }

    private fun numOrText(v: Any): String = when (v) {
        is Double -> if (v % 1.0 == 0.0) v.toLong().toString() else v.toString()
        else -> v.toString()
    }

    fun onCode(v: String) = _uiState.update { it.copy(code = v, fieldErrors = it.fieldErrors - "code", error = null) }
    fun onName(v: String) = _uiState.update { it.copy(name = v) }
    fun onItemKind(v: String) = _uiState.update {
        // Unique items are 0/1 in stock; default quantity to 1 when switching.
        it.copy(itemKind = v, quantity = if (v == "unique") "1" else it.quantity)
    }
    fun onQuantity(v: String) = _uiState.update { it.copy(quantity = v.filter { c -> c.isDigit() }, fieldErrors = it.fieldErrors - "quantity") }
    fun onProductType(v: String) = _uiState.update { it.copy(productType = v) }
    fun onJadeType(v: String) = _uiState.update { it.copy(jadeType = v) }
    fun onColor(v: String) = _uiState.update { it.copy(color = v) }
    fun onSize(v: String) = _uiState.update { it.copy(size = v) }
    fun onNote(v: String) = _uiState.update { it.copy(note = v) }

    // Slice 5 — dimensions + attributes (all optional, never block saving).
    fun onDim(key: String, value: String) = _uiState.update {
        it.copy(dim = if (value.isBlank()) it.dim - key else it.dim + (key to value))
    }
    fun onTreatment(v: String?) = _uiState.update { it.copy(treatment = v) }
    fun onTransparency(v: String?) = _uiState.update { it.copy(transparency = v) }
    fun onOrigin(v: String?) = _uiState.update { it.copy(origin = v) }
    fun onWeight(v: String) = _uiState.update { it.copy(weightGram = v.filter { c -> c.isDigit() || c == '.' }) }
    fun onCertificate(v: String) = _uiState.update { it.copy(certificateCode = v) }

    fun onCost(v: String) = _uiState.update { it.copy(costPrice = digits(v), fieldErrors = it.fieldErrors - "costPrice") }
    fun onSale(v: String) = _uiState.update { it.copy(salePrice = digits(v), fieldErrors = it.fieldErrors - "salePrice") }
    fun onFloor(v: String) = _uiState.update { it.copy(floorPrice = digits(v), fieldErrors = it.fieldErrors - "floorPrice") }

    fun toggleMenh(value: String) = _uiState.update {
        val next = if (value in it.menh) it.menh - value else it.menh + value
        it.copy(menh = next)
    }

    fun addPhotos(uris: List<Uri>) = _uiState.update { state ->
        val room = MAX_PHOTOS - state.photos.size
        if (room <= 0) state
        else state.copy(photos = state.photos + uris.take(room).map { PhotoRef.Local(it) }, fieldErrors = state.fieldErrors - "photos")
    }

    fun removePhoto(index: Int) = _uiState.update { state ->
        if (index !in state.photos.indices) state
        else state.copy(photos = state.photos.toMutableList().apply { removeAt(index) })
    }

    fun save() {
        val state = _uiState.value
        if (state.isSaving) return

        val errors = validate(state)
        if (errors.isNotEmpty()) {
            _uiState.update { it.copy(fieldErrors = errors, error = "Vui lòng kiểm tra các trường còn thiếu.") }
            return
        }

        _uiState.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            val localUris = state.photos.filterIsInstance<PhotoRef.Local>().map { it.uri }
            val uploaded = when (val r = photoRepository.uploadNewPhotos(localUris)) {
                is PhotoUploadResult.Success -> r.publicUrls
                is PhotoUploadResult.Failure -> {
                    _uiState.update { it.copy(isSaving = false, error = r.message) }
                    return@launch
                }
            }

            // Re-assemble photoUrls in display order, replacing locals with uploaded URLs.
            val queue = ArrayDeque(uploaded)
            val photoUrls = state.photos.map { ref ->
                when (ref) {
                    is PhotoRef.Remote -> ref.url
                    is PhotoRef.Local -> queue.removeFirst()
                }
            }

            val dimensions = buildDimensions(state).takeUnless { it.isEmpty() }

            val input = ItemInput(
                code = state.code.trim(),
                name = state.name.trim().ifBlank { null },
                itemKind = state.itemKind,
                productType = state.productType,
                jadeType = state.jadeType.trim().ifBlank { null },
                color = state.color.trim().ifBlank { null },
                size = state.size.trim().ifBlank { null },
                menh = state.menh.toList(),
                note = state.note.trim().ifBlank { null },
                photoUrls = photoUrls,
                quantity = state.quantity.toIntOrNull() ?: 0,
                costPriceVnd = state.costPrice.toLongOrNull() ?: 0,
                salePriceVnd = state.salePrice.toLongOrNull() ?: 0,
                floorPriceVnd = state.floorPrice.toLongOrNull() ?: 0,
                dimensions = dimensions,
                treatment = state.treatment,
                transparency = state.transparency,
                origin = state.origin,
                weightGram = state.weightGram.toDoubleOrNull(),
                certificateCode = state.certificateCode.trim().ifBlank { null },
            )

            val result = if (itemId != null) {
                inventoryRepository.updateItem(itemId, input)
            } else {
                inventoryRepository.createItem(input)
            }

            when (result) {
                is ItemResult.Success -> _uiState.update { it.copy(isSaving = false, saved = true) }
                is ItemResult.Failure -> _uiState.update {
                    if (result.field != null) {
                        // e.g. duplicate code (409) → show inline on the field.
                        it.copy(
                            isSaving = false,
                            fieldErrors = it.fieldErrors + (result.field to result.message),
                            error = result.message,
                        )
                    } else {
                        it.copy(isSaving = false, error = result.message)
                    }
                }
            }
        }
    }

    /** Client-side validation mirroring the backend itemInputSchema. */
    private fun validate(state: AddEditUiState): Map<String, String> {
        val errors = mutableMapOf<String, String>()

        if (state.code.isBlank()) errors["code"] = "Vui lòng nhập mã món"

        when {
            state.photos.isEmpty() -> errors["photos"] = "Cần ít nhất 1 ảnh"
            state.photos.size > MAX_PHOTOS -> errors["photos"] = "Tối đa $MAX_PHOTOS ảnh"
        }

        val quantity = state.quantity.toIntOrNull()
        if (quantity == null || quantity < 0) errors["quantity"] = "Số lượng phải là số nguyên ≥ 0"

        if (!isNonNegativeLong(state.costPrice)) errors["costPrice"] = "Giá nhập phải là số ≥ 0"
        if (!isNonNegativeLong(state.salePrice)) errors["salePrice"] = "Giá bán phải là số ≥ 0"
        if (!isNonNegativeLong(state.floorPrice)) errors["floorPrice"] = "Giá sàn phải là số ≥ 0"

        if (state.productType.isBlank()) errors["productType"] = "Vui lòng chọn loại sản phẩm"
        if (state.itemKind.isBlank()) errors["itemKind"] = "Vui lòng chọn loại món"

        return errors
    }

    private fun isNonNegativeLong(raw: String): Boolean {
        val value = raw.toLongOrNull() ?: return false
        return value >= 0
    }

    /** Build Dimensions from the dim map, keeping ONLY the selected type's keys. */
    private fun buildDimensions(state: AddEditUiState): Dimensions {
        val d = state.dim
        fun i(k: String) = d[k]?.toIntOrNull()
        fun n(k: String) = d[k]?.toDoubleOrNull()
        fun s(k: String) = d[k]?.trim()?.ifBlank { null }
        fun b(k: String) = d[k]?.let { it == "true" }
        return when (state.productType) {
            "ring" -> Dimensions(
                ringSizeVn = i("ringSizeVn"),
                innerDiameterMm = n("innerDiameterMm"),
                faceWidthMm = n("faceWidthMm"),
                faceLengthMm = n("faceLengthMm"),
                setting = s("setting"),
            )
            "bracelet" -> Dimensions(
                innerDiameterMm = n("innerDiameterMm"),
                widthMm = n("widthMm"),
                thicknessMm = n("thicknessMm"),
                crossSection = s("crossSection"),
                innerShape = s("innerShape"),
            )
            "beads" -> Dimensions(
                beadDiameterMm = n("beadDiameterMm"),
                beadCount = i("beadCount"),
                lengthCm = n("lengthCm"),
                beadShape = s("beadShape"),
                accessories = s("accessories"),
            )
            "pendant" -> Dimensions(
                lengthMm = n("lengthMm"),
                widthMm = n("widthMm"),
                thicknessMm = n("thicknessMm"),
                motif = s("motif"),
                hasBail = b("hasBail"),
                bail = s("bail"),
            )
            else -> Dimensions()
        }
    }

    private fun digits(v: String): String = v.filter { it.isDigit() }

    class Factory(
        private val inventoryRepository: InventoryRepository,
        private val photoRepository: PhotoRepository,
        private val itemId: String?,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return AddEditViewModel(inventoryRepository, photoRepository, itemId) as T
        }
    }
}
