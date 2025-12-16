class Network {
    constructor() {
        this.switches = new Map();
        this.hosts = new Map();
        this.routers = new Map();
        this.vlans = new Map();
    }

    addSwitch(switchObj) { this.switches.set(switchObj.name, switchObj); }
    addHost(hostObj) { this.hosts.set(hostObj.name, hostObj); }
    addRouter(routerObj) { this.routers.set(routerObj.name, routerObj); }
    addVlan(vlanObj) { this.vlans.set(vlanObj.id, vlanObj); }

    printTopology() {
        console.log("Switches:", [...this.switches.keys()]);
        console.log("Hosts:", [...this.hosts.keys()]);
        console.log("Routers:", [...this.routers.keys()]);
        console.log("VLANs:", [...this.vlans.keys()]);
    }

    // Connect a host to a switch port
    connectHostToSwitch(hostName, switchName, portName, vlanId = null) {
        const host = this.hosts.get(hostName);
        const sw = this.switches.get(switchName);
        const vlan = vlanId ? this.vlans.get(vlanId) : null;

        if (!host || !sw) return console.warn("Host or switch not found!");

        const port = sw.ports.get(portName);
        if (!port) {
            console.warn(`Port ${portName} not found on switch ${switchName}`);
            return;
        }

        port.vlan = vlan;
        host.connectPort(port);
        console.log(`Connected host ${hostName} to switch ${switchName} port ${portName} on VLAN ${vlanId}`);
    }

    // Broadcast a packet within VLAN
    sendFrameWithinVlan(srcDeviceName, destMac, data) {
        const device = this.hosts.get(srcDeviceName) || this.routers.get(srcDeviceName);
        if (!device || !device.port) return console.warn("Device not found or not connected to a port.");

        const frame = {
            srcMac: device.macAddress,
            destMac: destMac,
            payload: data,
            vlan: device.port.vlan
        };

        const port = device.port;
        const sw = port.parentDevice; // assuming port.parentDevice is a Switch
        if (!sw) return console.warn("Device not connected to a switch.");

        sw.receiveFrame(frame, port.name);
    }
}

module.exports = Network;
