class Port {
    constructor(name, parentDevice, vlan) {
        this.name = name;               
        this.parentDevice = parentDevice;
        this.connectedDevice = null;
        this.vlan = vlan;
    }

    connectDevice(device) {
        if (this.connectedDevice) {
            console.warn(`Port ${this.name} already has a device connected!`);
            return;
        }
        this.connectedDevice = device;
    }

    disconnectDevice() {
        this.connectedDevice = null;
    }

    sendFrame(frame) {
        if (!this.connectedDevice) {
            console.warn(`Port ${this.name} has no device connected to send frame.`);
            return;
        }
        // Pass port name as fromPortNumber to match Switch.receiveFrame
        this.connectedDevice.receiveFrame(frame, this.name);
    }

    assignVlan(vlan) {
        this.vlan = vlan;
    }
}

module.exports = Port;
