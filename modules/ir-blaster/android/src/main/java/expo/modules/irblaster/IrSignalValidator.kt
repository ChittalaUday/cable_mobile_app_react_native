package expo.modules.irblaster

internal enum class IrValidationFailure {
  INVALID_FREQUENCY,
  EMPTY_PATTERN,
  INVALID_DURATION,
  PATTERN_TOO_LONG
}

internal object IrSignalValidator {
  private const val MAX_PATTERN_ENTRIES = 10_000
  private const val MAX_PATTERN_DURATION_MICROSECONDS = 2_000_000L

  fun validate(carrierFrequencyHz: Int, pattern: IntArray): IrValidationFailure? {
    if (carrierFrequencyHz <= 0) return IrValidationFailure.INVALID_FREQUENCY
    if (pattern.isEmpty() || pattern.size > MAX_PATTERN_ENTRIES) return IrValidationFailure.EMPTY_PATTERN

    var total = 0L
    for (duration in pattern) {
      if (duration <= 0) return IrValidationFailure.INVALID_DURATION
      total += duration
      if (total >= MAX_PATTERN_DURATION_MICROSECONDS) return IrValidationFailure.PATTERN_TOO_LONG
    }
    return null
  }
}
