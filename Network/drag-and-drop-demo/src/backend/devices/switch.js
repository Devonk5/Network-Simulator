import Device from './device';
import Port from '../ports/port';

let globalFrameCounter = 0; // unique frame IDs

class Switch extends Device {
  constructor(name, macAddress, portsPerSide, macs) {
    super(name, macAddress);

    this.ports = new Map();        // portName -> Port object
    this.macTable = new Map();     // vlanId -> Map(macAddress -> portName)
    this.processedFrames = new Set(); // prevent loops
    this.floodQueue = [];          // asynchronous flood queue

    // Initialize ports
    let ports = 0;
    ['top', 'right', 'bottom', 'left'].forEach(side => {
      const count = portsPerSide[side] || 0;
      for (let i = 0; i < count; i++) {
        const portName = `${side}-${i}`;
        this.ports.set(portName, new Port(portName, this, macs[ports]));
        ports++;
      }
    });
  }

  
  receiveFrame(frame, fromPortName) {
    const fromPort = this.ports.get(fromPortName);
    if (!fromPort) return console.warn(`${this.name} received frame from unknown port ${fromPortName}`);

    // Assign unique ID if frame doesn’t have one
    if (!frame.id) frame.id = ++globalFrameCounter;

    // Ignore already processed frames (loop prevention)
    if (this.processedFrames.has(frame.id)) return;
    this.processedFrames.add(frame.id);

    console.log(`${this.name} received frame from ${frame.srcMac} to ${frame.destMac} on port ${fromPortName}`);

    // Determine VLAN (default 1)
    const vlanId = fromPort.vlan || 1;


    // Initialize VLAN MAC table if needed
    if (!this.macTable.has(vlanId)) this.macTable.set(vlanId, new Map());

    // Learn source MAC
    this.macTable.get(vlanId).set(frame.srcMac, fromPortName);
    console.log(`${this.name} learned MAC ${frame.srcMac} is on port ${fromPortName} (VLAN ${vlanId})`);

    // Check if destination MAC is known in this VLAN
    const outPortName = this.macTable.get(vlanId).get(frame.destMac);

    if (outPortName && outPortName !== fromPortName) {
      // Unicast forwarding
      const outPort = this.ports.get(outPortName);
      if (fromPort.vlan?.id === outPort.vlan?.id) {
        setTimeout(() => {
          outPort.sendFrame({ ...frame, id: ++globalFrameCounter });
          console.log(`${this.name} forwarded frame to port ${outPortName} on device ${outPort.connectedDevice?.name}`);
        }, 0);
      } else {
        console.log(`${this.name} blocked frame across VLANs`);
      }
    } else {
      // Destination unknown → flood to all ports in same VLAN except ingress
      for (const [portName, port] of this.ports) {
        if (!port.connectedDevice || portName === fromPortName) continue;
        const portVlan = port.vlan?.id || 1;
        if (portVlan !== vlanId) continue;

        // Clone frame with new ID for each port
        this.floodQueue.push({ port, frame: { ...frame, id: ++globalFrameCounter } });
      }

      for (const [portName, port] of this.ports) {
        if (!port.connectedDevice || portName === fromPortName) continue;

        const portVlan = port.vlan?.id || 1;
        if (portVlan !== vlanId) continue;

        const clonedFrame = { ...frame, id: ++globalFrameCounter };

        setTimeout(() => {
          port.sendFrame(clonedFrame);
          console.log(`${this.name} flooding frame to port ${port.name} on device ${port.connectedDevice?.name}`);
        }, 0);
      }

    }
  }

  printMACTable() {
    console.log(`\n${this.name} MAC Table:`);
    for (const [vlanId, table] of this.macTable.entries()) {
      console.log(` VLAN ${vlanId}:`);
      for (const [mac, portName] of table.entries()) {
        console.log(`   ${mac} -> ${portName}`);
      }
    }
  }
}

export default Switch;
