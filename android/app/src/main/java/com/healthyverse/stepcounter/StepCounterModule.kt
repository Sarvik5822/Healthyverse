package com.healthyverse.stepcounter

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * AndroidStepModule - Native module that exposes the hardware step counter
 * (Sensor.TYPE_STEP_COUNTER) to React Native.
 *
 * Responsibilities:
 * - Start/stop the step counter sensor
 * - Emit step events to JavaScript
 * - Handle permission checks
 * - Detect sensor availability
 * - Handle lifecycle safely
 */
class StepCounterModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener, LifecycleEventListener {

    private var sensorManager: SensorManager? = null
    private var stepCounterSensor: Sensor? = null
    private var isListening = false
    private var lastKnownSteps: Long = -1  // FIX: Track last known step count to survive JS reload

    companion object {
        const val MODULE_NAME = "StepCounterModule"
        const val STEP_EVENT = "onStepCounterUpdate"
    }

    init {
        reactContext.addLifecycleEventListener(this)
        sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        stepCounterSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    }

    override fun getName(): String = MODULE_NAME

    /**
     * Check if the step counter sensor is available on this device.
     */
    @ReactMethod
    fun isSensorAvailable(promise: Promise) {
        try {
            val available = stepCounterSensor != null
            promise.resolve(available)
        } catch (e: Exception) {
            promise.reject("SENSOR_CHECK_ERROR", e.message, e)
        }
    }

    /**
     * Check if ACTIVITY_RECOGNITION permission is granted.
     */
    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val granted = ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.ACTIVITY_RECOGNITION
                ) == PackageManager.PERMISSION_GRANTED
                promise.resolve(granted)
            } else {
                // Permission not required below Android 10
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", e.message, e)
        }
    }

    /**
     * Start listening to the step counter sensor.
     * Emits step count events to JavaScript via DeviceEventEmitter.
     *
     * FIX: If we already have a lastKnownSteps value (from before reload),
     * immediately emit it so JS side doesn't have to wait for a new step.
     */
    @ReactMethod
    fun startStepCounter(promise: Promise) {
        try {
            if (stepCounterSensor == null) {
                promise.reject("SENSOR_NOT_AVAILABLE", "Step counter sensor is not available on this device.")
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val granted = ContextCompat.checkSelfPermission(
                    reactApplicationContext,
                    Manifest.permission.ACTIVITY_RECOGNITION
                ) == PackageManager.PERMISSION_GRANTED

                if (!granted) {
                    promise.reject("PERMISSION_DENIED", "ACTIVITY_RECOGNITION permission is not granted.")
                    return
                }
            }

            if (isListening) {
                // FIX: Even if already listening, emit last known steps to new JS context
                if (lastKnownSteps >= 0) {
                    val params = Arguments.createMap().apply {
                        putDouble("steps", lastKnownSteps.toDouble())
                        putDouble("timestamp", System.currentTimeMillis().toDouble())
                    }
                    sendEvent(STEP_EVENT, params)
                }
                promise.resolve("Already listening")
                return
            }

            val registered = sensorManager?.registerListener(
                this,
                stepCounterSensor,
                SensorManager.SENSOR_DELAY_UI
            ) ?: false

            if (registered) {
                isListening = true
                // FIX: If we have a cached step count from before reload, emit it immediately
                if (lastKnownSteps >= 0) {
                    val params = Arguments.createMap().apply {
                        putDouble("steps", lastKnownSteps.toDouble())
                        putDouble("timestamp", System.currentTimeMillis().toDouble())
                    }
                    sendEvent(STEP_EVENT, params)
                }
                promise.resolve("Step counter started successfully")
            } else {
                promise.reject("SENSOR_REGISTER_FAILED", "Failed to register step counter sensor listener.")
            }
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    /**
     * Stop listening to the step counter sensor.
     */
    @ReactMethod
    fun stopStepCounter(promise: Promise) {
        try {
            if (isListening) {
                sensorManager?.unregisterListener(this)
                isListening = false
            }
            promise.resolve("Step counter stopped")
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    /**
     * Get the current listening state.
     */
    @ReactMethod
    fun isTracking(promise: Promise) {
        promise.resolve(isListening)
    }

    // ─── SensorEventListener ─────────────────────────────────────────────

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_STEP_COUNTER) {
            val steps = event.values[0].toLong()
            lastKnownSteps = steps  // FIX: Always cache the latest step count
            val params = Arguments.createMap().apply {
                putDouble("steps", steps.toDouble())
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            }
            sendEvent(STEP_EVENT, params)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed for step counter
    }

    // ─── LifecycleEventListener ──────────────────────────────────────────

    override fun onHostResume() {
        // Re-register sensor if we were tracking before pause
        if (isListening && stepCounterSensor != null) {
            sensorManager?.registerListener(
                this,
                stepCounterSensor,
                SensorManager.SENSOR_DELAY_UI
            )
        }
    }

    override fun onHostPause() {
        // Keep sensor running in background for step counting accuracy
        // Do NOT unregister here - we want continuous counting
    }

    override fun onHostDestroy() {
        // FIX: Do NOT reset lastKnownSteps on destroy - keep it cached for reload
        // Clean up sensor listener on destroy
        if (isListening) {
            sensorManager?.unregisterListener(this)
            isListening = false
        }
    }

    // ─── Helper ──────────────────────────────────────────────────────────

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * FIX: New method - Get the last known step count without waiting for a new sensor event.
     * This allows JS side to immediately restore step count after reload.
     */
    @ReactMethod
    fun getLastKnownSteps(promise: Promise) {
        try {
            if (lastKnownSteps >= 0) {
                promise.resolve(lastKnownSteps.toDouble())
            } else {
                promise.resolve(-1.0)
            }
        } catch (e: Exception) {
            promise.reject("GET_STEPS_ERROR", e.message, e)
        }
    }

    /**
     * Required for NativeEventEmitter compatibility in React Native.
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in Event Emitter calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in Event Emitter calls
    }
}