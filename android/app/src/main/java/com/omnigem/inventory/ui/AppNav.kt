package com.omnigem.inventory.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.omnigem.inventory.data.auth.AuthRepository
import com.omnigem.inventory.ui.list.ListScreen
import com.omnigem.inventory.ui.login.LoginScreen

object Routes {
    const val LOGIN = "login"
    const val LIST = "list"
}

@Composable
fun AppNav(authRepository: AuthRepository) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Routes.LOGIN) {
        composable(Routes.LOGIN) {
            LoginScreen(
                authRepository = authRepository,
                onLoggedIn = {
                    navController.navigate(Routes.LIST) {
                        // Drop login from the back stack after authenticating.
                        popUpTo(Routes.LOGIN) { inclusive = true }
                        launchSingleTop = true
                    }
                },
            )
        }
        composable(Routes.LIST) {
            ListScreen()
        }
    }
}
