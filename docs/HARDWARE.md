# Hardware Scaffolding

Guidelines and references for physical hardware integration.

## Robotics Platforms

### Unitree Humanoid (R1/G1)
- **Integration**: ROS 2 / Direct Bridge.
- **Control**: via `robofang-unitree` connector.

### Yahboom / Dreame
- **Integration**: Custom Python bridges.
- **Protocol**: HTTP/WebSockets.

## IoT Ecosystem

### Tapo / Kasa
- **Discovery**: Automated via local subnet scan.
- **Capabilities**: Power monitoring, camera streaming (cloud/LAN — separate from simple PC vision).

### Local PC cameras (face / vision on the host)

For **OpenCV-style** capture on the Windows machine (built-in webcam, USB UVC), use **device index** APIs in the tool stack — not the Tapo connector. **Tapo** adds RTSP/app complexity; prefer **integrated or USB webcams** for straightforward local capture unless you explicitly need a room camera on the LAN.

### Philips Hue
- **Integration**: `phue` library.
- **Zones**: Defined in `hardware_config.json`.
