package com.omnigem.inventory

import android.app.Application
import com.omnigem.inventory.di.AppContainer

/** Application entry point; owns the DI container for the process lifetime. */
class InventoryApp : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
