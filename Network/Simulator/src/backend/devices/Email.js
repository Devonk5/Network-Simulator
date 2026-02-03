import Device from './device';
import Frame from '../data/frame';
import Packet from '../data/packet';
import Domain from '../data/domain';
import Port from '../ports/port';


class EmailServer extends Device {
  constructor(name, macAddress, domains, side, ipAddress = null) {
    super(name, macAddress);
    this.domains = new Map();          // domain Name -> Domain object
    for (const domainName of domains) {
        this.addDomain(domainName);
    }
    this.ipAddress = ipAddress;
    this.ports = new Map();
    this.ports.set(`${side}-0`, new Port(`${side}-0`, this, macAddress));
  }

  createMailbox(user, domainName) {
    const domain = this.domains.get(domainName);
    if (domain) {
      domain.addMailbox(user);
    }
  }
  addDomain(domainName) {
    console.log(this.domains);
    console.log(domainName)
    if (!this.domains.has(domainName)) {
      console.log('Adding domain:', domainName);
      this.domains.set(domainName, new Domain(domainName));
    }
  }

  deleteDomain(domainName){
    if (this.domains.has(domainName)) {
      console.log('Deleting domain:', domainName);
      this.domains.delete(domainName);
    }
    else{
      console.log('doesnt exist')
    }
  }

  receiveFrame(frame) {
    const packet = frame.payload;
    if (packet.protocol === 'EMAIL') {
      this.handleEmail(packet);
    }
  }


  handleEmail(frame) {
    const packet = frame.payload;
    const { from, to, subject, body } = packet.data;
    
    switch (packet.messageType) {
      case 'REQUEST': 
        const domain = to.split('@')[1];
        const user = to.split('@')[0];
        const inbox = this.getInbox(user, domain);
        const inboxPacket = new Packet(this.ipAddress, packet.srcIP, 'Email', 'RETURN', inbox)
        const inboxFrame = new Frame(this.macAddress, frame.srcMac, inboxPacket)
        console.log(this.getPort());
        break;
      case 'SEND': 
        
        this.sendEmail(from, to, subject, body);

        break;
      case 'DHCP':

    }

  }

  sendEmail(fromEmail, toEmail, subject, body) {
    const message = [fromEmail, toEmail, subject, body]
    const user = toEmail.split('@')[0];
    const domain = toEmail.split('@')[1];
    this.domains.get(domain).addMessageToMailbox(user, message);
    
  }

  getInbox(user, domain) {
    return this.domains.get(domain).mailboxes.get(user) || [];
  }
  getPort() {
    return [...this.ports.values()][0];
  }

}

export default EmailServer;
