package com.omnigem.inventory.data.inventory

import com.omnigem.inventory.data.network.InventoryApi
import com.omnigem.inventory.data.network.Item
import java.io.IOException

/** Outcome of a list fetch — exhaustive, no leaking exceptions to the UI. */
sealed interface ItemsResult {
    data class Success(val items: List<Item>) : ItemsResult
    data class Failure(val message: String) : ItemsResult
}

class InventoryRepository(private val inventoryApi: InventoryApi) {

    suspend fun listItems(productType: String? = null, query: String? = null): ItemsResult {
        return try {
            val response = inventoryApi.listItems(
                productType = productType?.takeIf { it.isNotBlank() },
                query = query?.trim()?.takeIf { it.isNotBlank() },
            )
            val body = response.body()
            when {
                response.isSuccessful && body?.success == true ->
                    ItemsResult.Success(body.data ?: emptyList())

                response.code() == 401 ->
                    ItemsResult.Failure("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.")

                else -> ItemsResult.Failure(
                    body?.error ?: "Không tải được danh sách (mã ${response.code()}).",
                )
            }
        } catch (e: IOException) {
            ItemsResult.Failure("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.")
        }
    }
}
