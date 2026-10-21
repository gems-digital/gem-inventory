package com.omnigem.inventory.ui.addedit

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File

/** Creates a FileProvider content Uri for a new camera capture in the cache. */
fun createCaptureUri(context: Context): Uri {
    val dir = File(context.cacheDir, "captures").apply { mkdirs() }
    val file = File(dir, "capture_${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}
