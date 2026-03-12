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
- **Capabilities**: Power monitoring, camera streaming.

### Philips Hue
- **Integration**: `phue` library.
- **Zones**: Defined in `hardware_config.json`.
