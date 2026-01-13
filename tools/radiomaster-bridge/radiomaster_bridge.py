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
            if 'CH340' in port.description or 'CP210' in port.description or 'USB Serial' in port.description:
                logger.info(f"Found potential RadioMaster port: {port.device} - {port.description}")
                return port.device
        
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
        if not self.serial_connection or not self.serial_connection.is_open:
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
            
            # If no data available, return basic status
            return {
                'connected': True,
                'timestamp': datetime.utcnow().isoformat(),
            }
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
            # Update remote status to connected
            status_url = f"{self.api_url}{FLYON_API_PREFIX}/remotes/{self.remote_id}/status"
            self.session.patch(status_url, json={'status': 'connected'})

            # Update remote metadata with current data
            metadata_url = f"{self.api_url}{FLYON_API_PREFIX}/remotes/{self.remote_id}/metadata"
            response = self.session.patch(metadata_url, json={'metadata': data})
            
            if response.status_code == 200:
                logger.debug(f"Sent data to FLYON: {json.dumps(data, indent=2)}")
                return True
            else:
                logger.error(f"Failed to send data: {response.status_code} - {response.text}")
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
            while self.running:
                # Read remote data
                data = self.read_remote_data()
                if data:
                    self.send_to_flyon(data)
                
                # Sleep for 100ms (10 Hz update rate)
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
