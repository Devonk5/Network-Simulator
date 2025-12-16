const Device = require('./device');
const Frame = require('../data/frame');
const Packet = require('../data/packet');

class Host extends Device {
    constructor(name, macAddress, ipAddress = null) {
        super(name, macAddress, ipAddress);
        this.port = null; // Port object this host is connected to
    }

    connectPort(port) {
        this.port = port;
        port.connectDevice(this);
    }

    sendPacket(destIP, data) {
        if (!this.port) {
            console.warn(`${this.name} is not connected to a port!`);
            return;
        }

        const packet = new Packet(this.ipAddress, destIP, data);
        const frame = new Frame(this.macAddress, null, packet, this.port.vlan);

        console.log(`${this.name} sending frame towards ${destIP}`);
        this.port.connectedDevice?.receiveFrame(frame, this.port.name);
    }

    receiveFrame(frame, fromPortNumber = null) {
        // Only accept frames destined to this host
        if (frame.destMac && frame.destMac !== this.macAddress) return;

        console.log(`${this.name} received packet:`, frame.payload);
    }

    receivePacket(packet, fromInterface = null) {
        console.log(`${this.name} received packet:`, packet);
    }
}

module.exports = Host;
