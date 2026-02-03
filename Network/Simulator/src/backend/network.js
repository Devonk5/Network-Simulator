import Host from './devices/host';
import Router from './devices/router';

class Network {
  constructor(networkAddress, subnetMask) {
    this.networkAddress = networkAddress;
    this.subnetMask = subnetMask;
    this.nextFreeIP = null;
    this.switches = new Map();
    this.hosts = new Map();
    this.routers = new Map();
    this.vlans = new Map();
    this.subNets = new Map();
    this.primaryDHCP = null;
    this.usedIPs = new Set();
    this.devices = new Map();
    this.nextFreeIP = 0;
    this._initIpRange();
  }

  ipToInt(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
  }
  setDHCPServer(dhcpServer) {
    this.primaryDHCP = dhcpServer;
  }
  intToIp(int) {
    return [
      (int >>> 24) & 255,
      (int >>> 16) & 255,
      (int >>> 8) & 255,
      int & 255,
    ].join('.');
  }

  _initIpRange() {
  const netInt = this.ipToInt(this.networkAddress);
  
  const maskInt = this.ipToInt(this.subnetMask);

  this.networkInt = netInt & maskInt;
  this.broadcastInt = this.networkInt | (~maskInt >>> 0);
  this.networkAddress = this.networkInt;
  this.firstUsable = this.networkInt + 1;
  console.log('First usable IP int:', this.intToIp(this.firstUsable));
  this.lastUsable = this.broadcastInt - 1;
  this.nextFreeIP = this.firstUsable + 50; //start allocating from .50 so lower IPs can be reserved for servers

}


  allocateIPAddress() {
    if (this.nextFreeIP > this.lastUsable) {
      throw new Error("No available IP addresses");
    }

    let ip = this.intToIp(this.nextFreeIP++);
    while (this.usedIPs.has(ip) && this.nextFreeIP <= this.lastUsable) {
      ip = this.intToIp(this.nextFreeIP++);
    }
    console.log('Allocated IP:', ip);
    console.log('Used IPs:', this.usedIPs);
    this.usedIPs.add(ip);

    return ip;
}




  releaseIPAddress(ip) {
    if(!this.usedIPs.has(ip) || ip !== null) {
      console.log('Releasing IP address:', ip);
      this.nextFreeIP = this.ipToInt(ip) < this.nextFreeIP ? this.ipToInt(ip) : this.nextFreeIP;
      this.usedIPs.delete(ip);
    }
    else {
      console.warn('Attempted to release an IP address that is not in use:', ip);
      return;
    }
    
    console.log('nextFreeIP after release:', this.intToIp(this.nextFreeIP));
  }
  addHost(host) { 
    this.hosts.set(host.name, host); 
    console.log('Adding host to network:', host);
    host.network = this;
  }
  addRouter(router) { 
    this.routers.set(router.name, router);
  }

  printTopology() {
    console.log("Switches:", [...this.switches.keys()]);
    console.log("Hosts:", [...this.hosts.keys()]);
    console.log("Routers:", [...this.routers.keys()]);
  }
}

export default Network;
