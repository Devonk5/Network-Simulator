class Device {
    constructor(name, macAddress, ipAddress = null) {
        this.name = name;               // Friendly name
        this.macAddress = macAddress;   // Unique MAC address
        this.ipAddress = ipAddress;     // Optional for Hosts/Routers
        this.port = null;               // Port object
    }

    receivePacket(packet, fromPort = null) {
        console.log(`${this.name} received packet:`, packet);
    }

    sendPacket(packet) {
        if (this.port && this.port.connectedDevice) {
            console.log(`${this.name} sending packet via ${this.port.name}`);
            this.port.connectedDevice.receivePacket(packet, this.port);
        } else {
            console.warn(`${this.name} has no port to send packet`);
        }
    }
}

module.exports = Device;
