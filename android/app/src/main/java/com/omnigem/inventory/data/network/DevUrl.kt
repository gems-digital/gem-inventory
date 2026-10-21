package com.omnigem.inventory.data.network

/**
 * On the Android emulator, the host machine is reachable at 10.0.2.2, not
 * `localhost`/`127.0.0.1`. The object-storage server returns URLs built from
 * its own public base (e.g. http://localhost:9000/...), so rewrite the host
 * for dev before the client uses them for PUT upload or image display.
 */
fun rewriteForEmulator(url: String): String =
    url
        .replace("://localhost", "://10.0.2.2")
        .replace("://127.0.0.1", "://10.0.2.2")
