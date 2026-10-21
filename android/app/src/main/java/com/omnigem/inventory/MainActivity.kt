package com.omnigem.inventory

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.omnigem.inventory.ui.AppNav
import com.omnigem.inventory.ui.theme.OmniGemTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val container = (application as InventoryApp).container

        setContent {
            OmniGemTheme {
                AppNav(authRepository = container.authRepository)
            }
        }
    }
}
