package com.omnigem.inventory.ui

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.omnigem.inventory.di.AppContainer
import com.omnigem.inventory.ui.detail.DetailScreen
import com.omnigem.inventory.ui.list.AddPlaceholderScreen
import com.omnigem.inventory.ui.list.ListScreen
import com.omnigem.inventory.ui.login.LoginScreen

object Routes {
    const val LOGIN = "login"
    const val LIST = "list"
    const val ADD = "add"
    const val EDIT = "add/{itemId}"
    const val DETAIL = "detail/{itemId}"

    fun detail(itemId: String): String = "detail/$itemId"
    fun edit(itemId: String): String = "add/$itemId"
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
            DetailScreen(
                inventoryRepository = container.inventoryRepository,
                itemId = itemId,
                onBack = { navController.popBackStack() },
                onEdit = { id -> navController.navigate(Routes.edit(id)) },
            )
        }

        // Add (slice 4). The {itemId} variant is the "edit" entry point.
        composable(Routes.ADD) {
            AddPlaceholderScreen(onBack = { navController.popBackStack() })
        }
        composable(
            route = Routes.EDIT,
            arguments = listOf(navArgument("itemId") { type = NavType.StringType }),
        ) {
            AddPlaceholderScreen(onBack = { navController.popBackStack() })
        }
    }
}
