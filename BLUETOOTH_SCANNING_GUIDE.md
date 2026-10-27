# Bluetooth Scanning Feature - User Guide

## Overview

The LoveLaundry Linen Room App now supports Bluetooth barcode/QR code scanners for hands-free scanning operations. This feature is **optional** and works alongside manual input.

## Requirements

### Browser Support
- **Chrome**: ✅ Full support (Web Bluetooth API)
- **Edge**: ✅ Full support (Web Bluetooth API)
- **Opera**: ✅ Full support (Web Bluetooth API)
- **Firefox**: ❌ Not supported (Web Bluetooth API not implemented)
- **Safari**: ❌ Not supported (Web Bluetooth API not implemented)
- **Mobile Chrome/Edge**: ✅ Full support

### Hardware Requirements
- Bluetooth-enabled barcode scanner (HID profile)
- Bluetooth-enabled QR code scanner
- Or any Bluetooth device that transmits data as text

### System Requirements
- Device must have Bluetooth enabled
- Browser must have Bluetooth permissions
- HTTPS connection required (Web Bluetooth API restriction)

## Compatible Scanners

The following types of Bluetooth scanners are compatible:

### 1. HID (Human Interface Device) Scanners
- Service UUID: `00001812-0000-1000-8000-00805f9b34fb`
- Most common barcode scanners
- Emulates keyboard input

### 2. Custom Service Scanners
- Service UUID: `0000ffe0-0000-1000-8000-00805f9b34fb`
- Some custom RFID/QR scanners
- Direct data transmission

### 3. Accept All Devices
- Fallback mode for unknown scanner types
- Attempts to connect to any Bluetooth device
- May require manual pairing first

## How to Use

### Single Scan Page

1. **Navigate to Scan Page**
   - Open Linen Room App
   - Click "Scan" in navigation

2. **Connect Bluetooth Scanner**
   - Click "Connect Bluetooth Scanner" button in page header
   - Browser will show a Bluetooth device selection dialog
   - Select your scanner from the list
   - Grant Bluetooth permissions if prompted

3. **Start Scanning**
   - Point scanner at linen tag (barcode or QR code)
   - Scanner will transmit the tag code
   - Code automatically appears in input field
   - System automatically submits the scan
   - Linen details appear for action selection

4. **Apply Action**
   - Select desired action (Collect, Receive, Start Wash, etc.)
   - Action is applied to the linen
   - Ready for next scan

5. **Disconnect Scanner**
   - Click "Disconnect Bluetooth" button
   - Scanner disconnects
   - Can reconnect at any time

### Bulk Scan Page

1. **Navigate to Bulk Scan Page**
   - Open Linen Room App
   - Click "Bulk Scan" in navigation

2. **Connect Bluetooth Scanner**
   - Click "Connect Bluetooth Scanner" button
   - Select your scanner
   - Grant permissions

3. **Accumulate Scans**
   - Scan multiple linen tags
   - Each scan adds to the code list
   - Codes appear in the textarea
   - Counter shows total codes entered

4. **Select Action**
   - Choose the action to apply to all linens
   - Optionally specify location

5. **Process Bulk Scan**
   - Click "Process Bulk Scan"
   - All linens are processed with the selected action
   - Results display with success/error counts

6. **Disconnect Scanner**
   - Click "Disconnect Bluetooth" when done

## Troubleshooting

### Scanner Not Found

**Problem**: Scanner doesn't appear in device list

**Solutions**:
1. Ensure scanner is in pairing/discovery mode
2. Check scanner batteries
3. Turn Bluetooth off and on again
4. Try pairing scanner with device first (Bluetooth settings)
5. Try "Accept All Devices" option

### Connection Failed

**Problem**: Scanner appears but connection fails

**Solutions**:
1. Ensure scanner is not connected to another device
2. Disconnect from other apps/devices
3. Restart scanner
4. Refresh browser page
5. Check browser console for error messages

### Scans Not Auto-Submitting

**Problem**: Code appears but doesn't auto-submit

**Solutions**:
1. Check scanner is transmitting newline/carriage return
2. Configure scanner to append newline after each scan
3. Manual submit still works - click "Find" button
4. Try different scanner if available

### Browser Shows Bluetooth Not Supported

**Problem**: "Bluetooth scanner available" message doesn't appear

**Solutions**:
1. Use Chrome, Edge, or Opera browser
2. Ensure browser is up to date
3. Check if Web Bluetooth API is enabled in flags
4. Try on desktop/laptop instead of mobile (some mobile browsers have limited support)

### HTTPS Required

**Problem**: Connection fails due to insecure context

**Solutions**:
1. Ensure app is served over HTTPS
2. Use production URL instead of localhost
3. For development, use Chrome with web Bluetooth flag:
   ```
   chrome --enable-web-bluetooth
   ```

## Scanner Configuration

### Recommended Scanner Settings

For optimal performance, configure your scanner with:

1. **Suffix**: Append newline (CR/LF) after each scan
2. **Prefix**: None
3. **Data Format**: Text/ASCII
4. **Scan Mode**: Manual trigger (preferred) or continuous
5. **Connection Mode**: HID or Serial Port Profile (SPP)

### Example Scanner Settings

**Zebra DS2278**:
- Suffix: Carriage Return + Line Feed
- Data Format: UTF-8
- Interface: Bluetooth HID

**Honeywell Voyager 1202g**:
- Suffix: Suffix 1 (CR+LF)
- Data Formatting: None
- Interface: Bluetooth HID

## Security Considerations

### Data Privacy
- Bluetooth connections are encrypted (Bluetooth 4.0+)
- No data is stored on scanner
- Scanner only transmits tag codes, not personal data

### Access Control
- Only authorized devices can connect
- Connection requires user approval
- Disconnects when browser tab closes

### Best Practices
1. Keep scanner firmware updated
2. Use strong encryption on Bluetooth connections
3. Disconnect scanner when not in use
4. Monitor for unauthorized connection attempts

## Performance Tips

### Optimize Scanning Speed
1. Position scanner 5-15cm from tag
2. Ensure adequate lighting
3. Use high-contrast tags
4. Keep scanner lens clean
5. Use trigger mode for controlled scanning

### Battery Management
1. Turn off scanner when not in use
2. Use rechargeable batteries
3. Keep spare batteries charged
4. Monitor battery level indicator

### Connection Stability
1. Keep scanner within 10 meters of device
2. Avoid interference from other Bluetooth devices
3. Keep scanner and device line-of-sight when possible
4. Reconnect if connection drops

## Alternative Input Methods

If Bluetooth is not available or preferred, the app supports:

1. **Manual Input**: Type tag codes directly
2. **USB Scanner**: Use USB barcode scanner (works as keyboard)
3. **Camera**: Use device camera to scan QR codes (future feature)

## API Integration

### Custom Scanner Integration

For custom scanner integration, the app uses the Web Bluetooth API:

```javascript
// Connect to device
const device = await navigator.bluetooth.requestDevice({
  filters: [
    { services: ['00001812-0000-1000-8000-00805f9b34fb'] },
    { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] },
  ],
  acceptAllDevices: true,
})

// Connect to GATT server
const server = await device.gatt.connect()

// Subscribe to data notifications
const characteristic = await service.getCharacteristic(...)
await characteristic.startNotifications()
characteristic.addEventListener('characteristicvaluechanged', handleData)
```

## Support

### Getting Help
- Check browser console for error messages
- Review this guide for common issues
- Contact support: support@lovelaundry.lk
- Provide: Scanner model, browser version, error messages

### Reporting Issues
When reporting issues, include:
1. Scanner make and model
2. Browser name and version
3. Operating system
4. Error messages from browser console
5. Steps to reproduce

## Future Enhancements

Planned improvements:
- [ ] Camera-based QR code scanning
- [ ] Multiple scanner support
- [ ] Scanner configuration UI
- [ ] Custom data format parsing
- [ ] Offline mode support

---

**Version**: 1.0
**Last Updated**: October 27, 2026
