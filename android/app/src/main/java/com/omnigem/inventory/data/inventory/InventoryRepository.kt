package com.omnigem.inventory.data.inventory

import com.omnigem.inventory.data.network.InventoryApi
import com.omnigem.inventory.data.network.Item
import com.omnigem.inventory.data.network.ItemInput
import java.io.IOException

/** Outcome of a list fetch — exhaustive, no leaking exceptions to the UI. */
sealed interface ItemsResult {
    data class Success(val items: List<Item>) : ItemsResult
    data class Failure(val message: String) : ItemsResult
}

/** Outcome of a single-item fetch or save. */
sealed interface ItemResult {
    data class Success(val item: Item) : ItemResult
    // `field` names the form field a save error belongs to (e.g. "code" for a
    // duplicate code), so the UI can show it inline; null = general error.
    data class Failure(val message: String, val field: String? = null) : ItemResult
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

    suspend fun getItem(id: String): ItemResult {
        return try {
            val response = inventoryApi.getItem(id)
            val body = response.body()
            when {
                response.isSuccessful && body?.success == true && body.data != null ->
                    ItemResult.Success(body.data)

                response.code() == 404 -> ItemResult.Failure("Không tìm thấy món.")

                response.code() == 401 ->
                    ItemResult.Failure("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.")

                else -> ItemResult.Failure(
                    body?.error ?: "Không tải được chi tiết món (mã ${response.code()}).",
                )
            }
        } catch (e: IOException) {
            ItemResult.Failure("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.")
        }
    }

    suspend fun createItem(input: ItemInput): ItemResult =
        saveItem(input) { inventoryApi.createItem(input) }

    suspend fun updateItem(id: String, input: ItemInput): ItemResult =
        saveItem(input) { inventoryApi.updateItem(id, input) }

    private suspend inline fun saveItem(
        input: ItemInput,
        call: () -> retrofit2.Response<com.omnigem.inventory.data.network.ItemEnvelope>,
    ): ItemResult {
        return try {
            val response = call()
            val body = response.body()
            when {
                response.isSuccessful && body?.success == true && body.data != null ->
                    ItemResult.Success(body.data)

                response.code() == 409 ->
                    ItemResult.Failure("Mã \"${input.code}\" đã tồn tại.", field = "code")

                response.code() == 401 ->
                    ItemResult.Failure("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.")

                response.code() == 400 -> ItemResult.Failure(
                    body?.error ?: "Dữ liệu không hợp lệ. Kiểm tra lại các trường.",
                )

                else -> ItemResult.Failure(
                    body?.error ?: "Lưu món thất bại (mã ${response.code()}).",
                )
            }
        } catch (e: IOException) {
            ItemResult.Failure("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.")
        }
    }
}
