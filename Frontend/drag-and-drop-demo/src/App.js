import React, { useState, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DragItem from './App/DragItem';
import DropZone from './App/DropZone';
import SandboxItem from './App/SandboxItem';

const App = () => {
  const [sandboxItems, setSandboxItems] = useState([]);
  const dropRef = useRef(null);

  // Add new item from sidebar
  const handleDrop = (item) => {
    setSandboxItems((prev) => [...prev, item]);
  };

  // Move existing sandbox item
  const handleMove = (index, x, y) => {
    setSandboxItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, x, y } : item))
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div
          style={{
            width: '200px',
            borderRight: '1px solid #ccc',
            padding: '10px',
            boxSizing: 'border-box',
          }}
        >
          <h2>Drag Items</h2>
          <DragItem name="Switch" />
          <DragItem name="Router" />
          <DragItem name="Host" />
        </div>

        {/* Sandbox */}
        <div
          style={{
            flex: 1,
            position: 'relative',
          }}
        >
          <DropZone ref={dropRef} onDrop={handleDrop} onMove={handleMove}>
            {sandboxItems.map((item, index) => (
              <SandboxItem
                key={index}
                item={item}
                index={index}
                onMove={handleMove}
              />
            ))}
          </DropZone>
        </div>
      </div>
    </DndProvider>
  );
};

export default App;
