import Device from './device';
import Interface from '../ports/interface';
import Frame from '../data/frame';
import Packet from '../data/packet';
import ARPTable from '../../Servers/ARP';

class Router extends Device {
  constructor(name, macAddress, portsPerSide, routerPortsData = [], macs) {
    super(name, macAddress);

    this.interfaces = new Map(); // interfaceName -> Interface
    this.routingTable = [];      // { subnet, mask, interfaceName }
    this.arpTables = new Map();  // interfaceName -> ARPTable
    this.queuedPackets = new Map(); // interfaceName -> Array of Frames waiting for ARP

    console.log('routerPortsData:', routerPortsData);

    // Setup interfaces
    let portIndex = 0;
    ['top', 'right', 'bottom', 'left'].forEach(side => {
      const count = portsPerSide[side] || 0;
      for (let i = 0; i < count; i++) {
        const ifaceName = `${side}-${i}`;
        const portData = routerPortsData[portIndex] || {};
        const ip = portData.ip || null;
        const subnet = portData.subnet || null;
        const DHCP = portData.useDHCP;
        const DNS = portData.DNS

        console.log('DHCP for interface', ifaceName, 'is', DHCP);

        const iface = new Interface(ifaceName, this, ip, subnet, DHCP, macs[portIndex], DNS);
        this.interfaces.set(ifaceName, iface);
        this.arpTables.set(ifaceName, new ARPTable());
        this.queuedPackets.set(ifaceName, []); // initialize empty queue

        portIndex++;
      }
    });
  }

  // -----------------------
  // Receiving frames
  // -----------------------
  receiveFrame(frame, ifaceName) {
    const iface = this.interfaces.get(ifaceName);
    if (!iface) return;

    console.log(`[${this.name}] receiveFrame typed ${frame.EtherType} on interface ${ifaceName}`);

    const isBroadcast = frame.destMac === 'ff:ff:ff:ff:ff:ff';
    const isForMe = frame.destMac === iface.macAddress;

    if (!isBroadcast && !isForMe) {
      console.log(`[${this.name}] Frame not for me (destMac: ${frame.destMac}), ignoring.`);
      return;
    }

    const packet = frame.payload;
    console.log(`[${this.name}] Received frame on ${ifaceName} from ${frame.srcMac} to ${frame.destMac} (protocol: ${packet.protocol})`);

    switch(packet.protocol) {
      case 'DHCP':
        this.handleDHCP(frame, ifaceName);
        break;
      case 'ARP':
        this.handleARP(frame, ifaceName);
        break;
      case 'IP':
        console.log(`[${this.name}] Handling IP on ${ifaceName}`);
        this.forwardIP(frame);
        break;
      case 'ICMP':
        console.log(`[${this.name}] Handling ICMP on ${ifaceName}`);
        this.handleICMP(frame, ifaceName);
        break;
      default:
        console.warn(`[${this.name}] Unknown protocol ${packet.protocol}`);
    }
  }

  //------------------------
  // ICMP handling
  //------------------------
  handleICMP(frame, ifaceName) {
    const iface = this.interfaces.get(ifaceName);
    if (!iface) return;

    const packet = frame.payload;
    const myInterface = [...this.interfaces.values()].find(i => i.ipAddress === packet.destIP);

    if (myInterface) {
      // Packet is for the router
      console.log(`[${this.name}] ICMP packet is for me on interface ${myInterface.name}`);
      if (packet.messageType === 'ECHO_REQUEST') {
        console.log(`[${this.name}] ICMP ECHO_REQUEST received, sending ECHO_REPLY`);

        const echoReply = new Packet(
          myInterface.ipAddress,
          packet.srcIP,
          'ICMP',
          'ECHO_REPLY',
          packet.data
        );

        const echoFrame = new Frame(
          myInterface.macAddress,
          frame.srcMac,
          echoReply,
          'ICMP'
        );

        iface.connectedDevice?.receiveFrame(echoFrame, iface.connectedPort?.name);
      }
    } else {
      console.log(`[${this.name}] ICMP packet not for me, forwarding ${packet.destIP}`);
      this.forwardIP(frame);
    }
  }

  // -----------------------
  // DHCP handling
  // -----------------------
  handleDHCP(frame, ifaceName) {
    const iface = this.interfaces.get(ifaceName);
    if (!iface) return;

    const packet = frame.payload;
    console.log(`[${this.name}] Handling DHCP on ${ifaceName}: ${packet.messageType}`);

    if (packet.messageType === 'DISCOVER') {
      const offeredIP = iface.primaryDHCP.allocateIp(frame.srcMac);
      console.log(`[${this.name}] DHCP OFFER ${offeredIP} on ${ifaceName}`);

      const replyPacket = new Packet(iface.ipAddress, null, 'DHCP', 'OFFER', { ip: offeredIP });
      const replyFrame = new Frame(this.macAddress, frame.srcMac, replyPacket, 'DHCP');
      iface.connectedDevice?.receiveFrame(replyFrame, iface.connectedPort?.name);
    } 
    else if (packet.messageType === 'REQUEST') {
      const requestedIP = packet.data?.requestedIP;
      if (!requestedIP) return;

      console.log(iface.primaryDHCP.dnsServer, `: DNS on port`);
      const ackPacket = new Packet(iface.ipAddress, null, 'DHCP', 'ACK', {
            
      ip: requestedIP,
      network: this.interfaces.get(ifaceName).network,
      gateway: iface.ipAddress,
      dnsServerIP: iface.primaryDHCP.dnsServer
    });
    const ackFrame = new Frame(iface.macAddress, frame.srcMac, ackPacket, 'DHCP');
    iface.connectedDevice?.receiveFrame(ackFrame, iface.connectedPort?.name);
    }
  }
  //------------------------
  // DNS handling
  //------------------------
  handleDNS(frame, ifaceName) {
    const iface = this.interfaces.get(ifaceName);
    
  }

  // -----------------------
  // ARP handling
  // -----------------------
  handleARP(frame, ifaceName) {
    const packet = frame.payload;
    const iface = this.interfaces.get(ifaceName);
    const arpTable = this.arpTables.get(ifaceName);
    if (!iface || !arpTable) return;

    console.log(`[${this.name}] Handling ARP on ${ifaceName}: ${packet.messageType} for ${packet.destIP}`);

    if (packet.messageType === 'REQUEST') {
      const myInterface = [...this.interfaces.values()].find(i => i.ipAddress === packet.destIP);
      if (myInterface) {
        const replyPacket = new Packet(myInterface.ipAddress, packet.srcIP, 'ARP', 'REPLY');
        const replyFrame = new Frame(myInterface.macAddress, frame.srcMac, replyPacket, 'ARP');
        myInterface.connectedDevice?.receiveFrame(replyFrame, iface.connectedPort?.name);
      }
    } else if (packet.messageType === 'REPLY') {
      arpTable.add(packet.srcIP, frame.srcMac);
      console.log(`[${this.name}] ARP table updated on ${ifaceName}: ${packet.srcIP} -> ${frame.srcMac}`);

      // Send any queued packets waiting for this MAC
      const queue = this.queuedPackets.get(ifaceName) || [];
      const remainingQueue = [];
      queue.forEach(queuedFrame => {
        const nextHopMAC = arpTable.lookup(queuedFrame.payload.destIP);
        if (nextHopMAC) {
          const outIface = this.interfaces.get(ifaceName);
          const outFrame = new Frame(
            outIface.macAddress,
            nextHopMAC,
            queuedFrame.payload,
            queuedFrame.EtherType
          );
          outIface.connectedDevice?.receiveFrame(outFrame, outIface.connectedPort?.name);
        } else {
          remainingQueue.push(queuedFrame); // still unknown
        }
      });
      this.queuedPackets.set(ifaceName, remainingQueue);
    }
  }

  // -----------------------
  // Forward IP packets
  // -----------------------
  forwardIP(frame) {
    const packet = frame.payload;
    console.log('destIP raw:', packet.destIP);

    const route = this.routingTable.find(r => {
      console.log('Checking route:', 'subnet =', r.subnet, 'mask =', r.mask);
      return this.ipInSubnet(packet.destIP, this.interfaces.get(r.interfaceName).network.intToIp(r.subnet), r.mask);
    });

    if (!route) {
      console.warn(`[${this.name}] No route for ${packet.destIP}`);
      return;
    }

    const outIface = this.interfaces.get(route.interfaceName);
    if (!outIface) {
      console.warn(`[${this.name}] No interface ${route.interfaceName} for routing`);
      return;
    }

    const arpTable = this.arpTables.get(route.interfaceName);
    const destMAC = arpTable.lookup(packet.destIP);

    if (!destMAC) {
      console.log(`[${this.name}] Unknown MAC for ${packet.destIP}, sending ARP request and queuing packet`);
      this.sendARPRequest(packet.destIP, outIface.name);
      this.queuedPackets.get(outIface.name).push(frame); // queue packet
      return;
    }

    const outFrame = new Frame(outIface.macAddress, destMAC, packet, frame.EtherType);
    outIface.connectedDevice?.receiveFrame(outFrame, outIface.connectedPort?.name);
  }

  sendARPRequest(destIP, ifaceName) {
    const iface = this.interfaces.get(ifaceName);
    const packet = new Packet(iface.ipAddress, destIP, 'ARP', 'REQUEST');
    const frame = new Frame(iface.macAddress, 'ff:ff:ff:ff:ff:ff', packet, 'ARP');
    iface.connectedDevice?.receiveFrame(frame, iface.connectedPort?.name);
  }

  ipInSubnet(ip, subnet, mask) {
    const ipNum = this.ipToNumber(ip);
    const subnetNum = this.ipToNumber(subnet);
    const maskNum = this.ipToNumber(mask);
    return (ipNum & maskNum) === (subnetNum & maskNum);
  }

  ipToNumber(ip) {
    if (!ip) return 0;
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
}

export default Router;
