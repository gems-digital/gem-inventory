package com.omnigem.inventory.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    // 200 → envelope with LoginData; 401 → envelope with error. Response<> lets
    // the repository read the status code without throwing on 401.
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): Response<ApiEnvelope<LoginData>>
}
