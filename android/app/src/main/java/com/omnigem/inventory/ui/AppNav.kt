package com.omnigem.inventory.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.omnigem.inventory.di.AppContainer
import com.omnigem.inventory.ui.detail.DetailPlaceholderScreen
import com.omnigem.inventory.ui.list.AddPlaceholderScreen
import com.omnigem.inventory.ui.list.ListScreen
import com.omnigem.inventory.ui.login.LoginScreen

object Routes {
    const val LOGIN = "login"
    const val LIST = "list"
    const val ADD = "add"
    const val DETAIL = "detail/{itemId}"

    fun detail(itemId: String): String = "detail/$itemId"
}

@Composable
fun AppNav(container: AppContainer) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Routes.LOGIN) {
        composable(Routes.LOGIN) {
            LoginScreen(
                authRepository = container.authRepository,
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
            ListScreen(
                inventoryRepository = container.inventoryRepository,
                onOpenItem = { itemId -> navController.navigate(Routes.detail(itemId)) },
                onAddItem = { navController.navigate(Routes.ADD) },
            )
        }

        composable(
            route = Routes.DETAIL,
            arguments = listOf(navArgument("itemId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val itemId = backStackEntry.arguments?.getString("itemId").orEmpty()
            DetailPlaceholderScreen(itemId = itemId, onBack = { navController.popBackStack() })
        }

        composable(Routes.ADD) {
            AddPlaceholderScreen(onBack = { navController.popBackStack() })
        }
    }
}
