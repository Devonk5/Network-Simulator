class Vlan {
    constructor(id, name = null) {
        this.id = id;             // VLAN ID (e.g., 10, 20)
        this.name = name || `VLAN${id}`; // Optional name
        this.ports = new Set();   // Set of Port objects belonging to this VLAN
    }

    // Add a port to the VLAN
    addPort(port) {
        if (this.ports.has(port)) {
            console.warn(`Port ${port.name} is already in VLAN ${this.id}`);
            return;
        }
        port.vlan = this; // Link the port to this VLAN
        this.ports.add(port);
    }

    // Remove a port from the VLAN
    removePort(port) {
        if (!this.ports.has(port)) return;
        port.vlan = null;
        this.ports.delete(port);
    }

    // Broadcast a frame to all ports in the VLAN except the source port
    broadcast(frame, sourcePort) {
        for (const port of this.ports) {
            if (port !== sourcePort && port.connectedDevice) {
                port.connectedDevice.receivePacket(frame, port);
            }
        }
    }

    listPorts() {
        return [...this.ports].map(port => port.name);
    }
}

module.exports = Vlan;
