# Agent Body Specification (BODY.md)

## Hardware Platform
- **Model**: [e.g. Unitree G1 / Moorebot Scout]
- **CPU**: [e.g. Jetson Orin / Raspberry Pi 5]
- **GPU**: [e.g. Integrated NVIDIA Ampere]
- **VRAM**: [e.g. 8GB]

## Actuators
- [ ] **Legs**: [e.g. 12DOF Dynamic Balancing]
- [ ] **Arms**: [e.g. 6DOF Manipulators]
- [ ] **Head**: [e.g. 2DOF Pan/Tilt]
- [ ] **Voice**: [e.g. TTS / Speaker Array]

## Sensors
- [ ] **Vision**: [e.g. Intel RealSense D435 / Livox Mid-360 LiDAR]
- [ ] **Audio**: [e.g. 4-Mic Array]
- [ ] **IMU**: [e.g. 6-Axis Motion Tracking]
- [ ] **Tactile**: [e.g. Pressure Sensors in Paws/Feet]

## External Environment (IoT Federation)
- [ ] **Cameras**: Tapo C-series (RTSP Stream available)
- [ ] **Comfort**: Nest Thermostat (Temperature/Humidity)
- [ ] **Entry**: Ring Doorbell (Motion/Intercom)
- [ ] **Ambiance**: Philips Hue (Lighting Control)
- [ ] **Power**: Smart Plugs (Energy Monitoring/Switching)
- [ ] **Security**: MQTT-based Alarm System

## Connectivity
- **OSC Port**: 10705 (ROBOTICS_DEFAULT)
- **Local IP**: 127.0.0.1
- **Domain**: sovereign-local

## Operational Constraints
- **Battery Threshold**: 20% (Trigger "Low Power" Reflection)
- **Max Velocity**: [e.g. 1.2 m/s]
- **Safety Protocol**: Emergency Stop on obstacle < 30cm
