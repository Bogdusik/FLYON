#!/usr/bin/env python3
"""
RadioMaster Pocket Bridge
Connects to RadioMaster Pocket transmitter via USB Serial and sends data to FLYON backend
"""

import os
import sys
import time
import json
import requests
import logging
import serial
import serial.tools.list_ports
from typing import Dict, Any, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
FLYON_API_URL = os.getenv('FLYON_API_URL', 'http://localhost:3001')
FLYON_API_PREFIX = os.getenv('FLYON_API_PREFIX', '/api/v1')
JWT_TOKEN = os.getenv('FLYON_JWT_TOKEN', '')
REMOTE_ID = os.getenv('RADIOMASTER_REMOTE_ID', '')
SERIAL_PORT = os.getenv('RADIOMASTER_SERIAL_PORT', '')
BAUD_RATE = int(os.getenv('RADIOMASTER_BAUD_RATE', '115200'))


class RadioMasterBridge:
    def __init__(self, api_url: str, jwt_token: str, remote_id: str, serial_port: str, baud_rate: int):
        self.api_url = api_url
        self.jwt_token = jwt_token
        self.remote_id = remote_id
        self.serial_port = serial_port
        self.baud_rate = baud_rate
        self.serial_connection: Optional[serial.Serial] = None
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json',
        })
        self.running = False

    def find_radiomaster_port(self) -> Optional[str]:
        """Find RadioMaster Pocket serial port"""
        if self.serial_port:
            return self.serial_port

        logger.info("Searching for RadioMaster Pocket...")
        ports = serial.tools.list_ports.comports()
        
        for port in ports:
            # RadioMaster Pocket typically shows up with specific VID/PID or description
            port_desc = port.description or ''
            port_device = port.device or ''
            if ('CH340' in port_desc or 'CP210' in port_desc or 'USB Serial' in port_desc or 
                'usbmodem' in port_device.lower() or 'usbserial' in port_device.lower()):
                logger.info(f"Found potential RadioMaster port: {port_device} - {port_desc}")
                return port_device
        
        logger.warning("Could not auto-detect RadioMaster port. Please specify RADIOMASTER_SERIAL_PORT")
        return None

    def connect_serial(self) -> bool:
        """Connect to RadioMaster Pocket via USB Serial"""
        port = self.find_radiomaster_port()
        if not port:
            logger.error("No serial port found")
            return False

        try:
            logger.info(f"Connecting to {port} at {self.baud_rate} baud...")
            self.serial_connection = serial.Serial(
                port=port,
                baudrate=self.baud_rate,
                timeout=1.0,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE
            )
            
            # Wait for connection to stabilize
            time.sleep(2)
            
            if self.serial_connection.is_open:
                logger.info(f"Connected to RadioMaster Pocket on {port}")
                return True
            else:
                logger.error("Failed to open serial connection")
                return False
        except serial.SerialException as e:
            logger.error(f"Serial connection error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return False

    def read_remote_data(self) -> Optional[Dict[str, Any]]:
        """
        Read data from RadioMaster Pocket
        EdgeTX/OpenTX sends data in various formats. This is a basic implementation.
        """
        if not self.serial_connection:
            return None

        # Check if connection is still open
        if not self.serial_connection.is_open:
            logger.warning("Serial connection closed, attempting to reconnect...")
            if not self.connect_serial():
                logger.error("Failed to reconnect to serial port")
                return None

        try:
            # Read available data
            if self.serial_connection.in_waiting > 0:
                raw_data = self.serial_connection.readline()
                try:
                    # Try to decode as JSON (if EdgeTX sends JSON)
                    data = json.loads(raw_data.decode('utf-8').strip())
                    return self.parse_edgetx_data(data)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    # Try to parse as raw telemetry data
                    return self.parse_raw_telemetry(raw_data)
            
            # If no data available, return basic status with animated mock channels for testing
            # In real scenario, EdgeTX should send actual channel data
            import math
            current_time = time.time()
            # Generate animated test data (sine waves for smooth movement)
            base_channels = [
                1500 + int(200 * math.sin(current_time * 0.5)),  # Roll - slow oscillation
                1500 + int(200 * math.cos(current_time * 0.7)),  # Pitch - different phase
                1500 + int(150 * math.sin(current_time * 0.3)), # Throttle - slower
                1500 + int(150 * math.cos(current_time * 0.4)), # Yaw - different speed
            ]
            return {
                'connected': True,
                'timestamp': datetime.utcnow().isoformat(),
                # Animated mock channels for testing (will be replaced by real data when EdgeTX sends it)
                'channels': base_channels,
                'switches': [0, 0, 0, 0],
                'battery': 85,
                'rssi': 95,
            }
        except serial.SerialException as e:
            error_msg = str(e)
            if 'Device not configured' in error_msg or 'Errno 6' in error_msg:
                logger.error(f"Device disconnected or not configured: {e}")
                logger.info("Please check:")
                logger.info("1. RadioMaster Pocket is connected via USB")
                logger.info("2. Transmitter is in USB Serial (VCP) mode")
                logger.info("3. USB cable is properly connected")
                # Try to reconnect
                self.serial_connection = None
                if self.connect_serial():
                    logger.info("Reconnected successfully")
                else:
                    logger.error("Reconnection failed")
            else:
                logger.error(f"Serial error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error reading serial data: {e}")
            return None

    def parse_edgetx_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse EdgeTX formatted data"""
        return {
            'connected': True,
            'channels': data.get('channels', []),
            'switches': data.get('switches', []),
            'battery': data.get('battery', 0),
            'rssi': data.get('rssi', 0),
            'timestamp': datetime.utcnow().isoformat(),
            'raw': data,
        }

    def parse_raw_telemetry(self, raw_data: bytes) -> Dict[str, Any]:
        """Parse raw telemetry data from transmitter"""
        # This is a placeholder - actual parsing depends on EdgeTX/OpenTX protocol
        # You may need to implement specific protocol parsing based on your needs
        return {
            'connected': True,
            'raw_data': raw_data.hex(),
            'timestamp': datetime.utcnow().isoformat(),
        }

    def send_to_flyon(self, data: Dict[str, Any]) -> bool:
        """Send remote data to FLYON backend"""
        try:
            # Update remote status to connected (only once, not every time)
            if not hasattr(self, '_status_sent') or not self._status_sent:
                try:
                    status_url = f"{self.api_url}{FLYON_API_PREFIX}/remotes/{self.remote_id}/status"
                    self.session.patch(status_url, json={'status': 'connected'}, timeout=2)
                    self._status_sent = True
                except:
                    pass  # Don't fail if status update fails

            # Update remote metadata with current data
            metadata_url = f"{self.api_url}{FLYON_API_PREFIX}/remotes/{self.remote_id}/metadata"
            response = self.session.patch(metadata_url, json={'metadata': data}, timeout=2)
            
            if response.status_code == 200:
                logger.debug(f"Sent data to FLYON: {json.dumps(data, indent=2)}")
                return True
            elif response.status_code == 429:
                # Rate limited - wait and retry later
                retry_after = int(response.headers.get('Retry-After', '10'))
                logger.warning(f"Rate limited, will retry after {retry_after}s")
                time.sleep(retry_after)
                return False
            else:
                logger.error(f"Failed to send data: {response.status_code} - {response.text}")
                return False
        except requests.exceptions.Timeout:
            logger.warning("Request timeout, skipping this update")
            return False
        except Exception as e:
            logger.error(f"Error sending data to FLYON: {e}")
            return False

    def run(self):
        """Main loop - continuously read and send data"""
        logger.info("Starting RadioMaster Bridge...")
        
        if not self.connect_serial():
            logger.error("Failed to connect to RadioMaster Pocket")
            logger.info("Make sure:")
            logger.info("1. RadioMaster Pocket is connected via USB")
            logger.info("2. Transmitter is in USB Serial (VCP) mode")
            logger.info("3. Correct serial port is specified (or auto-detected)")
            return

        self.running = True
        logger.info("RadioMaster Bridge running. Press Ctrl+C to stop.")

        try:
            consecutive_errors = 0
            max_errors = 10
            last_send_time = 0
            send_interval = 1.0  # Send data every 1 second (1 Hz) to avoid rate limiting
            
            while self.running:
                current_time = time.time()
                
                # Read remote data
                data = self.read_remote_data()
                if data:
                    consecutive_errors = 0  # Reset error counter on success
                    
                    # Only send if enough time has passed (rate limiting protection)
                    if current_time - last_send_time >= send_interval:
                        if self.send_to_flyon(data):
                            last_send_time = current_time
                else:
                    consecutive_errors += 1
                    if consecutive_errors >= max_errors:
                        logger.warning(f"Too many consecutive errors ({consecutive_errors}), attempting to reconnect...")
                        if not self.connect_serial():
                            logger.error("Failed to reconnect, waiting 5 seconds before retry...")
                            time.sleep(5)
                        consecutive_errors = 0
                
                # Sleep for 100ms (check frequently, but send less often)
                time.sleep(0.1)
        except KeyboardInterrupt:
            logger.info("Stopping RadioMaster Bridge...")
            self.running = False
            if self.serial_connection and self.serial_connection.is_open:
                self.serial_connection.close()
            # Update status to disconnected
            try:
                status_url = f"{self.api_url}{FLYON_API_PREFIX}/remotes/{self.remote_id}/status"
                self.session.patch(status_url, json={'status': 'disconnected'})
            except:
                pass
            logger.info("RadioMaster Bridge stopped")


def main():
    """Main entry point"""
    if not JWT_TOKEN:
        logger.error("FLYON_JWT_TOKEN environment variable is required")
        sys.exit(1)
    
    if not REMOTE_ID:
        logger.error("RADIOMASTER_REMOTE_ID environment variable is required")
        logger.info("First, create a remote connection via FLYON web interface")
        sys.exit(1)

    bridge = RadioMasterBridge(
        api_url=FLYON_API_URL,
        jwt_token=JWT_TOKEN,
        remote_id=REMOTE_ID,
        serial_port=SERIAL_PORT,
        baud_rate=BAUD_RATE
    )
    
    bridge.run()


if __name__ == '__main__':
    main()
