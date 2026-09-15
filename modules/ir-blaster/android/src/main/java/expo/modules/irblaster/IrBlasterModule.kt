package expo.modules.irblaster

import android.content.Context
import android.hardware.ConsumerIrManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class IrBlasterModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IrBlaster")

    AsyncFunction("getCapabilities") {
      getCapabilities()
    }

    AsyncFunction("transmit") { carrierFrequencyHz: Int, durations: List<Int> ->
      transmit(carrierFrequencyHz, durations.toIntArray())
    }
  }

  private fun getCapabilities(): Map<String, Any> {
    val manager = getManager() ?: return capabilities("service-unavailable")
    return try {
      if (!manager.hasIrEmitter()) return capabilities("no-emitter")
      val ranges = manager.carrierFrequencies
        ?: return capabilities("hardware-error")
      if (ranges.isEmpty()) return capabilities("hardware-error")
      capabilities(
        status = "available",
        ranges = ranges.map { mapOf("minHz" to it.minFrequency, "maxHz" to it.maxFrequency) }
      )
    } catch (_: RuntimeException) {
      capabilities("hardware-error")
    }
  }

  private fun transmit(carrierFrequencyHz: Int, pattern: IntArray) {
    when (IrSignalValidator.validate(carrierFrequencyHz, pattern)) {
      IrValidationFailure.PATTERN_TOO_LONG -> throw IrException(
        "ERR_IR_PATTERN_TOO_LONG",
        "IR pattern must be shorter than 2 seconds"
      )
      null -> Unit
      else -> throw IrException("ERR_IR_INVALID_COMMAND", "Invalid IR frequency or pattern")
    }

    val manager = getManager()
      ?: throw IrException("ERR_IR_SERVICE_UNAVAILABLE", "Android IR service is unavailable")

    try {
      if (!manager.hasIrEmitter()) {
        throw IrException("ERR_IR_NO_EMITTER", "This device has no IR emitter")
      }
      val ranges = manager.carrierFrequencies
        ?: throw IrException("ERR_IR_CAPABILITY_QUERY_FAILED", "Could not query supported IR frequencies")
      if (ranges.none { carrierFrequencyHz in it.minFrequency..it.maxFrequency }) {
        throw IrException("ERR_IR_UNSUPPORTED_FREQUENCY", "The device does not support this IR frequency")
      }
      manager.transmit(carrierFrequencyHz, pattern)
    } catch (error: IrException) {
      throw error
    } catch (error: SecurityException) {
      throw IrException("ERR_IR_TRANSMIT_FAILED", "IR transmission permission was denied", error)
    } catch (error: RuntimeException) {
      throw IrException("ERR_IR_TRANSMIT_FAILED", "Android could not transmit the IR command", error)
    }
  }

  private fun getManager(): ConsumerIrManager? =
    appContext.reactContext?.getSystemService(Context.CONSUMER_IR_SERVICE) as? ConsumerIrManager

  private fun capabilities(
    status: String,
    ranges: List<Map<String, Int>> = emptyList()
  ): Map<String, Any> = mapOf(
    "available" to (status == "available"),
    "status" to status,
    "carrierFrequencyRanges" to ranges
  )

  private class IrException(code: String, message: String, cause: Throwable? = null) :
    CodedException(code, message, cause)
}
