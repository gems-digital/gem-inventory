package com.omnigem.inventory.di

import android.content.Context
import com.omnigem.inventory.data.auth.AuthRepository
import com.omnigem.inventory.data.auth.TokenStore
import com.omnigem.inventory.data.network.AuthApi
import com.omnigem.inventory.data.network.NetworkModule

/**
 * Minimal manual DI (ServiceLocator). Builds singletons lazily so the app
 * stays simple — no Hilt. Swap implementations here when wiring new features.
 */
class AppContainer(context: Context) {

    private val appContext = context.applicationContext

    private val retrofit by lazy { NetworkModule.create() }

    private val authApi: AuthApi by lazy { retrofit.create(AuthApi::class.java) }

    private val tokenStore: TokenStore by lazy { TokenStore(appContext) }

    val authRepository: AuthRepository by lazy { AuthRepository(authApi, tokenStore) }
}
