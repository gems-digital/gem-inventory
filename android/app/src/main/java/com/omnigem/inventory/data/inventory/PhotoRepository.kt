package com.omnigem.inventory.data.inventory

import android.content.Context
import android.net.Uri
import com.omnigem.inventory.data.network.InventoryApi
import com.omnigem.inventory.data.network.PhotoSignFile
import com.omnigem.inventory.data.network.PhotoSignRequest
import com.omnigem.inventory.data.network.rewriteForEmulator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/** Result of uploading the newly picked local photos. */
sealed interface PhotoUploadResult {
    data class Success(val publicUrls: List<String>) : PhotoUploadResult
    data class Failure(val message: String) : PhotoUploadResult
}

/**
 * Handles the direct-to-storage photo flow: ask the server to presign one PUT
 * per file, upload the bytes, and return the public URLs in input order.
 */
class PhotoRepository(
    private val api: InventoryApi,
    private val appContext: Context,
    private val uploadClient: OkHttpClient,
) {
    private val fallbackType = "image/jpeg"

    suspend fun uploadNewPhotos(uris: List<Uri>): PhotoUploadResult {
        if (uris.isEmpty()) return PhotoUploadResult.Success(emptyList())

        return try {
            val contentTypes = uris.map { resolveType(it) }
            val signResponse = api.signPhotos(
                PhotoSignRequest(files = contentTypes.map { PhotoSignFile(it) }),
            )
            val signs = signResponse.body()?.data
            if (!signResponse.isSuccessful || signResponse.body()?.success != true || signs == null) {
                return PhotoUploadResult.Failure(
                    signResponse.body()?.error ?: "Không ký được URL tải ảnh (mã ${signResponse.code()}).",
                )
            }
            if (signs.size != uris.size) {
                return PhotoUploadResult.Failure("Số URL ký không khớp số ảnh.")
            }

            val publicUrls = ArrayList<String>(uris.size)
            uris.forEachIndexed { index, uri ->
                val sign = signs[index]
                val ok = putObject(uri, rewriteForEmulator(sign.uploadUrl), contentTypes[index])
                if (!ok) return PhotoUploadResult.Failure("Tải ảnh lên thất bại.")
                publicUrls.add(rewriteForEmulator(sign.publicUrl))
            }
            PhotoUploadResult.Success(publicUrls)
        } catch (e: IOException) {
            PhotoUploadResult.Failure("Không kết nối được máy chủ ảnh. Kiểm tra mạng và thử lại.")
        }
    }

    private fun resolveType(uri: Uri): String =
        appContext.contentResolver.getType(uri) ?: fallbackType

    private suspend fun putObject(uri: Uri, uploadUrl: String, contentType: String): Boolean =
        withContext(Dispatchers.IO) {
            val bytes = appContext.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return@withContext false
            val body = bytes.toRequestBody(contentType.toMediaTypeOrNull())
            val request = Request.Builder()
                .url(uploadUrl)
                .put(body)
                .header("Content-Type", contentType)
                .build()
            uploadClient.newCall(request).execute().use { it.isSuccessful }
        }
}
