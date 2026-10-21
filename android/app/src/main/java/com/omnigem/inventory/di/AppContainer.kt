package com.omnigem.inventory.di

import android.content.Context
import com.omnigem.inventory.data.auth.AuthInterceptor
import com.omnigem.inventory.data.auth.AuthRepository
import com.omnigem.inventory.data.auth.TokenStore
import com.omnigem.inventory.data.inventory.InventoryRepository
import com.omnigem.inventory.data.inventory.PhotoRepository
import com.omnigem.inventory.data.network.AuthApi
import com.omnigem.inventory.data.network.InventoryApi
import com.omnigem.inventory.data.network.NetworkModule
import okhttp3.OkHttpClient

/**
 * Minimal manual DI (ServiceLocator). Builds singletons lazily so the app
 * stays simple — no Hilt. Swap implementations here when wiring new features.
 */
class AppContainer(context: Context) {

    private val appContext = context.applicationContext

    private val tokenStore: TokenStore by lazy { TokenStore(appContext) }

    private val retrofit by lazy {
        NetworkModule.create(authInterceptor = AuthInterceptor(tokenStore))
    }

    private val authApi: AuthApi by lazy { retrofit.create(AuthApi::class.java) }

    private val inventoryApi: InventoryApi by lazy { retrofit.create(InventoryApi::class.java) }

    // Plain client for presigned PUT uploads — no auth header (the presigned
    // URL carries its own credentials) and no verbose body logging of bytes.
    private val uploadClient: OkHttpClient by lazy { OkHttpClient.Builder().build() }

    val authRepository: AuthRepository by lazy { AuthRepository(authApi, tokenStore) }

    val inventoryRepository: InventoryRepository by lazy { InventoryRepository(inventoryApi) }

    val photoRepository: PhotoRepository by lazy {
        PhotoRepository(inventoryApi, appContext, uploadClient)
    }
}
