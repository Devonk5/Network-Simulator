const Network = require('./src/network');
const Host = require('./src/devices/host');
const Switch = require('./src/devices/switch');
const Router = require('./src/devices/router');
const Port = require('./src/ports/port');
const Vlan = require('./src/Vlan');

// Create a network
const network = new Network();

// Create VLANs
const vlan10 = new Vlan(10, 'VLAN10');
const vlan20 = new Vlan(20, 'VLAN20');
network.vlans.set(vlan10.id, vlan10);
network.vlans.set(vlan20.id, vlan20);

// Create switch
const sw1 = new Switch('Switch1', '00:AA:BB:CC:DD:01');

// Create switch ports and assign VLANs
const swPort1 = new Port(1, sw1, vlan10);
const swPort2 = new Port(2, sw1, vlan10);
const swPort3 = new Port(3, sw1, vlan20);

sw1.connectPort(swPort1);
sw1.connectPort(swPort2);
sw1.connectPort(swPort3);

// Add switch to network
network.addSwitch(sw1);

// Create hosts
const host1 = new Host('Host1', '00:11:22:33:44:01', '192.168.10.2');
const host2 = new Host('Host2', '00:11:22:33:44:02', '192.168.10.3');
const host3 = new Host('Host3', '00:11:22:33:44:03', '192.168.20.2');

// Connect hosts to switch ports
host1.connectPort(swPort1); // VLAN 10
host2.connectPort(swPort2); // VLAN 10
host3.connectPort(swPort3); // VLAN 20

network.addHost(host1);
network.addHost(host2);
network.addHost(host3);

// Create a router
const router = new Router('Router1', '00:AA:BB:CC:DD:FF');

// Add router interfaces
const rIface1 = router.addInterface('eth0', '192.168.10.1', '00:AA:BB:CC:DD:11');
const rIface2 = router.addInterface('eth1', '192.168.20.1', '00:AA:BB:CC:DD:22');

// Connect router interfaces to switch ports
rIface1.connectDevice(swPort2); // VLAN 10
rIface2.connectDevice(swPort3); // VLAN 20

network.addRouter(router);

// Print network topology
network.printTopology();

// Send packets
console.log('\n--- Sending packets ---');
host1.sendPacket(host2.macAddress, 'Hello VLAN10!');
host1.sendPacket(host3.macAddress, 'Hello VLAN20!');
