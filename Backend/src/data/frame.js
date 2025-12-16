class Frame {
    constructor(srcMac, destMac, payload, vlan = null) {
        this.srcMac = srcMac;
        this.destMac = destMac;
        this.payload = payload; // Packet object
        this.vlan = vlan;
    }
}

module.exports = Frame;
