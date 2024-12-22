# Gcnc

A universal G-code sender and CNC control library that works across different JavaScript environments and firmware types.

## Features

- 🌐 **Platform Agnostic**: Works seamlessly across different environments
  - Node.js (using SerialPort)
  - Browser (using WebSerial API) [WIP]
  - Browser (using WebBluetooth API) [WIP]
- 🔌 **Multiple Firmware Support**
  - Grbl (Current)
  - Marlin (Planned)
  - Others (Planned)
- 🔄 **Resume Support**: Ability to resume from the last executed line
- 📡 **OSC Integration**: Built-in OSC (Open Sound Control) support for real-time monitoring
- 🔍 **Status Monitoring**: Real-time machine status monitoring
- 🎯 **Type Safety**: Written in TypeScript for better development experience

## Installation

```bash
npm install gcnc
```

## Quick Start

### Node.js

```typescript
import {SerialCNCDevice} from 'gcnc'

// Create a new CNC device instance
const device = new SerialCNCDevice('/dev/tty.usbserial-0001')

// Open the connection
await device.open()

// Send G-code
await device.send('G90') // Set absolute positioning
await device.send('G0 X0 Y0 Z0') // Move to home position

// Monitor status
device.on('status', status => {
	console.log('Machine Status:', status.state)
	console.log('Position:', status.position)
})

// Close the connection when done
await device.close()
```

### Browser (WebSerial)

```typescript
import {WebSerialCNCDevice} from 'gcnc'

// Request port access from user
const port = await navigator.serial.requestPort()
const device = new WebSerialCNCDevice(port)

// Rest of the code is similar to Node.js example
```

## Features in Detail

### Resume Support

The library automatically keeps track of the last executed line for each G-code file, allowing you to resume operations from where they were interrupted:

```typescript
import {FileCache} from 'gcnc'

const fileCache = new FileCache()
await fileCache.load()

// Will automatically resume from the last executed line
await device.sendLines(source)
```

### OSC Integration

Real-time machine status can be monitored via OSC:

```typescript
import {bindWithOSC} from 'gcnc'
import OSC from 'osc-js'

const osc = new OSC()
bindWithOSC(device, osc)

// Now you can receive machine status via OSC
// Default OSC messages:
// - /gcnc/report/axes (position)
// - /gcnc/report/status (machine state)
//
```
