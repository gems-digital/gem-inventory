# Keep Moshi-generated adapters and model classes used via reflection.
-keep class com.omnigem.inventory.data.** { *; }
-keepclassmembers class * {
    @com.squareup.moshi.* <fields>;
}
