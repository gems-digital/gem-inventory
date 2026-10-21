package com.omnigem.inventory.ui.list

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.ui.platform.LocalContext
import com.omnigem.inventory.data.network.Item
import com.omnigem.inventory.ui.theme.Ink
import com.omnigem.inventory.ui.theme.Ivory
import com.omnigem.inventory.ui.theme.Jade
import com.omnigem.inventory.ui.theme.JadeSoft
import com.omnigem.inventory.ui.theme.Muted
import com.omnigem.inventory.ui.theme.PositiveGreen
import com.omnigem.inventory.ui.theme.Surface
import com.omnigem.inventory.ui.theme.WarnOrange
import com.omnigem.inventory.ui.theme.WarnOrangeBg
import com.omnigem.inventory.ui.util.formatVnd

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ItemCard(
    item: Item,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(modifier = Modifier.padding(12.dp)) {
            ItemThumbnail(item)

            Column(
                modifier = Modifier
                    .padding(start = 12.dp)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = item.code,
                        color = Jade,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                    )
                    if (item.belowFloorWarn) {
                        BelowFloorBadge(modifier = Modifier.padding(start = 8.dp))
                    }
                }

                Text(
                    text = stockLine(item),
                    color = Muted,
                    style = MaterialTheme.typography.bodyMedium,
                )

                if (!item.name.isNullOrBlank()) {
                    Text(
                        text = item.name,
                        color = Ink,
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                val tags = buildTags(item)
                if (tags.isNotBlank()) {
                    Text(
                        text = tags,
                        color = Muted,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                PriceRow(item)
            }
        }
    }
}

@Composable
private fun ItemThumbnail(item: Item) {
    val photo = item.photoUrls.firstOrNull()
    Box(
        modifier = Modifier
            .size(84.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(JadeSoft),
        contentAlignment = Alignment.Center,
    ) {
        if (photo.isNullOrBlank()) {
            // Jade placeholder when there is no representative photo.
            Text(text = "💎", style = MaterialTheme.typography.headlineLarge)
        } else {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(photo)
                    .crossfade(true)
                    .build(),
                contentDescription = item.name ?: item.code,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(84.dp).clip(RoundedCornerShape(12.dp)),
            )
        }

        // Photo-count badge when there is more than one image.
        if (item.photoUrls.size > 1) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(4.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Ink.copy(alpha = 0.72f))
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            ) {
                Text(
                    text = "📷 ${item.photoUrls.size}",
                    color = Ivory,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun PriceRow(item: Item) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        PriceCell(label = "Giá bán", value = formatVnd(item.salePriceVnd), valueColor = Ink)
        PriceCell(label = "Giá sàn", value = formatVnd(item.floorPriceVnd), valueColor = Muted)
        PriceCell(
            label = "Lời",
            value = formatVnd(item.marginVnd),
            valueColor = if (item.belowFloorWarn) WarnOrange else PositiveGreen,
        )
    }
}

@Composable
private fun PriceCell(label: String, value: String, valueColor: androidx.compose.ui.graphics.Color) {
    Column {
        Text(text = label, color = Muted, style = MaterialTheme.typography.bodyMedium)
        Text(
            text = value,
            color = valueColor,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun BelowFloorBadge(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(WarnOrangeBg)
            .padding(horizontal = 8.dp, vertical = 2.dp),
    ) {
        Text(
            text = "⚠ SÁT SÀN",
            color = WarnOrange,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private fun stockLine(item: Item): String =
    "Tồn ${item.quantity} · ${itemKindLabel(item.itemKind)}"

private fun buildTags(item: Item): String =
    listOfNotNull(
        productTypeLabel(item.productType),
        item.jadeType?.takeIf { it.isNotBlank() },
        item.size?.takeIf { it.isNotBlank() }?.let { "size $it" },
    ).joinToString(" · ")
