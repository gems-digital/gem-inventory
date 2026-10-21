package com.omnigem.inventory.data.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// DataStore instance scoped to the application Context.
private val Context.authDataStore by preferencesDataStore(name = "auth")

/**
 * Persists the JWT and the signed-in user across process restarts.
 * No business logic here — just durable key/value storage.
 */
class TokenStore(private val context: Context) {

    val session: Flow<StoredSession?> = context.authDataStore.data.map { prefs ->
        val token = prefs[KEY_TOKEN]
        val userId = prefs[KEY_USER_ID]
        val username = prefs[KEY_USERNAME]
        val role = prefs[KEY_ROLE]
        if (token.isNullOrBlank() || userId == null || username == null || role == null) {
            null
        } else {
            StoredSession(token = token, userId = userId, username = username, role = role)
        }
    }

    suspend fun save(session: StoredSession) {
        context.authDataStore.edit { prefs ->
            prefs[KEY_TOKEN] = session.token
            prefs[KEY_USER_ID] = session.userId
            prefs[KEY_USERNAME] = session.username
            prefs[KEY_ROLE] = session.role
        }
    }

    suspend fun clear() {
        context.authDataStore.edit { it.clear() }
    }

    private companion object {
        val KEY_TOKEN = stringPreferencesKey("jwt_token")
        val KEY_USER_ID = stringPreferencesKey("user_id")
        val KEY_USERNAME = stringPreferencesKey("username")
        val KEY_ROLE = stringPreferencesKey("role")
    }
}

data class StoredSession(
    val token: String,
    val userId: String,
    val username: String,
    val role: String,
)
