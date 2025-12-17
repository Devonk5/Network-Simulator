import React, { useState } from 'react';
import { useDrag } from 'react-dnd';

const getColor = (name) => {
  switch (name) {
    case 'Switch': return 'lightgreen';
    case 'Router': return 'lightcoral';
    case 'Host': return 'lightblue';
    default: return 'lightgray';
  }
};

const getIcon = (name) => {
  switch (name) {
    case 'Switch': return '🔀';
    case 'Router': return '📡';
    case 'Host': return '💻';
    default: return '❓';
  }
};

const SandboxItem = ({
  item,
  onMove,
  onResize,
  onDelete,
  startConnection,
  completeConnection,
  connectionStart,
  connections,
  getPortPositions
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'sandboxItem',
    item: { id: item.id },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  }));

  const [size, setSize] = useState({ width: item.width, height: item.height });
  const [hoveredPort, setHoveredPort] = useState(null);

  const handleResize = (e) => {
    e.stopPropagation();
    let newWidth = e.clientX - item.x;
    let newHeight = e.clientY - item.y;
    newWidth = Math.max(60, Math.min(400, newWidth));
    newHeight = Math.max(30, Math.min(200, newHeight));
    setSize({ width: newWidth, height: newHeight });
    onResize(item.id, newWidth, newHeight);
  };

  const ports = getPortPositions(item);

  return (
    <>
      <div
        ref={drag}
        style={{
          position: 'absolute',
          left: item.x,
          top: item.y,
          width: size.width,
          height: size.height,
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
          borderRadius: '5px',
          backgroundColor: getColor(item.name),
          border: '1px solid #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
        onDoubleClick={() => onDelete(item.id)}
      >
        {getIcon(item.name)} {item.name}
        <span
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          style={{ marginLeft: 5, color: 'red', cursor: 'pointer' }}
        >
          ×
        </span>

        <div
          style={{
            width: 10,
            height: 10,
            background: 'gray',
            position: 'absolute',
            bottom: 0,
            right: 0,
            cursor: 'se-resize',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            const onMouseMove = (ev) => handleResize(ev);
            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
        />
      </div>

      {/* Ports */}
      {ports.map(port => {
        const connected = connections.some(c =>
          (c.from.itemId === item.id && c.from.portId === port.id) ||
          (c.to.itemId === item.id && c.to.portId === port.id)
        );
        const selected = connectionStart?.itemId === item.id && connectionStart.portId === port.id;

        let color = 'green';
        if (connected) color = 'red';
        else if (selected) color = 'blue';
        else if (hoveredPort === port.id) color = 'yellow';

        return (
          <div
            key={port.id}
            style={{
              position: 'absolute',
              left: port.x - 5,
              top: port.y - 5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: color,
              cursor: 'pointer',
              zIndex: 2
            }}
            onMouseEnter={() => setHoveredPort(port.id)}
            onMouseLeave={() => setHoveredPort(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (!connected) {
                if (!connectionStart) startConnection(item.id, port.id);
                else completeConnection(item.id, port.id);
              }
            }}
          />
        );
      })}
    </>
  );
};

export default SandboxItem;
