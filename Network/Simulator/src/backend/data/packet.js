class Packet {
    constructor(srcIP, destIP, protocol, messageType = null, data = null) {
        this.srcIP = srcIP;
        this.destIP = destIP;
        this.protocol = protocol;       // e.g., 'DHCP', 'ARP', 'IP'
        this.messageType = messageType; // e.g., 'DISCOVER', 'OFFER', 'REQUEST'
        this.data = data;               // optional payload
    }
}

export default Packet;

