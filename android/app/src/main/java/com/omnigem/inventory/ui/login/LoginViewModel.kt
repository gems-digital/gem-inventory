package com.omnigem.inventory.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.omnigem.inventory.data.auth.AuthRepository
import com.omnigem.inventory.data.auth.LoginResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val loggedIn: Boolean = false,
) {
    val canSubmit: Boolean
        get() = username.isNotBlank() && password.isNotBlank() && !isSubmitting
}

class LoginViewModel(private val authRepository: AuthRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onUsernameChange(value: String) {
        _uiState.update { it.copy(username = value, error = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, error = null) }
    }

    fun submit() {
        val current = _uiState.value
        if (!current.canSubmit) return

        _uiState.update { it.copy(isSubmitting = true, error = null) }
        viewModelScope.launch {
            when (val result = authRepository.login(current.username, current.password)) {
                is LoginResult.Success ->
                    _uiState.update { it.copy(isSubmitting = false, loggedIn = true) }

                is LoginResult.Failure ->
                    _uiState.update { it.copy(isSubmitting = false, error = result.message) }
            }
        }
    }

    /** Lightweight factory so the screen can build the VM from the repository. */
    class Factory(private val authRepository: AuthRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return LoginViewModel(authRepository) as T
        }
    }
}
