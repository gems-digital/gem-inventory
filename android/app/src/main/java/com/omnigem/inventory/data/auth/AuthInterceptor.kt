package com.omnigem.inventory.data.auth

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Attaches `Authorization: Bearer <token>` to outgoing requests when a session
 * is stored. The login call carries no token yet, so a missing token simply
 * passes the request through unchanged.
 */
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()

        // Don't clobber an Authorization header a caller already set.
        if (original.header("Authorization") != null) {
            return chain.proceed(original)
        }

        val token = runBlocking { tokenStore.session.first()?.token }
        val request = if (token.isNullOrBlank()) {
            original
        } else {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        }
        return chain.proceed(request)
    }
}
