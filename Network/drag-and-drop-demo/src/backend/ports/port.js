import Host from '../devices/host';
import DNSServer from '../devices/DNS';

class Port {
    constructor(name, parentDevice, macAddress, vlan = null) {
        this.name = name;               
        this.parentDevice = parentDevice;
        this.connectedPort = null;
        this.connectedDevice = null;
        this.macAddress = macAddress;
        this.vlan = vlan;
    }

    connectDevice(device, port) {
        if (this.connectedDevice) {
            console.warn(`Port ${this.name} already has a device connected!`);
            return;
        }
        this.connectedDevice = device;
        this.connectedPort = port;
        console.log('port:', port);
        if (!this.parentDevice.ipAddress && this.parentDevice instanceof Host) {
            console.log('Starting DHCP requests for', this.parentDevice.name);
            this.parentDevice.requestIP()
        }
        if (!this.parentDevice.ipAddress && this.parentDevice instanceof DNSServer) {
            this.parentDevice.setDNS()
        }
    }

    disconnectDevice() {
        if (!this.connectedDevice) {
            console.warn(`Port ${this.name} has no device connected to disconnect.`);
            return;
        }
        this.connectedPort.connectedDevice = null;
        this.connectedPort.connectedPort = null;
        console.log('Disconnecting device', this.connectedDevice, 'from port', this.name);
        console.log('connected device connection check:', this.connectedPort.connectedDevice);
        if(this.parentDevice instanceof Host && this.parentDevice.ipAddress !== null){
            this.parentDevice.network.releaseIPAddress(this.parentDevice.ipAddress);
            console.log('Releasing IP address for', this.parentDevice.name);
        }
        this.connectedDevice = null;
        this.connectedPort = null;
    }
    

    sendFrame(frame) {
        if (!this.connectedDevice) {
            console.warn(`Port ${this.name} has no device connected to send frame.`);
            return;
        }
        // Pass port name as fromPortNumber to match Switch.receiveFrame
        this.connectedDevice.receiveFrame(frame, this.connectedPort?.name);
    }

    assignVlan(vlan) {
        this.vlan = vlan;
    }
}

export default Port;
