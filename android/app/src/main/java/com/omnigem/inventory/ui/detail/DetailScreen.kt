package com.omnigem.inventory.ui.detail

import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import com.omnigem.inventory.data.inventory.InventoryRepository
import com.omnigem.inventory.data.network.Item
import com.omnigem.inventory.ui.common.ORIGIN_OPTIONS
import com.omnigem.inventory.ui.common.TRANSPARENCY_OPTIONS
import com.omnigem.inventory.ui.common.TREATMENT_OPTIONS
import com.omnigem.inventory.ui.common.dimensionsSummary
import com.omnigem.inventory.ui.common.labelOf
import com.omnigem.inventory.ui.common.numText
import com.omnigem.inventory.ui.icons.AppIcons
import com.omnigem.inventory.ui.list.itemKindLabel
import com.omnigem.inventory.ui.list.menhLabel
import com.omnigem.inventory.ui.list.productTypeLabel
import com.omnigem.inventory.ui.theme.Ink
import com.omnigem.inventory.ui.theme.InternalChipBg
import com.omnigem.inventory.ui.theme.InternalChipFg
import com.omnigem.inventory.ui.theme.Ivory
import com.omnigem.inventory.ui.theme.Jade
import com.omnigem.inventory.ui.theme.JadeSoft
import com.omnigem.inventory.ui.theme.Line
import com.omnigem.inventory.ui.theme.Muted
import com.omnigem.inventory.ui.theme.PositiveGreen
import com.omnigem.inventory.ui.theme.Surface
import com.omnigem.inventory.ui.theme.TagPillBg
import com.omnigem.inventory.ui.theme.WarnOrange
import com.omnigem.inventory.ui.theme.WarnOrangeBg
import com.omnigem.inventory.ui.util.formatPercent
import com.omnigem.inventory.ui.util.formatVnd
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailScreen(
    inventoryRepository: InventoryRepository,
    itemId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel: DetailViewModel = viewModel(
        factory = DetailViewModel.Factory(inventoryRepository, itemId),
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Load on every appearance (initial + each return), so the detail shows the
    // latest data right after an edit without any manual reload.
    LifecycleResumeEffect(Unit) {
        viewModel.load()
        onPauseOrDispose {}
    }

    Scaffold(
        modifier = modifier,
        containerColor = Ivory,
        topBar = {
            TopAppBar(
                title = { Text("Chi tiết món") },
                navigationIcon = { TextButton(onClick = onBack) { Text("‹", color = Ivory) } },
                actions = {
                    if (state is DetailState.Ready) {
                        TextButton(onClick = { onEdit(itemId) }) {
                            Text("Sửa", color = Ivory, fontWeight = FontWeight.SemiBold)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Jade,
                    titleContentColor = Ivory,
                ),
            )
        },
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            when (val s = state) {
                is DetailState.Loading -> Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator(color = Jade) }

                is DetailState.Error -> ErrorContent(s.message, onRetry = viewModel::load)

                is DetailState.Ready -> DetailContent(s.item)
            }
        }
    }
}

@Composable
private fun DetailContent(item: Item) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Gallery(item.photoUrls)

        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = item.code,
                color = Jade,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
            )
            if (!item.name.isNullOrBlank()) {
                Text(item.name, color = Ink, style = MaterialTheme.typography.headlineLarge)
            }
            TagChips(item)
        }

        PriceCard(item)
        SafetyBlock(item)
        SpecsList(item)
    }
}

@Composable
private fun Gallery(photoUrls: List<String>) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    val index = selected.coerceIn(0, (photoUrls.size - 1).coerceAtLeast(0))

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(16.dp))
                .background(JadeSoft),
            contentAlignment = Alignment.Center,
        ) {
            val current = photoUrls.getOrNull(index)
            if (current.isNullOrBlank()) {
                Icon(
                    painter = rememberVectorPainter(AppIcons.Gem),
                    contentDescription = null,
                    tint = Jade,
                    modifier = Modifier.size(56.dp),
                )
            } else {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(current).crossfade(true).build(),
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }

            if (photoUrls.size > 1) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Ink.copy(alpha = 0.72f))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                ) {
                    Text(
                        text = "${index + 1} / ${photoUrls.size}",
                        color = Ivory,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }

        if (photoUrls.size > 1) {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                photoUrls.forEachIndexed { i, url ->
                    val borderColor = if (i == index) Jade else Line
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(url).crossfade(true).build(),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .border(if (i == index) 2.dp else 1.dp, borderColor, RoundedCornerShape(10.dp))
                            .clickable { selected = i },
                    )
                }
            }
        }
    }
}

@Composable
private fun PriceCard(item: Item) {
    SurfaceCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            PriceLine("Giá bán niêm yết", formatVnd(item.salePriceVnd), Ink, internal = false)
            PriceLine("Giá sàn", formatVnd(item.floorPriceVnd), Ink, internal = true)
            PriceLine("Giá nhập", formatVnd(item.costPriceVnd), Ink, internal = true)
            HorizontalDivider(color = Line)
            Text(
                text = "Lời hiện tại ${signedVnd(item.marginVnd)} · ${formatPercent(item.marginPct)}",
                color = PositiveGreen,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun PriceLine(label: String, value: String, valueColor: androidx.compose.ui.graphics.Color, internal: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = Muted, style = MaterialTheme.typography.bodyLarge)
        if (internal) InternalChip(modifier = Modifier.padding(start = 8.dp))
        Box(modifier = Modifier.weight(1f))
        Text(
            value,
            color = valueColor,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun SafetyBlock(item: Item) {
    val headroom = headroomPercent(item) ?: return

    // Guard against bad data: floor >= sale makes "headroom" negative/meaningless.
    val floorAtOrAboveSale = headroom < 0
    val belowFloor = item.belowFloorWarn

    val (bg, fg, text) = when {
        floorAtOrAboveSale -> Triple(
            WarnOrangeBg,
            WarnOrange,
            "⚠ Giá sàn đang ≥ giá bán — kiểm tra lại giá",
        )
        belowFloor -> Triple(
            WarnOrangeBg,
            WarnOrange,
            "⚠ Sát sàn — chỉ còn ~$headroom% trước khi chạm sàn",
        )
        else -> Triple(
            JadeSoft,
            Jade,
            "✓ Còn dư địa giảm tới ~${headroom.coerceIn(0, 100)}% vẫn trên giá sàn",
        )
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .padding(16.dp),
    ) {
        Text(text = text, color = fg, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SpecsList(item: Item) {
    SurfaceCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SpecRow("Loại SP", productTypeLabel(item.productType))
            SpecRow("Loại ngọc", item.jadeType)
            SpecRow("Màu", item.color)
            SpecRow("Kích thước", dimensionsSummary(item.productType, item.dimensions) ?: item.size)
            SpecRow("Mệnh", item.menh.takeIf { it.isNotEmpty() }?.joinToString(" · ") { menhLabel(it) })
            item.treatment?.let { SpecRow("Phân loại", labelOf(TREATMENT_OPTIONS, it)) }
            item.transparency?.let { SpecRow("Độ trong", labelOf(TRANSPARENCY_OPTIONS, it)) }
            item.origin?.let { SpecRow("Nguồn gốc", labelOf(ORIGIN_OPTIONS, it)) }
            item.weightGram?.let { SpecRow("Trọng lượng", numText(it)?.let { g -> "$g g" }) }
            item.certificateCode?.let { SpecRow("Mã kiểm định", it) }
            SpecRow("Ghi chú", item.note)
        }
    }
}

@Composable
private fun SpecRow(label: String, value: String?) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            color = Muted,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.size(width = 110.dp, height = 24.dp),
        )
        Text(
            text = value?.takeIf { it.isNotBlank() } ?: "—",
            color = Ink,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun InternalChip(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(InternalChipBg)
            .padding(horizontal = 6.dp, vertical = 1.dp),
    ) {
        Text(
            text = "NỘI BỘ",
            color = InternalChipFg,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun SurfaceCard(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Surface)
            .padding(16.dp),
    ) { content() }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, color = Ink, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)
        Button(onClick = onRetry, shape = RoundedCornerShape(12.dp)) { Text("Thử lại") }
    }
}

// Rounded pill tags for the item's characteristics.
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TagChips(item: Item) {
    val tags = listOfNotNull(
        productTypeLabel(item.productType),
        item.jadeType?.takeIf { it.isNotBlank() },
        item.color?.takeIf { it.isNotBlank() },
        dimensionsSummary(item.productType, item.dimensions),
    )
    if (tags.isEmpty()) return

    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        tags.forEach { tag ->
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(7.dp))
                    .background(TagPillBg)
                    .padding(horizontal = 10.dp, vertical = 5.dp),
            ) {
                Text(tag, color = Ink, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

// --- helpers ---

/** Signed VND for margin, e.g. "+1.500.000 đ". */
private fun signedVnd(amount: Long?): String {
    if (amount == null) return "—"
    val sign = if (amount >= 0) "+" else ""
    return "$sign${formatVnd(amount)}"
}

/** round((sale-floor)/sale*100); null when it cannot be computed. */
private fun headroomPercent(item: Item): Int? {
    val sale = item.salePriceVnd
    val floor = item.floorPriceVnd ?: return null
    if (sale <= 0) return null
    return ((sale - floor).toDouble() / sale.toDouble() * 100).roundToInt()
}
