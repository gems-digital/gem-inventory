package com.omnigem.inventory.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.omnigem.inventory.data.auth.AuthRepository
import com.omnigem.inventory.ui.icons.AppIcons
import com.omnigem.inventory.ui.theme.Ink
import com.omnigem.inventory.ui.theme.Ivory
import com.omnigem.inventory.ui.theme.Jade
import com.omnigem.inventory.ui.theme.JadeDark
import com.omnigem.inventory.ui.theme.Muted
import com.omnigem.inventory.ui.theme.OmniGemTheme

@Composable
fun LoginScreen(
    authRepository: AuthRepository,
    onLoggedIn: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val viewModel: LoginViewModel = viewModel(factory = LoginViewModel.Factory(authRepository))
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    // Navigate once the VM reports a successful login (one-shot side effect).
    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) {
            onLoggedIn()
        }
    }

    LoginContent(
        state = state,
        onUsernameChange = viewModel::onUsernameChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSubmit = viewModel::submit,
        modifier = modifier,
    )
}

@Composable
private fun LoginContent(
    state: LoginUiState,
    onUsernameChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Ivory),
    ) {
        JadeHeader()

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            OutlinedTextField(
                value = state.username,
                onValueChange = onUsernameChange,
                label = { Text("Tài khoản") },
                leadingIcon = {
                    Icon(rememberVectorPainter(AppIcons.Person), contentDescription = null, tint = Muted)
                },
                singleLine = true,
                enabled = !state.isSubmitting,
                isError = state.error != null,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Next,
                ),
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedTextField(
                value = state.password,
                onValueChange = onPasswordChange,
                label = { Text("Mật khẩu") },
                leadingIcon = {
                    Icon(rememberVectorPainter(AppIcons.Lock), contentDescription = null, tint = Muted)
                },
                singleLine = true,
                enabled = !state.isSubmitting,
                isError = state.error != null,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = { onSubmit() }),
                colors = fieldColors(),
                modifier = Modifier.fillMaxWidth(),
            )

            val error = state.error
            if (error != null) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            Button(
                onClick = onSubmit,
                // Always solid/tappable; only dims while a request is in flight.
                enabled = !state.isSubmitting,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Jade,
                    contentColor = Ivory,
                    disabledContainerColor = Jade.copy(alpha = 0.6f),
                    disabledContentColor = Ivory,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(
                        color = Ivory,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(22.dp),
                    )
                } else {
                    Text(
                        text = "Đăng nhập",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Text(
                text = "Chỉ dành cho nhân viên OmniGem",
                color = Muted,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = "Phiên bản nội bộ · v0.1",
                color = Muted,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun JadeHeader() {
    Surface(color = Jade) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 72.dp, bottom = 40.dp, start = 24.dp, end = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Rounded-square badge with a thin white border and a white gem mark.
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(JadeDark)
                    .border(1.5.dp, Ivory, RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painter = rememberVectorPainter(AppIcons.Gem),
                    contentDescription = null,
                    tint = Ivory,
                    modifier = Modifier.size(38.dp),
                )
            }
            Text(
                text = "OMNIGEM",
                color = Ivory,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "Kho & Giá",
                color = Ivory,
                style = MaterialTheme.typography.titleLarge,
            )
            Text(
                text = "Sổ giá & kho nội bộ — chỉ dành cho nhân viên",
                color = Ivory.copy(alpha = 0.85f),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Jade,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
    focusedLabelColor = Jade,
    unfocusedLabelColor = Muted,
    cursorColor = Jade,
    focusedTextColor = Ink,
    unfocusedTextColor = Ink,
)

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun LoginPreview() {
    OmniGemTheme {
        LoginContent(
            state = LoginUiState(username = "trang", password = "secret"),
            onUsernameChange = {},
            onPasswordChange = {},
            onSubmit = {},
        )
    }
}
