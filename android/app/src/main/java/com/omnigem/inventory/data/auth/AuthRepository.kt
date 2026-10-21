package com.omnigem.inventory.data.auth

import com.omnigem.inventory.data.network.AuthApi
import com.omnigem.inventory.data.network.LoginRequest
import java.io.IOException

/** Outcome of a login attempt — exhaustive, no leaking exceptions to the UI. */
sealed interface LoginResult {
    data class Success(val session: StoredSession) : LoginResult
    data class Failure(val message: String) : LoginResult
}

/**
 * Coordinates the login call and persistence. On success the session is stored
 * before returning, so the caller can rely on it being durable.
 */
class AuthRepository(
    private val authApi: AuthApi,
    private val tokenStore: TokenStore,
) {
    val session = tokenStore.session

    suspend fun login(username: String, password: String): LoginResult {
        return try {
            val response = authApi.login(LoginRequest(username.trim(), password))
            val body = response.body()
            when {
                response.isSuccessful && body?.success == true && body.data != null -> {
                    val data = body.data
                    val stored = StoredSession(
                        token = data.token,
                        userId = data.user.id,
                        username = data.user.username,
                        role = data.user.role,
                    )
                    tokenStore.save(stored)
                    LoginResult.Success(stored)
                }

                response.code() == 401 -> LoginResult.Failure("Sai tài khoản hoặc mật khẩu.")

                else -> LoginResult.Failure(
                    body?.error ?: "Đăng nhập thất bại (mã ${response.code()}).",
                )
            }
        } catch (e: IOException) {
            LoginResult.Failure("Không kết nối được máy chủ. Kiểm tra mạng và thử lại.")
        }
    }

    suspend fun logout() = tokenStore.clear()
}
