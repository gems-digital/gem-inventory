package com.omnigem.inventory.ui.addedit

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.omnigem.inventory.data.inventory.InventoryRepository
import com.omnigem.inventory.data.inventory.PhotoRepository
import com.omnigem.inventory.ui.list.productTypeLabel
import com.omnigem.inventory.ui.theme.Ink
import com.omnigem.inventory.ui.theme.InternalChipBg
import com.omnigem.inventory.ui.theme.InternalChipFg
import com.omnigem.inventory.ui.theme.Ivory
import com.omnigem.inventory.ui.theme.Jade
import com.omnigem.inventory.ui.theme.JadeSoft
import com.omnigem.inventory.ui.theme.Line
import com.omnigem.inventory.ui.theme.Muted
import com.omnigem.inventory.ui.theme.Surface
import com.omnigem.inventory.ui.theme.WarnOrange

private val PRODUCT_TYPES = listOf("ring", "bracelet", "beads", "pendant")
private val MENH_VALUES = listOf("Kim", "Mộc", "Thủy", "Hỏa", "Thổ")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditScreen(
    inventoryRepository: InventoryRepository,
    photoRepository: PhotoRepository,
    itemId: String?,
    onBack: () -> Unit,
    onSaved: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel: AddEditViewModel = viewModel(
        factory = AddEditViewModel.Factory(inventoryRepository, photoRepository, itemId),
    )
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(state.saved) {
        if (state.saved) onSaved()
    }

    Scaffold(
        modifier = modifier,
        containerColor = Ivory,
        topBar = {
            TopAppBar(
                title = { Text(if (state.isEdit) "Sửa món" else "Thêm món") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹", color = Ivory) } },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Jade,
                    titleContentColor = Ivory,
                ),
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            PhotoSection(
                photos = state.photos,
                canAdd = state.canAddPhotos,
                error = state.fieldErrors["photos"],
                onPick = viewModel::addPhotos,
                onCapture = { viewModel.addPhotos(listOf(it)) },
                onRemove = viewModel::removePhoto,
            )

            Field("Mã *", state.code, viewModel::onCode, error = state.fieldErrors["code"])
            Field("Tên", state.name, viewModel::onName)

            SegmentedKind(selected = state.itemKind, onSelect = viewModel::onItemKind)
            Field(
                label = "Số lượng tồn",
                value = state.quantity,
                onChange = viewModel::onQuantity,
                keyboardType = KeyboardType.Number,
                error = state.fieldErrors["quantity"],
            )

            ProductTypeDropdown(selected = state.productType, onSelect = viewModel::onProductType)
            Field("Loại ngọc / chất liệu", state.jadeType, viewModel::onJadeType)
            Field("Màu", state.color, viewModel::onColor)
            Field("Kích thước / size", state.size, viewModel::onSize)

            MenhChips(selected = state.menh, onToggle = viewModel::toggleMenh)

            Field("Ghi chú", state.note, viewModel::onNote, singleLine = false)

            PriceCard(state, viewModel)

            val saveError = state.error
            if (saveError != null) {
                Text(saveError, color = WarnOrange, style = MaterialTheme.typography.bodyMedium)
            }

            Button(
                onClick = viewModel::save,
                enabled = !state.isSaving && !state.loadingExisting,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Jade, contentColor = Ivory),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                if (state.isSaving) {
                    CircularProgressIndicator(color = Ivory, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
                } else {
                    Text("Lưu món", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PhotoSection(
    photos: List<PhotoRef>,
    canAdd: Boolean,
    error: String?,
    onPick: (List<android.net.Uri>) -> Unit,
    onCapture: (android.net.Uri) -> Unit,
    onRemove: (Int) -> Unit,
) {
    val context = LocalContext.current
    var pendingCapture by remember { mutableStateOf<android.net.Uri?>(null) }

    val pickLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(MAX_PHOTOS),
    ) { uris -> if (uris.isNotEmpty()) onPick(uris) }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { ok ->
        val uri = pendingCapture
        if (ok && uri != null) onCapture(uri)
        pendingCapture = null
    }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            "Ảnh (${photos.size}/$MAX_PHOTOS)",
            color = Ink,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            photos.forEachIndexed { index, ref ->
                PhotoThumb(ref = ref, isRepresentative = index == 0, onRemove = { onRemove(index) })
            }
            if (canAdd) {
                AddTile(label = "＋ Thư viện") {
                    pickLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }
                AddTile(label = "📷 Chụp") {
                    val uri = createCaptureUri(context)
                    pendingCapture = uri
                    cameraLauncher.launch(uri)
                }
            }
        }
        if (error != null) {
            Text(error, color = WarnOrange, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun PhotoThumb(ref: PhotoRef, isRepresentative: Boolean, onRemove: () -> Unit) {
    val model = when (ref) {
        is PhotoRef.Remote -> ref.url
        is PhotoRef.Local -> ref.uri
    }
    Box(modifier = Modifier.size(96.dp)) {
        AsyncImage(
            model = model,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(12.dp))
                .border(1.dp, Line, RoundedCornerShape(12.dp)),
        )
        // Remove button.
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(4.dp)
                .size(22.dp)
                .clip(RoundedCornerShape(11.dp))
                .background(Ink.copy(alpha = 0.72f))
                .clickable { onRemove() },
            contentAlignment = Alignment.Center,
        ) {
            Text("✕", color = Ivory, style = MaterialTheme.typography.bodyMedium)
        }
        if (isRepresentative) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(4.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Jade)
                    .padding(horizontal = 6.dp, vertical = 1.dp),
            ) {
                Text("Đại diện", color = Ivory, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun AddTile(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(96.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(JadeSoft)
            .border(1.dp, Line, RoundedCornerShape(12.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = Jade, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SegmentedKind(selected: String, onSelect: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(JadeSoft)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        SegmentButton("Độc bản", selected == "unique", Modifier.weight(1f)) { onSelect("unique") }
        SegmentButton("Hàng loạt", selected == "batch", Modifier.weight(1f)) { onSelect("batch") }
    }
}

@Composable
private fun SegmentButton(label: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) Jade else androidx.compose.ui.graphics.Color.Transparent)
            .clickable { onClick() }
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (selected) Ivory else Ink,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun ProductTypeDropdown(selected: String, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = productTypeLabel(selected),
            onValueChange = {},
            readOnly = true,
            enabled = false,
            label = { Text("Loại sản phẩm") },
            trailingIcon = { Text(if (expanded) "▲" else "▼", color = Muted) },
            colors = OutlinedTextFieldDefaults.colors(
                disabledBorderColor = Line,
                disabledLabelColor = Muted,
                disabledTextColor = Ink,
                disabledTrailingIconColor = Muted,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
        // Transparent overlay captures the tap, since a disabled field ignores clicks.
        Box(
            modifier = Modifier
                .matchParentSize()
                .clip(RoundedCornerShape(4.dp))
                .clickable { expanded = true },
        )
        androidx.compose.material3.DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            PRODUCT_TYPES.forEach { type ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(productTypeLabel(type)) },
                    onClick = {
                        onSelect(type)
                        expanded = false
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun MenhChips(selected: Set<String>, onToggle: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Mệnh", color = Muted, style = MaterialTheme.typography.bodyLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MENH_VALUES.forEach { value ->
                FilterChip(
                    selected = value in selected,
                    onClick = { onToggle(value) },
                    label = { Text(value) },
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
}

@Composable
private fun PriceCard(state: AddEditUiState, viewModel: AddEditViewModel) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Surface)
            .padding(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PriceField("Giá nhập (VND)", state.costPrice, viewModel::onCost, internal = true, error = state.fieldErrors["costPrice"])
            PriceField("Giá bán (VND)", state.salePrice, viewModel::onSale, internal = false, error = state.fieldErrors["salePrice"])
            PriceField("Giá sàn (VND)", state.floorPrice, viewModel::onFloor, internal = true, error = state.fieldErrors["floorPrice"])
        }
    }
}

@Composable
private fun PriceField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    internal: Boolean,
    error: String?,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, color = Muted, style = MaterialTheme.typography.bodyMedium)
            if (internal) {
                Box(
                    modifier = Modifier
                        .padding(start = 6.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(InternalChipBg)
                        .padding(horizontal = 6.dp, vertical = 1.dp),
                ) {
                    Text("NỘI BỘ", color = InternalChipFg, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            singleLine = true,
            isError = error != null,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
            colors = fieldColors(),
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) Text(error, color = WarnOrange, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun Field(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    error: String? = null,
    singleLine: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        OutlinedTextField(
            value = value,
            onValueChange = onChange,
            label = { Text(label) },
            singleLine = singleLine,
            isError = error != null,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Next),
            colors = fieldColors(),
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) Text(error, color = WarnOrange, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Jade,
    unfocusedBorderColor = Line,
    focusedLabelColor = Jade,
    unfocusedLabelColor = Muted,
    cursorColor = Jade,
    focusedTextColor = Ink,
    unfocusedTextColor = Ink,
)
