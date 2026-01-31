#!/usr/bin/env python3
"""
FLYON Ground Bridge
Connects to flight controller via MAVLink and sends telemetry to FLYON API
"""

import time
import requests
import argparse
import sys
import re
from urllib.parse import urlparse
from typing import Optional

# CWE-918: allow only http/https; block cloud metadata and non-localhost private IPs (SSRF)
def _validate_api_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        host = (parsed.hostname or '').lower()
        if not host:
            return False
        # block cloud metadata and internal hostnames
        if host in ('metadata.google.internal', '169.254.169.254'):
            return False
        # allow localhost / 127.0.0.1 for development
        if host in ('localhost', '127.0.0.1'):
            return True
        # block other private IP ranges
        if re.match(r'^127\.', host) or re.match(r'^10\.', host) or re.match(r'^172\.(1[6-9]|2[0-9]|3[0-1])\.', host) or re.match(r'^192\.168\.', host):
            return False
        return True
    except Exception:
        return False

try:
    from pymavlink import mavutil
except ImportError:
    print("Error: pymavlink not installed. Install with: pip install pymavlink")
    sys.exit(1)


class FLYONGroundBridge:
    def __init__(self, device_token: str, api_url: str = "http://localhost:3001", connection_string: str = "udp:127.0.0.1:14550"):
        self.device_token = device_token
        base = api_url.rstrip('/')
        if not _validate_api_url(base):
            raise ValueError(f"Invalid or disallowed API URL (SSRF protection): {api_url}")
        self.api_url = f"{base}/api/v1/telemetry"
        self.connection_string = connection_string
        self.connection = None
        self.session_id = f"session_{int(time.time())}"
        self.running = False
        
    def connect(self):
        """Connect to flight controller"""
        try:
            print(f"Connecting to {self.connection_string}...")
            self.connection = mavutil.mavlink_connection(self.connection_string)
            print("Waiting for heartbeat...")
            self.connection.wait_heartbeat()
            print("✓ Connected to flight controller!")
            return True
        except Exception as e:
            print(f"✗ Connection failed: {e}")
            return False
    
    def get_battery_status(self) -> Optional[float]:
        """Get battery percentage from BATTERY_STATUS message"""
        try:
            msg = self.connection.recv_match(type='BATTERY_STATUS', blocking=False, timeout=0.1)
            if msg and hasattr(msg, 'battery_remaining'):
                # battery_remaining is in centi-percent (0-10000)
                return msg.battery_remaining / 100.0
        except:
            pass
        return None
    
    def get_flight_mode(self) -> Optional[str]:
        """Get current flight mode"""
        try:
            msg = self.connection.recv_match(type='HEARTBEAT', blocking=False, timeout=0.1)
            if msg:
                mode_map = {
                    0: 'MANUAL',
                    1: 'CIRCLE',
                    2: 'STABILIZE',
                    3: 'TRAINING',
                    4: 'ACRO',
                    5: 'FLY_BY_WIRE_A',
                    6: 'FLY_BY_WIRE_B',
                    7: 'CRUISE',
                    8: 'AUTOTUNE',
                    10: 'AUTO',
                    11: 'RTL',
                    12: 'LOITER',
                    15: 'GUIDED',
                    16: 'INITIALISING',
                }
                return mode_map.get(msg.custom_mode & 0xFF, 'UNKNOWN')
        except:
            pass
        return None
    
    def get_armed_status(self) -> bool:
        """Check if drone is armed"""
        try:
            msg = self.connection.recv_match(type='HEARTBEAT', blocking=False, timeout=0.1)
            if msg:
                return bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
        except:
            pass
        return False
    
    def send_telemetry(self, telemetry: dict) -> bool:
        """Send telemetry to FLYON API"""
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.device_token}",
                    "Content-Type": "application/json"
                },
                json=telemetry,
                timeout=2
            )
            
            if response.status_code == 201:
                return True
            else:
                print(f"✗ API error: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"✗ Request error: {e}")
            return False
    
    def run(self):
        """Main loop - read telemetry and send to FLYON"""
        if not self.connect():
            return
        
        self.running = True
        last_battery_check = 0
        battery = None
        flight_mode = None
        armed = False
        
        print(f"Session ID: {self.session_id}")
        print("Starting telemetry transmission...")
        print("Press Ctrl+C to stop\n")
        
        try:
            while self.running:
                # Read GPS position
                msg = self.connection.recv_match(type='GLOBAL_POSITION_INT', blocking=True, timeout=1.0)
                
                if msg:
                    # Update battery every 5 seconds
                    if time.time() - last_battery_check > 5:
                        battery = self.get_battery_status()
                        flight_mode = self.get_flight_mode()
                        armed = self.get_armed_status()
                        last_battery_check = time.time()
                    
                    # Convert MAVLink to FLYON format
                    telemetry = {
                        "session_id": self.session_id,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ", time.gmtime()),
                        "latitude": msg.lat / 1e7,  # MAVLink uses degrees * 1e7
                        "longitude": msg.lon / 1e7,
                        "altitude": msg.alt / 1000.0,  # Altitude in meters (relative)
                        "speed": msg.vx / 100.0 if hasattr(msg, 'vx') else 0,  # Speed in m/s
                        "heading": msg.hdg / 100.0 if msg.hdg != 65535 else None,
                        "battery": battery if battery is not None else 0,
                        "flightMode": flight_mode,
                        "armed": armed,
                    }
                    
                    # Send telemetry
                    if self.send_telemetry(telemetry):
                        print(f"✓ {telemetry['latitude']:.6f}, {telemetry['longitude']:.6f} | "
                              f"Alt: {telemetry['altitude']:.1f}m | "
                              f"Speed: {telemetry['speed']:.1f}m/s | "
                              f"Battery: {telemetry['battery']:.1f}%")
                    else:
                        print("✗ Failed to send telemetry")
                
                time.sleep(0.1)  # Send every 100ms
                
        except KeyboardInterrupt:
            print("\n\nStopping ground bridge...")
            self.running = False
        except Exception as e:
            print(f"\n✗ Error: {e}")
            self.running = False


def main():
    parser = argparse.ArgumentParser(description='FLYON Ground Bridge - MAVLink to FLYON telemetry bridge')
    parser.add_argument('--token', required=True, help='FLYON device token')
    parser.add_argument('--api-url', default='http://localhost:3001', help='FLYON API URL')
    parser.add_argument('--connection', default='udp:127.0.0.1:14550',
                       help='MAVLink connection string (e.g., udp:127.0.0.1:14550 or serial:/dev/ttyUSB0:57600)')
    
    args = parser.parse_args()
    
    bridge = FLYONGroundBridge(
        device_token=args.token,
        api_url=args.api_url,
        connection_string=args.connection
    )
    
    bridge.run()


if __name__ == '__main__':
    main()
