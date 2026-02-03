class Frame {
    constructor(srcMac, destMac, payload, EtherType, vlan = null) {
        this.srcMac = srcMac;
        this.destMac = destMac;
        this.payload = payload; // Packet object
        this.EtherType = EtherType;
        this.vlan = vlan;
    }
}

export default Frame;
