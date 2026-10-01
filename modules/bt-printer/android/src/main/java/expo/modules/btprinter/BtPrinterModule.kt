package expo.modules.btprinter

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.util.UUID

/**
 * Bluetooth Classic (SPP) printing for ESC/POS receipt printers.
 *
 * Classic rather than BLE because that is what the pocket thermal printers a
 * collector carries actually speak. It is Android-only for the same reason:
 * iOS will not open an SPP channel to a device that is not MFi-certified, and
 * almost none of these are.
 *
 * Deliberately no discovery or pairing: pairing is the system Bluetooth
 * settings' job and it does it better. This lists what is already bonded,
 * opens a socket, and writes bytes.
 */
class BtPrinterModule : Module() {
  private var socket: BluetoothSocket? = null
  private var connectedAddress: String? = null

  /** The well-known Serial Port Profile UUID every ESC/POS printer listens on. */
  private val sppUuid: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

  override fun definition() = ModuleDefinition {
    Name("BtPrinter")

    AsyncFunction("getStatus") {
      mapOf(
        "supported" to (adapter() != null),
        "enabled" to (adapter()?.isEnabled == true),
        "permitted" to hasPermissions(),
        "connectedAddress" to connectedAddress
      )
    }

    AsyncFunction("getPairedDevices") {
      pairedDevices()
    }

    AsyncFunction("connect") { address: String ->
      connect(address)
    }

    AsyncFunction("write") { bytes: ByteArray ->
      write(bytes)
    }

    AsyncFunction("disconnect") {
      disconnect()
    }

    OnDestroy {
      disconnect()
    }
  }

  private fun pairedDevices(): List<Map<String, Any?>> {
    val adapter = adapter() ?: throw PrinterException("ERR_BT_UNSUPPORTED", "This device has no Bluetooth")
    requirePermissions()

    if (!adapter.isEnabled) {
      throw PrinterException("ERR_BT_DISABLED", "Bluetooth is turned off")
    }

    return try {
      adapter.bondedDevices.orEmpty().map { device ->
        mapOf(
          "address" to device.address,
          "name" to (device.name ?: device.address),
          // 0x0600 is the imaging major class; most receipt printers report it,
          // but plenty of cheap ones report Uncategorised, so it is a hint the
          // list can sort by rather than a filter that hides real printers.
          "isLikelyPrinter" to isLikelyPrinter(device)
        )
      }
    } catch (error: SecurityException) {
      throw PrinterException("ERR_BT_PERMISSION_DENIED", "Bluetooth permission was denied", error)
    }
  }

  private fun connect(address: String) {
    val adapter = adapter() ?: throw PrinterException("ERR_BT_UNSUPPORTED", "This device has no Bluetooth")
    requirePermissions()

    if (!adapter.isEnabled) {
      throw PrinterException("ERR_BT_DISABLED", "Bluetooth is turned off")
    }

    // Reconnecting to the one already open is a no-op rather than a second
    // socket: two sockets to one printer interleave and print garbage.
    if (connectedAddress == address && socket?.isConnected == true) {
      return
    }

    disconnect()

    val device: BluetoothDevice = try {
      adapter.getRemoteDevice(address)
    } catch (error: IllegalArgumentException) {
      throw PrinterException("ERR_BT_BAD_ADDRESS", "That is not a Bluetooth address", error)
    }

    try {
      // Discovery holds the radio and makes connecting slow and flaky.
      adapter.cancelDiscovery()

      val opened = device.createRfcommSocketToServiceRecord(sppUuid)
      opened.connect()
      socket = opened
      connectedAddress = address
    } catch (error: SecurityException) {
      throw PrinterException("ERR_BT_PERMISSION_DENIED", "Bluetooth permission was denied", error)
    } catch (error: IOException) {
      closeQuietly()
      throw PrinterException(
        "ERR_BT_CONNECT_FAILED",
        "Could not reach the printer. Check it is on, in range, and paired.",
        error
      )
    }
  }

  /**
   * Writes in small chunks with a breath between them.
   *
   * An SPP link to a thermal printer runs at a few KB/s and the printer's own
   * buffer is smaller than one receipt. Handing it the whole stream at once
   * overruns that buffer and prints half a receipt, so it goes out in pieces
   * the buffer can absorb.
   */
  private fun write(bytes: ByteArray) {
    val open = socket?.takeIf { it.isConnected }
      ?: throw PrinterException("ERR_BT_NOT_CONNECTED", "No printer is connected")

    try {
      val stream = open.outputStream
      var offset = 0

      while (offset < bytes.size) {
        val length = minOf(CHUNK_BYTES, bytes.size - offset)
        stream.write(bytes, offset, length)
        stream.flush()
        offset += length

        if (offset < bytes.size) {
          Thread.sleep(CHUNK_PAUSE_MS)
        }
      }
    } catch (error: InterruptedException) {
      Thread.currentThread().interrupt()
      throw PrinterException("ERR_BT_WRITE_FAILED", "Printing was interrupted", error)
    } catch (error: IOException) {
      closeQuietly()
      throw PrinterException(
        "ERR_BT_WRITE_FAILED",
        "The printer stopped responding part way through. Check the paper and try again.",
        error
      )
    }
  }

  private fun disconnect() {
    closeQuietly()
  }

  private fun closeQuietly() {
    try {
      socket?.close()
    } catch (_: IOException) {
      // Already gone; nothing to salvage.
    } finally {
      socket = null
      connectedAddress = null
    }
  }

  private fun isLikelyPrinter(device: BluetoothDevice): Boolean = try {
    device.bluetoothClass?.majorDeviceClass == IMAGING_MAJOR_CLASS
  } catch (_: SecurityException) {
    false
  }

  private fun adapter(): BluetoothAdapter? {
    val context = appContext.reactContext ?: return null
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager

    return manager?.adapter
  }

  /**
   * Android 12 split Bluetooth into runtime permissions; before that the
   * manifest grant was enough, so there is nothing to check.
   */
  private fun hasPermissions(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      return true
    }

    val context = appContext.reactContext ?: return false

    // `Context.checkSelfPermission` exists from API 23 and minSdk here is 24,
    // so this needs no androidx dependency of its own.
    return context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) ==
      PackageManager.PERMISSION_GRANTED
  }

  private fun requirePermissions() {
    if (!hasPermissions()) {
      throw PrinterException(
        "ERR_BT_PERMISSION_DENIED",
        "Allow Nearby devices so the app can reach the printer"
      )
    }
  }

  private class PrinterException(code: String, message: String, cause: Throwable? = null) :
    CodedException(code, message, cause)

  private companion object {
    const val CHUNK_BYTES = 256
    const val CHUNK_PAUSE_MS = 20L
    const val IMAGING_MAJOR_CLASS = 0x0600
  }
}
