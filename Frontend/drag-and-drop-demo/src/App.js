import React, { useState, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DragItem from './App/DragItem';
import DropZone from './App/DropZone';
import SandboxItem from './App/SandboxItem';

const App = () => {
  const [sandboxItems, setSandboxItems] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectionStart, setConnectionStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [newItemPending, setNewItemPending] = useState(null);

  const dropRef = useRef(null);

  const handleDrop = (item, clientX, clientY) => {
    const rect = dropRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setNewItemPending({ name: item.name, x, y });
  };

  const confirmNewItem = (portsPerSide) => {
    if (!newItemPending) return;
    setSandboxItems(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newItemPending.name,
        x: newItemPending.x,
        y: newItemPending.y,
        width: 100,
        height: 50,
        portsPerSide,
      }
    ]);
    setNewItemPending(null);
  };

  const handleMove = (id, x, y) => {
    setSandboxItems(prev =>
      prev.map(item => (item.id === id ? { ...item, x, y } : item))
    );
  };

  const handleResize = (id, width, height) => {
    setSandboxItems(prev =>
      prev.map(item => (item.id === id ? { ...item, width, height } : item))
    );
  };

  const handleDeleteItem = (id) => {
    setSandboxItems(prev => prev.filter(item => item.id !== id));
    setConnections(prev => prev.filter(c => c.from.itemId !== id && c.to.itemId !== id));
    if (connectionStart?.itemId === id) setConnectionStart(null);
  };

  const startConnection = (itemId, portId) => {
    setConnectionStart({ itemId, portId });
  };

  const completeConnection = (itemId, portId) => {
    if (!connectionStart) return;

    setConnections(prev => [
      ...prev,
      { from: connectionStart, to: { itemId, portId } }
    ]);

    setConnectionStart(null);
  };

  const deleteConnection = (index) => {
    setConnections(prev => prev.filter((_, i) => i !== index));
  };

  const getPortPositions = (item) => {
    const positions = [];
    const { width, height, x, y, portsPerSide } = item;

    ['top', 'right', 'bottom', 'left'].forEach(side => {
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
        positions.push({ id: `${side}-${i}`, side, x: px, y: py });
      }
    });

    return positions;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', height: '100vh' }}>
        <div style={{ width: '200px', borderRight: '1px solid #ccc', padding: '10px' }}>
          <h2>Drag Items</h2>
          <DragItem name="Switch" />
          <DragItem name="Router" />
          <DragItem name="Host" />
        </div>

        <div
          style={{ flex: 1, position: 'relative' }}
          onMouseMove={(e) => {
            const rect = dropRef.current.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onClick={() => setConnectionStart(null)}
        >
          {newItemPending && (
            <div
              style={{
                position: 'absolute',
                left: newItemPending.x,
                top: newItemPending.y,
                background: 'white',
                border: '1px solid black',
                padding: '10px',
                zIndex: 2000
              }}
            >
              <h4>Set ports per side for {newItemPending.name}</h4>
              <div>
                <label>Top:</label>
                <input id="topPorts" type="number" defaultValue={1} min={0} max={4} />
              </div>
              <div>
                <label>Right:</label>
                <input id="rightPorts" type="number" defaultValue={1} min={0} max={4} />
              </div>
              <div>
                <label>Bottom:</label>
                <input id="bottomPorts" type="number" defaultValue={1} min={0} max={4} />
              </div>
              <div>
                <label>Left:</label>
                <input id="leftPorts" type="number" defaultValue={1} min={0} max={4} />
              </div>
              <button
                onClick={() =>
                  confirmNewItem({
                    top: Number(document.getElementById('topPorts').value),
                    right: Number(document.getElementById('rightPorts').value),
                    bottom: Number(document.getElementById('bottomPorts').value),
                    left: Number(document.getElementById('leftPorts').value)
                  })
                }
              >
                Confirm
              </button>
            </div>
          )}

          <DropZone ref={dropRef} onDrop={handleDrop} onMove={handleMove}>
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
              {connections.map((c, idx) => {
                const fromItem = sandboxItems.find(i => i.id === c.from.itemId);
                const toItem = sandboxItems.find(i => i.id === c.to.itemId);
                if (!fromItem || !toItem) return null;

                const fromPort = getPortPositions(fromItem).find(p => p.id === c.from.portId);
                const toPort = getPortPositions(toItem).find(p => p.id === c.to.portId);
                if (!fromPort || !toPort) return null;

                return (
                  <line
                    key={idx}
                    x1={fromPort.x}
                    y1={fromPort.y}
                    x2={toPort.x}
                    y2={toPort.y}
                    stroke="black"
                    strokeWidth={2}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConnection(idx);
                    }}
                  />
                );
              })}
            </svg>

            {sandboxItems.map(item => (
              <SandboxItem
                key={item.id}
                item={item}
                sandboxItems={sandboxItems}
                onMove={handleMove}
                onResize={handleResize}
                onDelete={handleDeleteItem}
                startConnection={startConnection}
                completeConnection={completeConnection}
                connectionStart={connectionStart}
                connections={connections}
                getPortPositions={getPortPositions}
              />
            ))}
          </DropZone>
        </div>
      </div>
    </DndProvider>
  );
};

export default App;
