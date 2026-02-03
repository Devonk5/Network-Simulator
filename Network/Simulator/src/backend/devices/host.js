// Host.jswhich is network realistic
import Device from './device';
import Port from '../ports/port';
import Packet from '../data/packet';
import Frame from '../data/frame';
import ARPTable from '../../Servers/ARP';
import { wait } from '@testing-library/user-event/dist/utils';

class Host extends Device {
  constructor(name, side, macAddress, ipAddress = null) {
    super(name, macAddress, ipAddress);

    this.ARPTable = new ARPTable();
    this.ports = new Map();
    this.ports.set(`${side}-0`, new Port(`${side}-0`, this, macAddress));
    this.network = null;
    this.emailInbox = [];
    this.pingLog = [];
    this.gateway = null;
    this.subnetMask = null;
    this.pendingDHCP = false;
    // destIP -> { retries, packet, timer }
    this.pendingARP = new Map();
    this.icmpSeq = 0;
    this.pendingPing = new Map(); 
    // seq -> { destIP, sentAt }
    this.dnsCache = new Map();
    this.pendingDNS = new Map(); // domain -> callback
    this.dnsIP = null


  }

  /* ===================== Utilities ===================== */

  getPort() {
    return [...this.ports.values()][0] || null;
  }

  ipToNumber(ip) {
    return ip.split('.').reduce((a, o) => (a << 8) + parseInt(o, 10), 0) >>> 0;
  }

  isInSubnet(destIP) {
    if (!this.ipAddress || !this.subnetMask) return false;
    return (
      (this.ipToNumber(destIP) & this.ipToNumber(this.subnetMask)) ===
      (this.ipToNumber(this.ipAddress) & this.ipToNumber(this.subnetMask))
    );
  }

  getNextHop(destIP) {
    return this.isInSubnet(destIP) ? destIP : this.gateway;
  }

  sendEmail(srcEmail, destEmail, subject, body) {

    if (!this.ipAddress) {
      console.log(`[${this.name}] Cannot send email: no IP address`);
      return;
    }

    if (!this.dnsIP) {
      console.log(`[${this.name}] Cannot send email: no DNS server configured`);
      return;
    }

    // Extract domain from destination email
    const domain = destEmail.split('@')[1];

    if (!domain) {
      console.log(`[${this.name}] Invalid destination email`);
      return;
    }

    console.log(`[${this.name}] Resolving mail server for ${domain}`);

    // Ask DNS to resolve domain
    this.resolveDomain(domain, (serverIP) => {

      if (!serverIP) {
        console.log(`[${this.name}] DNS failed for ${domain}`);
        return;
      }

      console.log(`[${this.name}] Sending email via ${serverIP}`);

      // Send actual email packet
      this.sendPacket(
        serverIP,
        'EMAIL',
        'SEND',
        {
          from: srcEmail,
          to: destEmail,
          subject,
          body
        }
      );

    });
  }

  /**
   * Requests the host's inbox from the email server
   */
  fetchInbox( email) {
    if (!this.ipAddress) {
      console.log(`[${this.name}] Cannot fetch inbox: no IP address`);
      return;
    }

    if (!this.dnsIP) {
      console.log(`[${this.name}] Cannot fetch inbox: no DNS server configured`);
      return;
    }

    // Extract the domain from host's email (you may store host's email somewhere)
    const hostEmail = email; // e.g., "alice@example.com"
    if (!hostEmail) {
      console.log(`[${this.name}] Cannot fetch inbox: email address not set`);
      return;
    }

    const domain = hostEmail.split('@')[1];

    // First, resolve the EmailServer IP via DNS
    this.resolveDomain(domain, (serverIP) => {
      if (!serverIP) {
        console.log(`[${this.name}] Could not resolve EmailServer for domain ${domain}`);
        return;
      }

      console.log(`[${this.name}] Sending INBOX REQUEST to EmailServer ${serverIP}`);

      // Send an EMAIL REQUEST packet to the server
      const packet = {
        from: hostEmail,
        to: hostEmail, // request inbox for self
        messageType: 'REQUEST', // REQUEST type will return mailbox
        data: {} // optional, can include filters in the future
      };

      this.sendPacket(serverIP, 'EMAIL', 'REQUEST', packet);
    });
  }

  /**
   * Handle EMAIL frames arriving at host
   */
  handleEmail(packet) {
    const { from, to, subject, body } = packet.data;

    if (packet.messageType === 'RETURN') {
      // This is the inbox from the server
      console.log(`[${this.name}] Inbox received from server:`, body);
      this.emailInbox = body; // overwrite or merge as needed
    } else if (packet.messageType === 'SEND') {
      // Received an email sent to this host
      this.emailInbox.push(packet.data);
      console.log(`[${this.name}] New email received:`, packet.data);
    }
  }

  /* ===================== ICMP ===================== */

  // Inside Host class

  ping(destIP, count = 4) {
  console.log(`[${this.name}] Pinging ${destIP}...`);
  this.pingLog.push(`Pinging ${destIP} with 32 bytes of data:`);
  let sent = 0;
  let received = 0;
  const startTime = Date.now();
  const sequences = [];
  const sendOne = () => {
    if (sent >= count) return;

    const seq = this.icmpSeq++;
    sequences.push(seq);
    const sentAt = Date.now();

    this.pendingPing.set(seq, {
      destIP,
      sentAt,
      rtt: null
    });

    sent++;

    const packet = new Packet(
      this.ipAddress,
      destIP,
      'ICMP',
      'ECHO_REQUEST',
      { seq }
    );
    if(destIP === this.ipAddress){
      this.receiveFrame(new Frame(this.macAddress, this.macAddress, packet, 'IP'));
    } else {
      this.sendPacket(destIP, 'ICMP', 'ECHO_REQUEST', { seq });
    }

    setTimeout(sendOne, 1000);
  };

  sendOne();

  // Print stats after last timeout
  setTimeout(() => {
    received = count - this.pendingPing.size;
    let minTime = Infinity;
    let maxTime = 0;
    let avgTime = 0;
    for (const number of sequences) {
      const entry = this.pendingPing.get(number);
      if (entry.rtt > maxTime) {
        maxTime = entry.rtt;
      }
      if (entry.rtt < minTime) {
        minTime = entry.rtt;
      }
      avgTime += entry.rtt; 
      this.pendingPing.delete(number);
    }
    avgTime = Math.round(avgTime/count);
      
    this._printPingStats(destIP, sent, received, maxTime, minTime, avgTime);
  }, count * 1100);
}


  // Prints ping statistics
  _printPingStats(destIP, sent, received, maxTime, minTime, avgTime) {
    const lost = sent - received;
    console.log(`\nPing statistics for ${destIP}:`);
    this.pingLog.push(`\nPing statistics for ${destIP}:`);
    console.log(`    Packets: Sent = ${sent}, Received = ${received}, Lost = ${lost} (${Math.round(lost / sent * 100)}% loss)`);
    this.pingLog.push(`Packets: Sent = ${sent}, Received = ${received}, Lost = ${lost} (${Math.round(lost / sent * 100)}% loss)`);
    console.log(`Approximate round trip times in milli-seconds:\n      Minimum = ${minTime}ms, Maximum = ${maxTime}ms, Average = ${avgTime}ms`);
    this.pingLog.push(`Approximate round trip times in milli-seconds:\n      Minimum = ${minTime}ms, Maximum = ${maxTime}ms, Average = ${avgTime}ms`);
  }


  handleICMP(packet) {
    if (packet.protocol !== 'ICMP') return;

    // Defensive guard
    if (!packet.data || typeof packet.data.seq !== 'number') {
      console.warn(
        `[${this.name}] ICMP packet missing seq, ignoring`,
        packet
      );
      return;
    }

    const seq = packet.data.seq;

    // Echo request → reply
    if (packet.messageType === 'ECHO_REQUEST') {
      const reply = new Packet(
        this.ipAddress,
        packet.srcIP,
        'ICMP',
        'ECHO_REPLY',
        { seq }
      );



      this.sendPacket(packet.srcIP, 'ICMP', 'ECHO_REPLY', { seq });
      return;
    }

    // Echo reply → RTT calculation
    if (packet.messageType === 'ECHO_REPLY') {
      const entry = this.pendingPing.get(seq);
      if (!entry) return;

      const rtt = Date.now() - entry.sentAt;
      entry.rtt = rtt;
      console.log(
        `Reply from ${packet.srcIP}: bytes=32 time=${rtt}ms TTL=64`
      );

      this.pingLog.push(
        `Reply from ${packet.srcIP}: bytes=32 time=${rtt}ms TTL=64`
      );
    }
  }


  /* ===================== ARP ===================== */

  sendARPRequest(destIP) {
    let entry = this.pendingARP.get(destIP);
    if (!entry) {
      entry = { retries: 0, packet: null, timer: null };
      this.pendingARP.set(destIP, entry);
      this._startARPTimeout(destIP);
    }

    const packet = new Packet(
      this.ipAddress,
      destIP,
      'ARP',
      'REQUEST',
      { senderMAC: this.macAddress }
    );

    const frame = new Frame(
      this.macAddress,
      'ff:ff:ff:ff:ff:ff',
      packet,
      'ARP'
    );

    console.log(`[${this.name}] Broadcasting ARP REQUEST for ${destIP}`);
    this.getPort()?.connectedDevice?.receiveFrame(
      frame,
      this.getPort().connectedPort?.name
    );
  }

  _startARPTimeout(destIP) {
    const entry = this.pendingARP.get(destIP);
    if (!entry) return;

    entry.timer = setTimeout(() => {
      if (this.ARPTable.lookup(destIP)) {
        clearTimeout(entry.timer);
        this.pendingARP.delete(destIP);
        return;
      }

      if (entry.retries >= 3) {
        this.pendingARP.delete(destIP);
        this.handleARPFailure(destIP);
        return;
      }

      entry.retries++;
      console.log(`[${this.name}] Retrying ARP for ${destIP}`);
      this.sendARPRequest(destIP);
    }, 1000);
  }

  handleARPFailure(destIP) {
    console.log(`[${this.name}] ARP failed for ${destIP}`);
    this.pingLog.push(`Destination unreachable: ${destIP}`);
  }

  handleARP(packet, srcMac) {
    // Always learn sender on ARP (REQUEST or REPLY)
    if (packet.srcIP) {
      this.ARPTable.add(packet.srcIP, srcMac);
    }

    // Respond to ARP REQUEST for us
    if (
      packet.messageType === 'REQUEST' &&
      packet.destIP === this.ipAddress
    ) {
      const reply = new Packet(
        this.ipAddress,
        packet.srcIP,
        'ARP',
        'REPLY',
        { senderMAC: this.macAddress }
      );

      const frame = new Frame(
        this.macAddress,
        srcMac,
        reply,
        'ARP'
      );

      this.getPort()?.connectedDevice?.receiveFrame(
        frame,
        this.getPort().connectedPort?.name
      );
      return;
    }

    // Handle ARP REPLY
    if (packet.messageType === 'REPLY' && packet.destIP === this.ipAddress) {
      console.log(`[${this.name}] ARP REPLY received from ${packet.srcIP}`);
      const entry = this.pendingARP.get(packet.srcIP);
      if (!entry || !entry.packet) return;

      clearTimeout(entry.timer);

      const frame = new Frame(
        this.macAddress,
        srcMac,
        entry.packet,
        entry.packet.protocol
      );

      

      this.getPort()?.connectedDevice?.receiveFrame(
        frame,
        this.getPort().connectedPort?.name
      );

      this.pendingARP.delete(packet.srcIP);
    }
  }

  /* ===================== Packet Sending ===================== */

  sendPacket(destIP, protocol, messageType = null, data = null) {
    const port = this.getPort();
    if (!port) return;

    const nextHop = this.getNextHop(destIP);
    if (!nextHop) return;

    const packet = new Packet(this.ipAddress, destIP, protocol, messageType, data);
    if (protocol === 'ICMP') packet.messageType = messageType;

    const mac = this.ARPTable.lookup(nextHop);
    if (!mac) {
      console.log(`[${this.name}] No ARP entry for ${nextHop}, sending ARP`);
      let entry = this.pendingARP.get(nextHop);
      if (!entry) {
        entry = { retries: 0, packet, timer: null };
        this.pendingARP.set(nextHop, entry);
      } else {
        entry.packet = packet;
      }
      this.sendARPRequest(nextHop);
      return;
    }

    const frame = new Frame(
      this.macAddress,
      mac,
      packet,
      protocol === 'ICMP' ? 'IP' : protocol,
    );

    this.getPort()?.connectedDevice?.receiveFrame(
      frame,
      this.getPort().connectedPort?.name
    );
  }

  resolveDomain(domain, callback) {
    if (this.dnsCache.has(domain)) {
      callback(this.dnsCache.get(domain));
      return;
    }

    if (!this.dnsIP) {
      console.log(`[${this.name}] No DNS server configured`);
      callback(null);
      return;
    }

    console.log(`[${this.name}] DNS REQUEST for ${domain} → ${this.dnsIP}`);

    this.pendingDNS.set(domain, callback);

    this.sendPacket(
      this.dnsIP,
      'DNS',
      'REQUEST',
      { domain }
    );
  }


  handleDNS(packet) {
    if (packet.messageType !== 'RESPONSE') return;

    const { domain, resolvedIP } = packet.data;

    console.log(`[${this.name}] DNS RESPONSE ${domain} → ${resolvedIP}`);

    if (resolvedIP) this.dnsCache.set(domain, resolvedIP);

    const cb = this.pendingDNS.get(domain);
    if (cb) { 
      cb(resolvedIP);
      this.pendingDNS.delete(domain);
    }
  }



  /* ===================== DHCP ===================== */

  requestIP() {
    if( this.ipAddress){ return; }
    this.pendingDHCP = true;

    const packet = new Packet(null, '255.255.255.255', 'DHCP', 'DISCOVER');
    const frame = new Frame(this.macAddress, 'ff:ff:ff:ff:ff:ff', packet, 'DHCP');

    console.log(`[${this.name}] Sending DHCP DISCOVER`);
    this.getPort()?.connectedDevice?.receiveFrame(
      frame,
      this.getPort().connectedPort?.name
    );

    //wait(1000).then(() => this.requestIP());
  }

  handleDHCP(packet) {
  switch (packet.messageType) {
    case 'OFFER':
      console.log(`[${this.name}] Received DHCP OFFER: ${packet.data.ip}`);
      
      // Send DHCP REQUEST for the offered IP
      const requestPacket = new Packet(
        null,
        '255.255.255.255',  // broadcast to DHCP server
        'DHCP',
        'REQUEST',
        { 
          requestedIP: packet.data.ip
         }
      );
      const frame = new Frame(this.macAddress, 'ff:ff:ff:ff:ff:ff', requestPacket, 'DHCP');
      this.getPort()?.connectedDevice?.receiveFrame(frame, this.getPort().connectedPort?.name);
      break;

    case 'ACK':
      this.ipAddress = packet.data.ip;
      this.subnetMask = packet.data.network.subnetMask;
      this.network = packet.data.network;
      this.dnsIP = packet.data.dnsServerIP;
      this.network.addHost(this);
      this.gateway = packet.data.gateway;
      this.pendingDHCP = false;
      break;
  }
}


  /* ===================== Frame RX ===================== */

  receiveFrame(frame) {
    if (
      frame.destMac !== this.macAddress &&
      frame.destMac !== 'ff:ff:ff:ff:ff:ff'
    ) return;

    const packet = frame.payload;

    switch (packet.protocol) {
      case 'ARP': 
        console.log(`[${this.name}] Handling ARP from ${packet.srcIP}`);
        this.handleARP(packet, frame.srcMac); 
        break;
      case 'ICMP': 
        console.log(`[${this.name}] Handling ICMP from ${packet.srcIP}`);
        this.handleICMP(packet); 
        break;
      case 'DHCP': this.handleDHCP(packet); break;
      case 'DNS':
        this.handleDNS(packet);
        break;
      case 'EMAIL':
        this.handleEmail(packet);
        break
    }
  }
}

export default Host;
