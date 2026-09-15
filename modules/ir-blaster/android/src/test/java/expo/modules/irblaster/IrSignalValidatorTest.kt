package expo.modules.irblaster

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class IrSignalValidatorTest {
  @Test
  fun rejectsInvalidFrequency() {
    assertEquals(
      IrValidationFailure.INVALID_FREQUENCY,
      IrSignalValidator.validate(0, intArrayOf(1))
    )
  }

  @Test
  fun rejectsEmptyPattern() {
    assertEquals(
      IrValidationFailure.EMPTY_PATTERN,
      IrSignalValidator.validate(38_000, intArrayOf())
    )
  }

  @Test
  fun rejectsNonPositiveDuration() {
    assertEquals(
      IrValidationFailure.INVALID_DURATION,
      IrSignalValidator.validate(38_000, intArrayOf(560, 0))
    )
  }

  @Test
  fun acceptsPatternShorterThanTwoSeconds() {
    assertNull(IrSignalValidator.validate(38_000, intArrayOf(1_000_000, 999_999)))
  }

  @Test
  fun rejectsPatternAtTwoSeconds() {
    assertEquals(
      IrValidationFailure.PATTERN_TOO_LONG,
      IrSignalValidator.validate(38_000, intArrayOf(1_000_000, 1_000_000))
    )
  }
}
