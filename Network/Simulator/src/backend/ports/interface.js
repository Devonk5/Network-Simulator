import Port from './port';
import Network from '../network';
import Switch from '../devices/switch';
import Host from '../devices/host';
import DHCP from '../../Servers/DHCP';
import DNSServer from '../devices/DNS';
import DHCPServer from '../../Servers/DHCP';

class Interface extends Port {
    constructor(name, parentRouter, networkAddress = null, subnetMask = null, DHCP, macAddress, DNS) {
        super(name, parentRouter, macAddress);
        this.network = new Network(networkAddress, subnetMask);
        this.ipAddress = this.network.allocateIPAddress(this.parentDevice);
        this.parentDevice.interfaces.set(name, this);
        this.devices = new Map();
        this.primaryDHCP = null;
        console.log('interfaces:', this.parentDevice.interfaces.get(name));
        console.log('interface DHCP:', DHCP);
        if (DHCP) {
            this.primaryDHCP = new DHCPServer(this.network, this.ipAddress, DNS);
            this.network.setDHCPServer(this.primaryDHCP);
        }
        this.parentDevice.routingTable.push({
            subnet: this.network.networkAddress,
            mask: this.network.subnetMask,
            interfaceName: name
        });
    }

    
    connectDevice(device, port) {
        if (this.connectedDevice) {
            console.warn(`Port ${this.name} already has a device connected!`);
            return;
        }
        this.connectedDevice = device;
        this.connectedPort = port;
        console.log(`[Port] ${this.name} connecting to`, device?.name || device?.macAddress);
    }
    disconnectPort() {
        this.connectedPort.connectDevice = null;
        this.connectedPort.connectedPort = null;
        this.network.releaseIPAddress(this.ipAddress);
        this.connectedDevice = null;
        this.connectedPort = null;
    }
    
}

export default Interface;