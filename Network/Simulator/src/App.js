import React, { useState, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DragItem from './App/DragItem';
import DropZone from './App/DropZone';
import SandboxItem from './App/SandboxItem';

// Backend imports
import Switch from './backend/devices/switch';
import Router from './backend/devices/router';
import Host from './backend/devices/host';
import DNSServer from './backend/devices/DNS';
import Interface from './backend/ports/interface';
import { useEffect } from 'react';
import EmailServer from './backend/devices/Email';




// Utility to generate random MAC addresses
const generateMAC = () =>
  'XX:XX:XX:XX:XX:XX'.replace(/X/g, () =>
    '0123456789ABCDEF'[Math.floor(Math.random() * 16)]
  );

const App = () => {
  const [sandboxItems, setSandboxItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectionStart, setConnectionStart] = useState(null);
  const [newItemPending, setNewItemPending] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [newItemPortCounts, setNewItemPortCounts] = useState({
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
  });
  const [dhcpInfo, setDhcpInfo] = useState({
    ip: null,
    subnet: null,
    gateway: null
  });

  const dhcpInterval = useRef(null);

  const [hostPortSide, setHostPortSide] = useState('top'); // For host single port
  const [activeTab, setActiveTab] = useState('info');
  const [pingTarget, setPingTarget] = useState('');
  const [pingLog, setPingLog] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [editState, setEditState] = useState({
    name: null,
    ipAddress: null,
    subnetMask: null,
    gateway: null,
    vlan: null,
    
  });

  const [dnsInfo, setDnsInfo] = useState({
    serverIP: null,
    cache: [],
  });

  const [emailInbox, setEmailInbox] = useState([]);
  const [domainCount, setDomainCount] = useState(1);
  const [RecordCount, setRecordCount] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [routerDHCPEnabled, setRouterDHCPEnabled] = useState({});
  const [currentEmail, setCurrentEmail] = useState ('')




  useEffect(() => {
    if (!selectedDevice) return;

    if (activeTab === 'dns') {
      const id = setInterval(() => {
        if (selectedDevice.dnsCache) {
          setDnsInfo({
            serverIP: selectedDevice.dnsServerIP || null,
            cache: [...selectedDevice.dnsCache.entries()],
          });
        }
      }, 300);

      return () => clearInterval(id);
    }

    if (activeTab === 'email') {
      const id = setInterval(() => {
        if (selectedDevice.emailInbox) {
          setEmailInbox([...selectedDevice.emailInbox]);
        }
      }, 300);

      return () => clearInterval(id);
    }
  }, [activeTab, selectedDevice]);

    useEffect(() => {
  if (activeTab === 'ping' && selectedDevice?.type === 'Host') {
    handleClearPing(); // entering ping tab: clear log
  }

  return () => {
    if (activeTab === 'ping' && selectedDevice?.type === 'Host') {
      handleClearPing(); // leaving ping tab: also clear log
    }
  };
}, [activeTab, selectedDevice]);



  const dropRef = useRef(null);

  const disconnectPort = (port) => {
    if (!port) return;

    port.disconnectDevice();
  };





  /* -------------------- DROP NEW DEVICE -------------------- */
  const handleDrop = (item, clientX, clientY) => {
    const rect = dropRef.current.getBoundingClientRect();
    setNewItemPending({
      name: item.name,
      x: clientX - rect.left,
      y: clientY - rect.top,
    });

    setNewItemPortCounts({ top: 1, right: 1, bottom: 1, left: 1 });
    setHostPortSide('top');
  };


  const isValidIPv4 = (ip) => {
    
    console.log('IP: ', ip);
    if (!ip) return false;

    const parts = ip.trim().split('.');
    console.log('octets?: ', parts.length);
    if (parts.length !== 4) return false;

    for (const part of parts) {
      if (!/^\d+$/.test(part)) return false;        // only digits
      const num = Number(part);
      if (num < 0 || num > 255) return false;       // valid octet range
    }

    return true;
  };

  /* -------------------- CONFIRM DEVICE -------------------- */
  const confirmNewItem = (portsPerSide, routerPortsData, domains = null) => {
    if (!newItemPending) return;
    let backendObj;
    let devicePortsPerSide = { top: 0, right: 0, bottom: 0, left: 0 };
    const macs = [];


    switch (newItemPending.name) {
      case 'Host':
        devicePortsPerSide[hostPortSide] = 1; // Only 1 port on the selected side
        backendObj = new Host(newItemName || newItemPending.name, hostPortSide, generateMAC());
        
        break;

      case 'Switch':
        devicePortsPerSide = portsPerSide;
        for (let i = 0; i < Object.values(portsPerSide).reduce((a,b)=>a+b,0); i++) {
          macs.push(generateMAC());
        }
        backendObj = new Switch(newItemName || newItemPending.name, generateMAC(), devicePortsPerSide, macs);
        break;

      case 'Router':
        devicePortsPerSide = portsPerSide;
        for (let i = 0; i < Object.values(portsPerSide).reduce((a,b)=>a+b,0); i++) {
          macs.push(generateMAC());
        }
        backendObj = new Router(newItemName || newItemPending.name, generateMAC(), devicePortsPerSide, routerPortsData, macs);
        break;
      case 'DNS Server':
        devicePortsPerSide[hostPortSide] = 1; // Only 1 port on the selected side

        backendObj = new DNSServer(newItemName || newItemPending.name, generateMAC(), hostPortSide, domains);
        break;

      case 'Mail Server':
        devicePortsPerSide[hostPortSide] = 1; // Only 1 port on the selected side
        backendObj = new EmailServer(newItemName || newItemPending.name, generateMAC(), domains);
        break;

      default:
        console.warn('Unknown device type:', newItemPending.name);
    
    }
    setNewItemName('');
    console.log('reset name');
    console.log('confirming new item:', newItemPending.name);
    setSandboxItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: backendObj.name,
        type: newItemPending.name,
        x: newItemPending.x,
        y: newItemPending.y,
        width: 100,
        height: 50,
        portsPerSide: devicePortsPerSide,
        backendObj,
      },
    ]);

    setNewItemPending(null);
  };

  /* -------------------- MOVE DEVICE -------------------- */
  const handleMove = (id, x, y) => {
    setSandboxItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x, y } : item))
    );

    if (selectedDevice?.id === id) {
      setSelectedDevice((prev) => ({ ...prev, x, y }));
    }
  };

  const pingIntervals = useRef(new Map());

  const handlePing = () => {
    if (!selectedDevice || selectedDevice.type !== 'Host') return;

    // Start ping in backend
    selectedDevice.backendObj.ping(pingTarget);

    // Clear any existing interval for this host
    const hostId = selectedDevice.id;
    if (pingIntervals.current.has(hostId)) {
      clearInterval(pingIntervals.current.get(hostId));
    }

    const interval = setInterval(() => {
      // Always copy backend log to a new array
      setPingLog([...selectedDevice.backendObj.pingLog]);

      if (selectedDevice.backendObj.pingFinished) {
        clearInterval(interval);
        pingIntervals.current.delete(hostId);
      }
    }, 100);

    pingIntervals.current.set(hostId, interval);
  };

  const handleClearPing = () => {
    if (!selectedDevice || selectedDevice.type !== 'Host') return;

    // Stop polling
    const hostId = selectedDevice.id;
    if (pingIntervals.current.has(hostId)) {
      clearInterval(pingIntervals.current.get(hostId));
      pingIntervals.current.delete(hostId);
    }

    // Reset backend log safely
    selectedDevice.backendObj.pingLog = [];
    selectedDevice.backendObj.pingFinished = false;

    // Reset UI
    setPingLog([]);
  };



  /* -------------------- DELETE DEVICE -------------------- */
  const handleDeleteItem = (id) => {
    const itemToDelete = sandboxItems.find(i => i.id === id);
    if (!itemToDelete) return;

    const device = itemToDelete.backendObj;

    // Disconnect backend ports safely
    if (device instanceof Host) {
      disconnectPort(device.getPort());
    }

    if (device instanceof Switch) {
      device.ports.forEach(port => disconnectPort(port));
    }

    if (device instanceof Router) {
      device.interfaces.forEach(Interface => disconnectPort(Interface));
    }

    // Now update React state
    setSandboxItems(prev => prev.filter(i => i.id !== id));
    setConnections(prev =>
      prev.filter(c => c.from.itemId !== id && c.to.itemId !== id)
    );

    if (selectedDevice?.id === id) {
      setSelectedDevice(null);
    }
  };


  /* -------------------- CONNECTIONS -------------------- */
  const startConnection = (itemId, portId) =>
    setConnectionStart({ itemId, portId });

  const completeConnection = (itemId, portId) => {
    if (!connectionStart) return;

    // Prevent connecting a port to itself
    if (connectionStart.itemId === itemId) {
      console.warn('Cannot connect a port to itself! - dont be a dipshit');
      setConnectionStart(null);
      return;
    }
    setConnections((prev) => [
      ...prev,
      { from: connectionStart, to: { itemId, portId } },
    ]);

    const toDevice = sandboxItems.find((i) => i.id === itemId);
    const fromDevice = sandboxItems.find((i) => i.id === connectionStart.itemId);

    if (toDevice && fromDevice) {
      const getPort = (obj, pid) => {
        if (obj instanceof Router) return obj.interfaces.get(pid) || null;
        if (obj instanceof Switch) return obj.ports.get(pid) || null;
        if (obj instanceof Host) return obj.getPort();
        return null;
      };

      const toPort = getPort(toDevice.backendObj, portId);
      const fromPort = getPort(fromDevice.backendObj, connectionStart.portId);

      if (toPort && fromPort) {
        // Another safety: prevent connecting the same port to itself at backend
        if (toPort === fromPort) {
          console.warn('Cannot connect a port to itself at backend!');
          setConnectionStart(null);
          return;
        }
        console.log(`Connecting ${fromDevice.backendObj.name}:${fromPort.name} to ${toDevice.backendObj.name}:${toPort.name}`);
        toPort.connectDevice(fromDevice.backendObj, fromPort);
        fromPort.connectDevice(toDevice.backendObj, toPort);
      }
    }

    setConnectionStart(null);
  };


  const deleteConnection = (index) =>
    setConnections((prev) => prev.filter((_, i) => i !== index));

  /* -------------------- PORT POSITIONS -------------------- */
  const getPortPositions = (item) => {
    const positions = [];
    const { x, y, width, height, portsPerSide } = item;

    ['top', 'right', 'bottom', 'left'].forEach((side) => {
      const count = portsPerSide[side] || 0;
      for (let i = 0; i < count; i++) {
        let px, py;
        switch (side) {
          case 'top':
            px = x + ((i + 1) * width) / (count + 1);
            py = y;
            break;
          case 'bottom':
            px = x + ((i + 1) * width) / (count + 1);
            py = y + height;
            break;
          case 'left':
            px = x;
            py = y + ((i + 1) * height) / (count + 1);
            break;
          case 'right':
            px = x + width;
            py = y + ((i + 1) * height) / (count + 1);
            break;
        }
        positions.push({ id: `${side}-${i}`, x: px, y: py });
      }
    });

    return positions;
  };

  /* ==================== RENDER ==================== */
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div style={{ width: 200, borderRight: '1px solid #ccc', padding: 10 }}>
          <h3>Drag Items</h3>
          <DragItem name="Switch" />
          <DragItem name="Router" />
          <DragItem name="Host" />
          <DragItem name="DNS Server" />
          <DragItem name="Mail Server" />
        </div>

        <DropZone ref={dropRef} onDrop={handleDrop} onMove={handleMove}>
          {/* Connections */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%' }}>
            {connections.map((c, i) => {
              const f = sandboxItems.find((x) => x.id === c.from.itemId);
              const t = sandboxItems.find((x) => x.id === c.to.itemId);
              if (!f || !t) return null;

              const fp = getPortPositions(f).find((p) => p.id === c.from.portId);
              const tp = getPortPositions(t).find((p) => p.id === c.to.portId);
              if (!fp || !tp) return null;

              return (
                <line
                  key={i}
                  x1={fp.x} y1={fp.y}
                  x2={tp.x} y2={tp.y}
                  stroke="black"
                />
              );
            })}
          </svg>

          {/* Devices */}
          {sandboxItems.map((item) => (
            <SandboxItem
              key={item.id}
              item={item}
              onMove={handleMove}
              onDelete={handleDeleteItem}
              startConnection={startConnection}
              completeConnection={completeConnection}
              connectionStart={connectionStart}
              connections={connections}
              getPortPositions={getPortPositions}
              onSelect={() => {
                setSelectedDevice(item);
                setActiveTab('info');
              }}
            />
          ))}

          {/* NEW DEVICE POPUP */}
          {newItemPending && (
            <div
              style={{
                position: 'absolute',
                left: newItemPending.x,
                top: newItemPending.y,
                background: '#fff',
                border: '1px solid black',
                padding: 10,
                zIndex: 1000,
                width: 350,
              }}
              
            >
            

              {/* ❌ Cancel Button */}
              <button
                onClick={() => {
                  setNewItemPending(null);
                  setNewItemName('');
                  console.log('canceled');
                }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
                title="Cancel"
              >
                ❌
              </button>



              <h4>Configure {newItemPending.name}</h4>


              {/* Device Name */}
              <label>Device Name:</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`Suggested: ${newItemPending.name}`}
              />
              <div style={{ height: 12 }} />
              {/* Host Port Side */}
              {(newItemPending.name === 'Host' || newItemPending.name === 'Mail Server' || newItemPending.name === 'DNS Server' ) && (
                
                <div>
                  <label>Port Side:</label>
                  <select
                    value={hostPortSide}
                    onChange={(e) => setHostPortSide(e.target.value)}
                  >
                    <option value="top">Top</option>
                    <option value="right">Right</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                  </select>
                </div>
              )}

              {/* Port counts for Switch/Router */}
              {(newItemPending.name === 'Switch' || newItemPending.name === 'Router') && (
                <div>
                  {['top','right','bottom','left'].map((side) => (
                    <div key={side}>
                      <label>{side} ports:</label>
                      <input
                        type="number"
                        min={0}
                        max={16}
                        value={newItemPortCounts[side]}
                        onChange={(e) =>
                          setNewItemPortCounts(prev => ({
                            ...prev,
                            [side]: Math.min(16, Number(e.target.value))
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Router IP/Subnet/DHCP Fields */}
              {newItemPending.name === 'Router' && (
                <div>
                  <h5>Configure Router Ports:</h5>

                  {Array.from({
                    length: Object.values(newItemPortCounts).reduce((a, b) => a + b, 0)
                  }).map((_, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <label>Port {i + 1} IP:</label>
                      <input type="text" id={`routerIP${i}`} placeholder="192.168.0.1" />

                      <label>Subnet:</label>
                      <input type="text" id={`routerSubnet${i}`} placeholder="255.255.255.0" />

                      <label>
                        <input
                          type="checkbox"
                          checked={routerDHCPEnabled[i] || false}
                          onChange={(e) =>
                            setRouterDHCPEnabled(prev => ({
                              ...prev,
                              [i]: e.target.checked
                            }))
                          }
                        />
                        Enable DHCP
                      </label>

                      {routerDHCPEnabled[i] && (
                        <input
                          type="text"
                          id={`DNSIP${i}`}
                          placeholder="DNS IP"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Mail Server Domains */}
              {newItemPending.name === 'Mail Server'&& (
                <div>
                  <h5>Configure Mail Server Domains:</h5>

                  <div>
                      <label>domains:</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={domainCount}
                        onChange={(e) => setDomainCount(Math.min(1000, Number(e.target.value)))
                        }
                      />
                    </div>
                  <label>Accepted Domains:</label>
                  {Array.from({ length: domainCount }).map((_, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <label>Domain {i + 1}: </label>
                      <input type="text" id={`mailDomain${i}`} placeholder="example.com" style={{ marginRight: 5 }} />
                    </div>
                  ))}
                </div>
              )}
              {/* DNS Server Domains */}
              {newItemPending.name === 'DNS Server'&& (
                <div>
                  <h5>Configure DNS Server Domains:</h5>

                  <div>
                      <label>domains:</label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={RecordCount}
                        onChange={(e) => setRecordCount(Math.max(0, Math.min(1000, Number(e.target.value))))
                        }
                        
                      />
                    </div>
                  <label>Accepted Domains:</label>
                  {Array.from({ length: RecordCount }).map((_, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>
                      <label>Domain {i + 1}: </label>
                      <input type="text" id={`mailDomain${i}`} placeholder="example.com" style={{ marginRight: 5 }} />
                      <br />
                      <label>IP {i + 1}: </label>
                      <input type="text" id={`DomainIP${i}`} placeholder="x.x.x.x" style={{ marginRight: 5 }} />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ height: 12 }} />
              <button
                onClick={() => {
                  const portsPerSide = { ...newItemPortCounts };
                  let routerPortsData = [];
                  if(newItemPending.name === 'Mail Server'){
                    const domains = Array.from({ length: domainCount }).map((_, i) => document.getElementById(`mailDomain${i}`).value);
                    console.log('domains:', domains);
                    confirmNewItem(portsPerSide, routerPortsData, domains);
                    return;
                  }

                  if(newItemPending.name === 'DNS Server'){
                    const records = new Map();
                    for (let i = 0; i < RecordCount; i++) {
                      const domain = document.getElementById(`mailDomain${i}`)?.value.trim();
                      const ip = document.getElementById(`DomainIP${i}`)?.value.trim();

                      if (!domain || !ip) {
                        alert('A required field was left empty');
                        return; // ⛔ stops device creation
                      }
                      if(!isValidIPv4(ip)){
                        alert('An IP Address is not correct');
                        return; // ⛔ stops device creation
                      }

                      records.set(domain, ip);
                    }

                    confirmNewItem(portsPerSide, routerPortsData, records);
                  }
                  
                    
                  if (newItemPending.name === 'Switch' || newItemPending.name === 'Host') {
                    console.log('confirming new item:', newItemPending);
                    confirmNewItem(portsPerSide, routerPortsData);
                    return;
                  }

                  if (newItemPending.name === 'Router') {
                    const totalPorts = Object.values(portsPerSide).reduce((a, b) => a + b, 0);

                    routerPortsData = Array.from({ length: totalPorts }).map((_, i) => {
                      const ip = document.getElementById(`routerIP${i}`).value.trim();
                      const subnet = document.getElementById(`routerSubnet${i}`).value.trim();
                      const useDHCP = routerDHCPEnabled[i];
                      const DNS = routerDHCPEnabled[i]? document.getElementById(`DNSIP${i}`)?.value.trim() : null;

                      return { ip, subnet, useDHCP, DNS};
                    });
                    
                    
                  

                    // ✅ VALIDATION
                    const invalidPort = routerPortsData.find(p => {
                      console.log('validating port', p);
                      console.log('ip:', p.ip, 'subnet:', p.subnet);
                      if (p.ip === '' || p.subnet === '') return true;

                      if (!isValidIPv4(p.ip)) return true;
                      if (!isValidIPv4(p.subnet)) return true;

                      return false;
                    });
                    console.log('invalidPort:', invalidPort);
                    if ((invalidPort) && newItemPending.name === 'Router') {
                      alert(
                        'One or more router ports do not have valid IPv4 address or subnet (0–255.x4).'
                      );
                    } 
                    else {
                      console.log('confirming new Router:', newItemPending);
                      confirmNewItem(portsPerSide, routerPortsData);
                    }
                  }
                }}>
            
                Confirm
              </button>
            </div>
          )}

          {selectedDevice && (
            <div
              style={{
                position: 'absolute',
                left: selectedDevice.x + selectedDevice.width + 10,
                top: selectedDevice.y,
                background: '#ffffffff',
                border: '1px solid black',
                padding: 10,
                zIndex: 999,
                width: 300,
                maxHeight: 400,
                overflowY: 'auto',
              }}
            >
              <button
                style={{ float: 'right' }}
                onClick={() => setSelectedDevice(null)}
              >
                ❌
              </button>

              <h4>{selectedDevice.backendObj.name}</h4>

              {/* TABS */}
              <div style={{ display: 'flex', marginBottom: 10 }}>
                <button
                  style={{
                    flex: 1,
                    fontWeight: activeTab === 'info' ? 'bold' : 'normal',
                  }}
                  onClick={() => setActiveTab('info')}
                >
                  Info
                </button>
                
                
                  <button
                    style={{
                      flex: 1,
                      fontWeight: activeTab === 'edit' ? 'bold' : 'normal',
                    }}
                  onClick={() => {
                    const d = selectedDevice.backendObj;

                    setEditState({
                      name: d.name || '',
                      ipAddress: d.ipAddress || '',
                      subnetMask: d.subnetMask || '',
                      gateway: d.gateway || '',
                      vlan: null,
                    });

                    setActiveTab('edit');
                  }}
                
                >
                  Edit
                </button>
                {selectedDevice.type === 'Host' && (
                  <button
                    style={{
                      flex: 1,
                      fontWeight: activeTab === 'ping' ? 'bold' : 'normal',
                    }}
                    onClick={() => setActiveTab('ping')}
                  >
                    Ping
                  </button>

                )}
                 {selectedDevice.type === 'Host' && (
                  <button
                    style={{
                      flex: 1,
                      fontWeight: activeTab === 'inbox' ? 'bold' : 'normal',
                    }}
                    onClick={() => setActiveTab('inbox')}
                  >
                    Inbox
                  </button>

                )}
                {selectedDevice.type === 'Host' && (
                  <button
                    style={{
                      flex: 1,
                      fontWeight: activeTab === 'send' ? 'bold' : 'normal',
                    }}
                    onClick={() => setActiveTab('send')}
                  >
                    Messenger
                  </button>

                )}
                {selectedDevice.type === 'Host' && (
                  <button
                    style={{
                      flex: 1,
                      fontWeight: activeTab === 'dhcp' ? 'bold' : 'normal',
                    }}
                    onClick={() => {
                      setDhcpInfo({
                        ip: selectedDevice.backendObj.ipAddress,
                        subnet: selectedDevice.backendObj.subnetMask,
                        gateway: selectedDevice.backendObj.gateway,
                      });
                      setActiveTab('dhcp');
                    }}

                  >
                    DHCP
                  </button>
                )}
                {selectedDevice.type === 'Router' && (
                <button
                  style={{
                    flex: 1,
                    fontWeight: activeTab === 'routing' ? 'bold' : 'normal',
                  }}
                  onClick={() => {
                    
                    setActiveTab('routing');
                  }}

                >
                  Routing
                </button>
              )}
              {selectedDevice.type === 'Switch' && (
                <button
                  style={{
                    flex: 1,
                    fontWeight: activeTab === 'mactable' ? 'bold' : 'normal',
                  }}
                  onClick={() => {
                    
                    setActiveTab('mactable');
                  }}

                >
                  MAC Table
                </button>
              )}
              {(selectedDevice.type === 'DNS Server' || selectedDevice.type === 'Mail Server') && (
                
              <button 
                  style={{
                    flex: 1,
                    fontWeight: activeTab === 'domains' ? 'bold' : 'normal',
                  }}
                  onClick={() => {

                    setActiveTab('domains');
                  }}
                >
                  Domains
                  </button>             
                  )}
                  {(selectedDevice.type === 'Mail Server') && (
                
              <button 
                  style={{
                    flex: 1,
                    fontWeight: activeTab === 'users' ? 'bold' : 'normal',
                  }}
                  onClick={() => {

                    setActiveTab('users');
                  }}
                >
                  Users
                  </button>             
                  )}
              
              </div>

              {/* Basic Info TAB */}
              {activeTab === 'info' && (selectedDevice.type === 'Switch' || selectedDevice.type === 'DNS Server' || selectedDevice.type === 'Mail Server') && (
                <>
                  <p>Type: {selectedDevice.type}</p>
                  <p>MAC: {selectedDevice.backendObj.macAddress}</p>
                  <p>IP: {selectedDevice.backendObj.ipAddress || 'N/A'}</p>

                  <h5>Ports:</h5>

                  

                  {selectedDevice.backendObj.ports && (
                    <ul>
                      {[...selectedDevice.backendObj.ports.entries()].map(([n, p]) => (
                        <li key={n}>
                          {n} — MAC: {p.macAddress} — Connected: {p.connectedDevice?.name || 'None'}
                          <br />
                          VLAN: {p.vlan || 'N/A'}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {/* Host Info TAB */}
              {activeTab === 'info' && (selectedDevice.type === 'Host') && (
                <>
                  <p>Type: {selectedDevice.type}</p>
                  <p>MAC: {selectedDevice.backendObj.macAddress}</p>
                  <p>IP: {selectedDevice.backendObj.ipAddress || 'N/A'}</p>
                  <p>DNS: {selectedDevice.backendObj.dnsIP || 'NA'}</p>

                  <h5>Ports:</h5>

                  

                  {selectedDevice.backendObj.ports && (
                    <ul>
                      {[...selectedDevice.backendObj.ports.entries()].map(([n, p]) => (
                        <li key={n}>
                          {n} — MAC: {p.macAddress} — Connected: {p.connectedDevice?.name || 'None'}
                          <br />
                          VLAN: {p.vlan || 'N/A'}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {/* Info Router TAB */}
              {activeTab === 'info' && (selectedDevice.type === 'Router') && (
                <>
                  <p>Type: {selectedDevice.type}</p>

                  <h5>Ports:</h5>

                  

                  {selectedDevice.backendObj.interfaces && (
                    <ul>
                      {[...selectedDevice.backendObj.interfaces.entries()].map(([n, p]) => (
                        <li key={n}>
                          {n} —
                          <br />
                           {'\u00A0\u00A0\u00A0\u00A0'}IP: {p.ipAddress}
                          <br />
                           {'\u00A0\u00A0\u00A0\u00A0'}Subnet Mask: {p.network.subnetMask || 'N/A'}
                          <br />
                           {'\u00A0\u00A0\u00A0\u00A0'}VLAN: {p.vlan || 'N/A'}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {/* Edit Host TAB */}
              {activeTab === 'edit' && selectedDevice.type === 'Host' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label>Name</label>
                  <input
                    value={editState.name || ''}
                    onChange={e =>
                      setEditState(s => ({ ...s, name: e.target.value }))
                    }
                  />

                  <label>IP Address</label>
                  <input
                    
                    value={editState.ipAddress || ''}
                    onChange={e =>
                      setEditState(s => ({ ...s, ipAddress: e.target.value }))
                    }
                  />

                  <label>Subnet Mask</label>
                  <input
                    value={editState.subnetMask || ''}
                    onChange={e =>
                      setEditState(s => ({ ...s, subnetMask: e.target.value }))
                    }
                  />

                  <label>Gateway</label>
                  <input
                    value={editState.gateway || ''}
                    onChange={e =>
                      setEditState(s => ({ ...s, gateway: e.target.value }))
                    }
                  />

                  <label>VLAN</label>
                  <input
                    value={editState.vlan || ''}
                    onChange={e =>
                      setEditState(s => ({ ...s, vlan: e.target.value }))
                    }
                  />

                  <button
                    style={{ marginTop: 10, width: '100%' }}
                    onClick={() => {
                      const host = selectedDevice.backendObj;

                      // 1️⃣ Backend update
                      if (editState.name) host.name = editState.name;
                      if (editState.ipAddress) host.ipAddress = editState.ipAddress;
                      if (editState.subnetMask) host.subnetMask = editState.subnetMask;
                      if (editState.gateway) host.gateway = editState.gateway;
                      if (editState.vlan) {
                        for (const port of host.ports.values()) {
                          port.vlan = editState.vlan;
                        }
                      }
                        
                      setEditState(s => ({ ...s, name: null, ipAddress: null, subnetMask: null, gateway: null }));
                      // 2️⃣ Update canvas item
                      setSandboxItems(prev =>
                        prev.map(item =>
                          item.id === selectedDevice.id
                            ? { ...item, name: editState.name || item.name }
                            : item
                        )
                      );

                      // 3️⃣ Update selected device panel
                      setSelectedDevice(prev => ({
                        ...prev,
                        name: editState.name || prev.name,

                      }));

                      setActiveTab('info');
                    }}

                  >
                    Apply Changes
                  </button>
                </div>
              )}

              {/*Edit Switch/Router TAB */}
              {activeTab === 'edit' && (selectedDevice.type === 'Switch' || selectedDevice.type === 'Router') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label>Name</label>
                  <input
                    value={editState.name || ''}
                    onChange={e =>
                      setEditState(s => ({ ...s, name: e.target.value }))
                    }
                  />
                  {/* PORT VLAN EDITOR */}
                  {(() => {
                    const device = selectedDevice.backendObj;

                    const ports =
                      selectedDevice.type === 'Switch'
                        ? device.ports
                        : device.interfaces;

                    return ports && (
                      <>
                        <h4 style={{ marginTop: 12 }}>Ports / VLANs</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[...ports.entries()].map(([portName, port]) => (
                            <div
                              key={portName}
                              style={{
                                border: '1px solid #ccc',
                                padding: 8,
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              <div style={{ fontWeight: 'bold' }}>{portName}</div>

                              <div style={{ opacity: 0.8 }}>
                                MAC: {port.macAddress || 'N/A'}
                              </div>

                              <label style={{ marginTop: 4 }}>VLAN</label>
                              <input
                                type="number"
                                min={1}
                                max={4094}
                                value={port.vlan ?? ''}
                                onChange={e => {
                                  const vlan = e.target.value
                                    ? Number(e.target.value)
                                    : null;

                                  // 🔁 Backend update
                                  port.vlan = vlan;

                                  // 🔄 Force UI refresh
                                  setSelectedDevice(d => ({ ...d }));
                                }}
                                style={{ width: '100%' }}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                  <button
                    style={{ marginTop: 10, width: '100%' }}
                    onClick={() => {
                      const host = selectedDevice.backendObj;

                      // 1️⃣ Backend update
                      if (editState.name) host.name = editState.name;
                      setEditState(s => ({ ...s, name: null }));
                      // 2️⃣ Update canvas item
                      setSandboxItems(prev =>
                        prev.map(item =>
                          item.id === selectedDevice.id
                            ? { ...item, name: editState.name || item.name }
                            : item
                        )
                      );

                      // 3️⃣ Update selected device panel
                      setSelectedDevice(prev => ({
                        ...prev,
                        name: editState.name || prev.name,
                      }));

                      setActiveTab('info');
                    }}

                  >
                    Apply Changes
                  </button>
                </div>
              )}

                  {/*{/*Edit Mail Server*/}
                  {activeTab === 'edit' && (selectedDevice.type === 'Mail Server') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label>Name</label>
                      <input
                        value={editState.name || ''}
                        onChange={e =>
                          setEditState(s => ({ ...s, name: e.target.value }))
                        }
                      />
                      <label>IP Address</label>
                      <input
                        
                        value={editState.ipAddress || ''}
                        onChange={e =>
                          setEditState(s => ({ ...s, ipAddress: e.target.value }))
                        }
                      />
                      {/* Delete Ports */}
                      {(() => {
                        const device = selectedDevice.backendObj;

                        const domains = device.domains;

                        return domains && (
                          <>
                            <h4 style={{ marginTop: 12 }}> Delete Domains</h4>

                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {device.domains.size === 0 ? (
                                <div
                                  style={{
                                    border: '1px solid #ccc',
                                    padding: 6,
                                    borderRadius: 4,
                                    fontSize: 12,
                                    opacity: 0.8,
                                  }}
                                >
                                  N/A
                                </div>
                              ) : (
                                Array.from(device.domains.entries()).map(([domain, ip], idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      border: '1px solid #ccc',
                                      padding: 1,
                                      borderRadius: 4,
                                      fontSize: 12,
                                    }}
                                  >
                                    <div style={{ opacity: 0.9 }}>
                                      Domain {domain}:
                                      <input
                                        type="checkbox"
                                        id={`deleteDomain${idx}`}
                                        style={{ marginLeft: 8 }}
                                      />
                                    </div>
                                  </div>
                                ))
                              )}


                            </div>
                          </>
                        );
                      })()}
                      {/*Add Domains*/}
                      <div>
                        <h4 style={{ marginTop: 12 }}> Add Domains</h4>

                        <div>
                            <label>domains:</label>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              value={domainCount}
                              onChange={(e) => setDomainCount(Math.min(1000, Number(e.target.value)))
                              }
                            />
                          </div>
                        <label>Accepted Domains:</label>
                        {Array.from({ length: domainCount }).map((_, i) => (
                          <div key={i} style={{ marginBottom: 5 }}>
                            <label>Domain {i + 1}: </label>
                            <input type="text" id={`mailDomain${i}`} placeholder="example.com" style={{ marginRight: 5 }} />
                          </div>
                        ))}
                      </div>
                       


                  <button
                    style={{ marginTop: 10, width: '100%' }}
                    onClick={() => {
                      const email = selectedDevice.backendObj;

                      // 1️⃣ Backend update
                      if (editState.name) email.name = editState.name;
                      if(editState.ipAddress) email.ipAddress = editState.ipAddress;
                      Array.from(selectedDevice.backendObj.domains.entries()).map(([domainName, domain], i) => {
                        const deleted = document.getElementById(`deleteDomain${i}`).checked;
                        console.log(selectedDevice.type)
                        if(deleted){
                          selectedDevice.backendObj.deleteDomain(domainName);
                        }
                      });
                      Array.from({length: domainCount}).map((_, i) => {
                        const domainName = document.getElementById(`mailDomain${i}`).value;
                        console.log(domainName)
                        if (domainName !== '') {
                          selectedDevice.backendObj.addDomain(domainName);
                        }

                      });

                      setEditState(s => ({ ...s, name: null }));
                      // 2️⃣ Update canvas item
                      setSandboxItems(prev =>
                        prev.map(item =>
                          item.id === selectedDevice.id
                            ? { ...item, name: editState.name || item.name }
                            : item
                        )
                      );

                      // 3️⃣ Update selected device panel
                      setSelectedDevice(prev => ({
                        ...prev,
                        name: editState.name || prev.name,
                      }));

                      setActiveTab('info');
                    }}

                  >
                    Apply Changes
                  </button>
                </div>
              )}
              {/*{/*Edit DNS Server*/}
                  {activeTab === 'edit' && (selectedDevice.type === 'DNS Server') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label>Name</label>
                      <input
                        value={editState.name || ''}
                        onChange={e =>
                          setEditState(s => ({ ...s, name: e.target.value }))
                        }
                      />
                      <label>IP Address</label>
                      <input
                        
                        value={editState.ipAddress || ''}
                        onChange={e =>
                          setEditState(s => ({ ...s, ipAddress: e.target.value }))
                        }
                      />
                      {/* Delete Domains */}
                      {(() => {
                        const device = selectedDevice.backendObj;
                        console.log('backend: ', device)
                        console.log('length: ', device.records.size)

                        return (
                          <>
                            <h4 style={{ marginTop: 12 }}> Delete Domains</h4>

                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {device.records.size === 0 ? (
                                <div
                                  style={{
                                    border: '1px solid #ccc',
                                    padding: 6,
                                    borderRadius: 4,
                                    fontSize: 12,
                                    opacity: 0.8,
                                  }}
                                >
                                  N/A
                                </div>
                              ) : (
                                Array.from(device.records.entries()).map(([domain, ip], idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      border: '1px solid #ccc',
                                      padding: 1,
                                      borderRadius: 4,
                                      fontSize: 12,
                                    }}
                                  >
                                    <div style={{ opacity: 0.9 }}>
                                      Domain {domain}:
                                      <input
                                        type="checkbox"
                                        id={`deleteDomain${idx}`}
                                        style={{ marginLeft: 8 }}
                                      />
                                    </div>
                                  </div>
                                ))
                              )}


                            </div>
                          </>
                        );
                      })()}
                      {/*Add Domains*/}
                      <div>
                        <h4 style={{ marginTop: 12 }}> Add Domains</h4>

                        <div>
                            <label>domains:</label>
                            <input
                              type="number"
                              min={0}
                              max={1000}
                              value={RecordCount}
                              onChange={(e) => setRecordCount(Math.min(1000, Number(e.target.value)))
                              }
                            />
                          </div>
                        <label>Accepted Domains:</label>
                        {Array.from({ length: RecordCount }).map((_, i) => (
                          <div key={i} style={{ marginBottom: 5 }}>
                            <label>Domain {i + 1}: </label>
                            <input type="text" id={`DNSDomain${i}`} placeholder="example.com" style={{ marginRight: 5 }} />
                            <br />
                            <label>IP {i + 1}: </label>
                            <input type="text" id={`domainIP${i}`} placeholder="x.x.x.x" style={{ marginRight: 5 }} />
                          </div>
                        ))}
                      </div>
                       


                  <button
                    style={{ marginTop: 10, width: '100%' }}
                    onClick={() => {
                      const DNS = selectedDevice.backendObj;

                      // 1️⃣ Backend update
                      if (editState.name) DNS.name = editState.name;
                      if(editState.ipAddress) DNS.ipAddress = editState.ipAddress;
                      Array.from(selectedDevice.backendObj.records.entries()).map(([domain, IP], i) => {
                        const deleted = document.getElementById(`deleteDomain${i}`).checked;
                        console.log(selectedDevice.type)
                        if(deleted){
                          DNS.deleteRecord(domain);
                        }
                      });
                      for (let i = 0; i < RecordCount; i++) {
                      const domain = document.getElementById(`DNSDomain${i}`)?.value.trim();
                      const ip = document.getElementById(`domainIP${i}`)?.value.trim();
                      console.log('domain:', domain, 'IP:', ip);

                      if ((domain === '' || ip === '')) {
                        alert('A required field was left empty');
                        continue; // ⛔ stops device creation
                      }
                      if(!isValidIPv4(ip)){
                        alert('An IP Address is not correct');
                        continue; // ⛔ stops device creation
                      }

                      DNS.addRecord(domain, ip);
                    }

                      setEditState(s => ({ ...s, name: null }));
                      // 2️⃣ Update canvas item
                      setSandboxItems(prev =>
                        prev.map(item =>
                          item.id === selectedDevice.id
                            ? { ...item, name: editState.name || item.name }
                            : item
                        )
                      );

                      // 3️⃣ Update selected device panel
                      setSelectedDevice(prev => ({
                        ...prev,
                        name: editState.name || prev.name,
                      }));

                      setActiveTab('info');
                    }}

                  >
                    Apply Changes
                  </button>
                </div>
              )}
              
              {/* Routing Table TAB */}
              {activeTab === 'routing' && selectedDevice.type === 'Router' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h5>Routing Table</h5>

                  {selectedDevice.backendObj.routingTable.length === 0 ? (
                    <p style={{ fontStyle: 'italic' }}>No routes configured</p>
                  ) : (
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 12,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ borderBottom: '1px solid #ccc' }}>Network</th>
                          <th style={{ borderBottom: '1px solid #ccc' }}>Mask</th>
                          <th style={{ borderBottom: '1px solid #ccc' }}>Interface</th>
                          <th style={{ borderBottom: '1px solid #ccc' }}>Interface IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDevice.backendObj.routingTable.map((route, index) => {
                          const iface =
                            selectedDevice.backendObj.interfaces.get(route.interfaceName);

                          const subnetIP = iface?.network?.intToIp(route.subnet);

                          return (
                            <tr key={index}>
                              <td>{subnetIP}</td>
                              <td>{route.mask}</td>
                              <td>{route.interfaceName}</td>
                              <td>{iface?.ipAddress || 'N/A'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {/* MAC Table TAB */}
              {activeTab === 'mactable' && selectedDevice?.type === 'Switch' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <h4>MAC Table</h4>

                  {selectedDevice.backendObj.macTable.size === 0 && (
                    <p style={{ fontStyle: 'italic', color: '#666' }}>No entries yet</p>
                  )}

                  {[...selectedDevice.backendObj.macTable.entries()].map(
                    ([vlanId, table]) => (
                      <div key={vlanId} style={{ border: '1px solid #ccc', padding: 6, borderRadius: 4 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                          VLAN {vlanId}
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 6,
                            fontWeight: 'bold',
                            borderBottom: '1px solid #ddd',
                            paddingBottom: 2,
                            fontSize: 12,
                          }}
                        >
                          <span>MAC</span>
                          <span>Port</span>
                        </div>

                        {[...table.entries()].map(([mac, portName]) => (
                          <div
                            key={mac}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 6,
                              fontSize: 12,
                              padding: '2px 0',
                            }}
                          >
                            <span>{mac}</span>
                            <span>{portName}</span>
                          </div>
                        ))}

                        {table.size === 0 && (
                          <p style={{ fontStyle: 'italic', fontSize: 12 }}>No entries</p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}


              
              {/* PING TAB */}
              {activeTab === 'ping' && selectedDevice.type === 'Host' && (

                <>
                  <input
                    type="text"
                    placeholder="Destination IP"
                    value={pingTarget}
                    onChange={(e) => setPingTarget(e.target.value)}
                    style={{ width: '100%', marginBottom: 6 }}
                  />

                  <button
                    style={{ width: '100%', marginBottom: 6 }}
                    onClick={handlePing}
                  >
                    Send Ping
                  </button>

                  <button
                    style={{ width: '100%', marginBottom: 6 }}
                    onClick={handleClearPing}
                  >
                    Clear
                  </button>

                  <div
                    style={{
                      background: '#000',
                      color: '#0f0',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      padding: 6,
                      height: 120,
                      overflowY: 'auto',
                      border: '1px solid #333',
                    }}
                  >
                    {pingLog.length === 0 ? (
                      <div>Ready.</div>
                    ) : (
                      pingLog.map((line, i) => <div key={i}>{line}</div>)
                    )}
                  </div>
                </>
              )}
              {/* DHCP TAB */}
              {activeTab === 'dhcp' && selectedDevice.type === 'Host' && (
  <>
                  
                  <p>Current IP: {dhcpInfo.ip || 'N/A'}</p>
                  <p>Subnet Mask: {dhcpInfo.subnet || 'N/A'}</p>
                  <p>Gateway: {dhcpInfo.gateway?.name || dhcpInfo.gateway || 'N/A'}</p>

                  <button
                    style={{ width: '100%', marginBottom: 6 }}
                    onClick={() => {
                      // Clear old IP info
                      selectedDevice.backendObj.ipAddress = null;
                      selectedDevice.backendObj.subnetMask = null;
                      selectedDevice.backendObj.gateway = null;

                      // Trigger DHCP request
                      selectedDevice.backendObj.requestIP();
                      console.log('DHCP request sent from', selectedDevice.backendObj.name);
                      // Start polling every 200ms to update tab
                      if (dhcpInterval.current) clearInterval(dhcpInterval.current);
                      dhcpInterval.current = setInterval(() => {
                        setDhcpInfo({
                          ip: selectedDevice.backendObj.ipAddress,
                          subnet: selectedDevice.backendObj.subnetMask,
                          gateway: selectedDevice.backendObj.gateway,
                        });

                        // Stop polling once IP is assigned
                        if (selectedDevice.backendObj.ipAddress) {
                          clearInterval(dhcpInterval.current);
                          dhcpInterval.current = null;
                        }
                      }, 200);
                    }}
                  >
                    Request / Renew IP
                  </button>
                </>
              )}
              {/* Domains TAB */}
              {activeTab === 'domains' && (selectedDevice.type === 'DNS Server' || selectedDevice.type === 'Mail Server') && (
                console.log('Rendering Domains tab for', selectedDevice.backendObj.name),
                console.log('Backend domains:', selectedDevice.backendObj.records || selectedDevice.backendObj.domains),
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <h4>Configured Domains</h4>

                  {selectedDevice.type === 'DNS Server' ? (
                    <>
                      {selectedDevice.backendObj.records?.size > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 4 }}>Domain</th>
                              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: 4 }}>Resolved IP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(selectedDevice.backendObj.records.entries()).map(([domain, ip], idx) => {
                              const cachedIP = selectedDevice.backendObj.records.get(domain);
                              return (
                                <tr key={idx}>
                                  <td style={{ borderBottom: '1px solid #eee', padding: 4 }}>{domain}</td>
                                  <td style={{ borderBottom: '1px solid #eee', padding: 4 }}>{cachedIP}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ fontStyle: 'italic' }}>No domains configured.</p>
                      )}
                    </>
                  ) : (
                    // Mail Server
                    <>
                      {selectedDevice.backendObj.domains?.size > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'center', padding: 4 }}>Domain</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(selectedDevice.backendObj.domains.entries()).map(([domain, ip], idx) => {
                              return (
                                <tr key={idx}>
                                  <td style={{ borderBottom: '1px solid #eee', padding: 4, textAlign: 'center' }}>{domain}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ fontStyle: 'italic' }}>No domains configured.</p>
                        
                      )}
                    </>
                  )}
                </div>
              )}
              
              {activeTab === 'users' && selectedDevice.type === 'Mail Server' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4>User Management</h4>

                  {/* Select Domain */}
                  <div>
                    <label>Domain: </label>
                    <select
                      value={selectedDomain || ''}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                    >
                      <option value="" disabled>
                        -- Select Domain --
                      </option>
                      {Array.from(selectedDevice.backendObj.domains.keys()).map((domainName) => (
                        <option key={domainName} value={domainName}>
                          {domainName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Add User */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="New username"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        if (!selectedDomain) {
                          alert('Select a domain first!');
                          return;
                        }
                        if (!newUserName.trim()) {
                          alert('Enter a username!');
                          return;
                        }


                        if(!selectedDevice.backendObj.domains.get(selectedDomain).mailboxes.has(newUserName.trim()))
                        selectedDevice.backendObj.createMailbox(newUserName.trim(), selectedDomain);

                        setNewUserName(''); // clear input
                        console.log(`Added user ${newUserName} to domain ${selectedDomain}`);
                        // Force re-render to show updated users
                        setSelectedDevice((prev) => ({ ...prev }));
                      }}
                    >
                      Add User
                    </button>
                  </div>

                  {/* Existing Users */}
                    <div>
                      <h5>Existing Users</h5>

                      {selectedDomain ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(() => {
                            const domain =
                              selectedDevice.backendObj.domains.get(selectedDomain);

                            const users = domain
                              ? Array.from(domain.mailboxes.keys())
                              : [];

                            if (users.length === 0) {
                              return (
                                <div style={{ opacity: 0.7, fontSize: 12 }}>
                                  No users in this domain
                                </div>
                              );
                            }

                            return users.map((user) => (
                              <div
                                key={user}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  border: '1px solid #ccc',
                                  borderRadius: 4,
                                  padding: 4,
                                  fontSize: 12,
                                }}
                              >
                                <span>{user}</span>

                                <button
                                  style={{
                                    backgroundColor: '#ffdddd',
                                    border: '1px solid #ff8888',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => {
                                    domain.removeMailbox(user);
                                    setSelectedDevice((prev) => ({ ...prev }));
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        <p style={{ opacity: 0.7 }}>Select a domain to view users</p>
                      )}
                    </div>
                  </div>
                )}
                {/* Compose Message TAB */}
                {activeTab === 'send' && selectedDevice.type === 'Host' && (
                  <div>
                    <div>
                        <label>Email: </label>
                        <input
                          type="text"
                          value={currentEmail}
                          onChange={ (e) => setCurrentEmail(e.target.value)}
                          placeholder={`user@domain.com`}
                        />
                        
                      </div>
                    <h5>{selectedDevice.backendObj.name} Inbox</h5>

                    {/* ==== Inbox ==== */}
                    {selectedDevice.backendObj.emailInbox.length === 0 ? (
                      <p>No emails</p>
                    ) : (
                      <ul>
                        {selectedDevice.backendObj.emailInbox.map((email, idx) => {
                          const [read, content] = email;
                          const [from, to, subject, body] = content;

                          return (
                            <li
                              key={idx}
                              onClick={() => {
                                if (!read) {
                                  selectedDevice.backendObj.emailInbox[idx][0] = true;
                                  setSelectedDevice({ ...selectedDevice }); // force re-render
                                }
                              }}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: read ? '#f0f0f0' : '#fff',
                                padding: '8px',
                                marginBottom: '5px',
                                border: '1px solid #ccc',
                              }}
                            >
                              <strong>{subject}</strong> — <em>from {from}</em>
                              <br />
                              <span>{body}</span>
                              <br />
                              <small>Status: {read ? 'Read' : 'Unread'}</small>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <button
                      onClick={() => selectedDevice.backendObj.fetchInbox(currentEmail)}
                      style={{ marginTop: '10px', marginBottom: '20px' }}
                    >
                      Refresh Inbox
                    </button>

                    {/* ==== Compose Email ==== */}
                    <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                      <h5>Compose Email</h5>
                      <div>
                        <label>To: </label>
                        <input type="text" id="composeTo" placeholder="user@domain.com" style={{ marginRight: 5 }} />
                      </div>
                      <div>
                        <label>Subject: </label>
                        <input type="text" id="composeSubject" placeholder="Subject" style={{ marginRight: 5 }} />
                      </div>
                      <div>
                        <label>Body: </label>
                        <textarea id="composeBody" rows={3} placeholder="Your message..." style={{ width: '100%' }} />
                      </div>
                      <button
                        onClick={() => {
                          const to = document.getElementById('composeTo').value.trim();
                          const subject = document.getElementById('composeSubject').value.trim();
                          const body = document.getElementById('composeBody').value.trim();

                          if (!to || !subject || !body) {
                            alert('Please fill all fields');
                            return;
                          }

                          // Send email via Host backendObj
                          selectedDevice.backendObj.sendEmail(
                            currentEmail, // or an email address like "user@domain"
                            to,
                            subject,
                            body
                          );

                          alert('Email sent!');
                          // Optionally clear inputs
                          document.getElementById('composeTo').value = '';
                          document.getElementById('composeSubject').value = '';
                          document.getElementById('composeBody').value = '';
                        }}
                        style={{ marginTop: '10px' }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}

            </div>
          )}

        </DropZone>
      </div>
    </DndProvider>
  );
};

export default App;
