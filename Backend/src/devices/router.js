const Device = require('./device');
const Port = require('../ports/port');
const Packet = require('../data/packet');

class Router extends Device {
    constructor(name, macAddress) {
        super(name, macAddress);
        this.interfaces = new Map(); // interfaceName -> Port
        this.routingTable = [];      // Array of { subnet, mask, interfaceName }
    }

    addInterface(name, ipAddress = null, macAddress = null) {
        if (this.interfaces.has(name)) {
            console.warn(`Interface ${name} already exists on ${this.name}`);
            return;
        }

        const iface = new Port(name, this, null);
        iface.ipAddress = ipAddress;
        iface.macAddress = macAddress;
        this.interfaces.set(name, iface);
        return iface;
    }

    addRoute(subnet, mask, interfaceName) {
        if (!this.interfaces.has(interfaceName)) {
            console.warn(`Cannot add route: interface ${interfaceName} does not exist`);
            return;
        }

        this.routingTable.push({ subnet, mask, interfaceName });
        console.log(`${this.name} added route: ${subnet}/${mask} via ${interfaceName}`);
    }

    sendPacket(packet, interfaceName) {
        const iface = this.interfaces.get(interfaceName);
        if (!iface || !iface.connectedDevice) {
            console.warn(`${this.name} cannot send packet: interface ${interfaceName} not connected`);
            return;
        }

        console.log(`${this.name} sending packet from ${iface.ipAddress} to ${packet.destIP}`);
        iface.connectedDevice.receivePacket(packet, iface.name);
    }

    receivePacket(packet, fromInterfaceName) {
        console.log(`${this.name} received packet on ${fromInterfaceName}:`, packet);

        // Determine which interface to forward packet based on routing table
        const route = this.routingTable.find(r => this.ipInSubnet(packet.destIP, r.subnet, r.mask));

        if (route) {
            const outIface = this.interfaces.get(route.interfaceName);
            if (outIface && outIface.connectedDevice) {
                console.log(`${this.name} forwarding packet to interface ${route.interfaceName}`);
                outIface.connectedDevice.receivePacket(packet, route.interfaceName);
            } else {
                console.warn(`${this.name} cannot forward packet: interface ${route.interfaceName} not connected`);
            }
        } else {
            console.warn(`${this.name} has no route for destination ${packet.destIP}`);
        }
    }

    // Simple IP-in-subnet check
    ipInSubnet(ip, subnet, mask) {
        const ipNum = this.ipToNumber(ip);
        const subnetNum = this.ipToNumber(subnet);
        const maskNum = this.ipToNumber(mask);
        return (ipNum & maskNum) === (subnetNum & maskNum);
    }

    ipToNumber(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    }
}

module.exports = Router;
