class Packet {
    constructor(srcIP, destIP, data) {
        this.srcIP = srcIP;
        this.destIP = destIP;
        this.data = data;
    }
}

module.exports = Packet;
