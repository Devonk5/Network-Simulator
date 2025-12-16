import React from 'react';
import { useDrag } from 'react-dnd';

const getColor = (name) => {
  switch (name) {
    case 'Switch':
      return 'lightgreen';
    case 'Router':
      return 'lightcoral';
    case 'Host':
      return 'lightblue';
    default:
      return 'lightgray';
  }
};

const getIcon = (name) => {
  switch (name) {
    case 'Switch':
      return '🔀';
    case 'Router':
      return '📡';
    case 'Host':
      return '💻';
    default:
      return '❓';
  }
};

const SandboxItem = ({ item, index, onMove }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'item',
    item: { index, name: item.name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (draggedItem, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset) {
        onMove(index, offset.x - 220, offset.y - 60); // adjust for container position
      }
    },
  }));

  return (
    <div
      ref={drag}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: getColor(item.name),
        border: '1px solid #ccc',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: '18px',
      }}
    >
      {getIcon(item.name)} {item.name}
    </div>
  );
};

export default SandboxItem;
