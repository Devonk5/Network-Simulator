import Device from './device';
import Port from '../ports/port';
import Packet from '../data/packet';
import Frame from '../data/frame';

class DNSServer extends Device {
  constructor(name, macAddress, side, records, ip = null) {
    super(name, macAddress, ip);
    this.network = null;
    this.ip = ip;
    this.ARPTable = new Map();
    this.records = records || new Map(); // domain -> IP
    console.log('DNS Server records:', this.records);
    this.ports = new Map();
    this.ports.set(side + '-0', new Port(side + '-0', this, macAddress));
    this.dhcpServers = []
    
  }
  setDHCPServer(dhcpServer) {
    this.dhcpServers.push(dhcpServer);
  }
  getPort() {
    return [...this.ports.values()][0];
  }

  addRecord(domain, ip) {
    this.records.set(domain, ip);
  }

  deleteRecord(domain){
    this.records.delete(domain)
  }
  receiveFrame(frame, promPortName){
    const packet = frame.payload
    switch(packet.protocol) {
      case 'DNS':
        this.handleDNS(frame);
      case 'ARP':
      
    }

  }

  handleDNS(frame) {
    if (
      frame.destMac !== this.macAddress &&
      frame.destMac !== 'ff:ff:ff:ff:ff:ff'
    ) return;

    const packet = frame.payload;
    if (packet.protocol !== 'DNS') return;

    if (packet.messageType === 'REQUEST') {
      const domain = packet.data.domain; // ✅ FIXED
      const resolvedIP = this.records.get(domain) || null;

      console.log(`[DNS] ${domain} → ${resolvedIP}`);

      const reply = new Packet(
        this.ip,
        packet.srcIP,
        'DNS',
        'RESPONSE',
        { domain, resolvedIP }
      );

      const outFrame = new Frame(
        this.macAddress,
        frame.srcMac,
        reply,
        'DNS'
      );

      this.getPort().connectedDevice?.receiveFrame(
        outFrame,
        this.getPort().connectedPort?.name
      );
    }
  }
  handleARP(frame) {
    if (
      frame.destMac !== this.macAddress &&
      frame.destMac !== 'ff:ff:ff:ff:ff:ff'
    ) return;
    const packet = frame.payload
    if (packet.srcIP) {
    this.ARPTable?.add(packet.srcIP, frame.srcMac);
  }

    // If ARP request is for this DNS server
  if (
    packet.messageType === 'REQUEST' &&
    packet.destIP === this.ipAddress
  ) {

    console.log(`[DNS] ARP reply → ${packet.srcIP}`);

    const reply = new Packet(
      this.ipAddress,
      packet.srcIP,
      'ARP',
      'REPLY',
      { senderMAC: this.macAddress }
    );

    const outFrame = new Frame(
      this.macAddress,
      frame.srcMac,
      reply,
      'ARP'
    );

    this.getPort().connectedDevice?.receiveFrame(
      outFrame,
      this.getPort().connectedPort?.name
    );
  }
  }

}

export default DNSServer;
