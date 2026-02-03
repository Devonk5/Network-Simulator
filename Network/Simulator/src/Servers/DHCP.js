class DHCPServer {
    constructor(network, gatewayIp, DNS) {
        this.network = network; 
        this.gatewayIp = gatewayIp;
        this.dnsServer = DNS;
        console.log('DNS', this.dnsServer)
        this.network.setDHCPServer(this);
        this.leases = new Map();
    }
    allocateIp(macAddress, leaseTime = 3600) {
        this.cleanupExpiredLeases();

        if (this.leases.has(macAddress)) {
            const lease = this.leases.get(macAddress);
            lease.assignedAt = Date.now(); // renew the lease
            lease.leaseTime = leaseTime;
            return lease.ip;
        }

        const ip = this.network.allocateIPAddress();
        this.leases.set(macAddress, { ip, assignedAt: Date.now(), leaseTime });
        return ip;
    }
    cleanupExpiredLeases() {
        const now = Date.now();
            for (const [mac, lease] of this.leases.entries()) {
                if (now - lease.assignedAt > lease.leaseTime * 1000) {
                    this.leases.delete(mac);
                    this.availableIps.push(lease.ip);
                }
            }
    }

    setDNSServer(dnsServer) {
        this.dnsServer = dnsServer;
    }

    releaseIp(macAddress) {
        if (this.leases.has(macAddress)) {
            const { ip } = this.leases.get(macAddress);
            this.leases.delete(macAddress);
            this.availableIps.push(ip);
            return true;
        }
        return false;
    }
    getLeaseInfo(macAddress) {
        return this.leases.get(macAddress);
    }
}

export default DHCPServer;