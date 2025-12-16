const Device = require('./device');
const Port = require('../ports/port');

class Switch extends Device {
    constructor(name, macAddress) {
        super(name, macAddress);
        this.ports = new Map();     // portName -> Port object
        this.macTable = new Map();  // macAddress -> portName
    }

    connectPort(port) {
        this.ports.set(port.name, port);
    }

    receiveFrame(frame, fromPortName) {
        const fromPort = this.ports.get(fromPortName);

        // Learn source MAC
        this.macTable.set(frame.srcMac, fromPortName);
        console.log(`${this.name} learned MAC ${frame.srcMac} is on port ${fromPortName}`);

        // Find destination port
        const destPortName = frame.destMac ? this.macTable.get(frame.destMac) : null;

        if (destPortName && destPortName !== fromPortName) {
            // Forward only if VLAN matches
            const destPort = this.ports.get(destPortName);
            if (destPort.vlan === fromPort.vlan) {
                destPort.connectedDevice?.receiveFrame(frame, destPortName);
                console.log(`${this.name} forwarded frame to port ${destPortName}`);
            } else {
                console.log(`${this.name} blocked frame across VLANs`);
            }
        } else {
            // Broadcast within VLAN
            console.log(`${this.name} broadcasting frame in VLAN ${fromPort.vlan?.id}`);
            for (const [portName, port] of this.ports) {
                if (portName !== fromPortName && port.vlan === fromPort.vlan) {
                    port.connectedDevice?.receiveFrame(frame, portName);
                }
            }
        }
    }
}

module.exports = Switch;
