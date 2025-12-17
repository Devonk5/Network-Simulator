import React from 'react';
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

const DragItem = ({ name }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'item',
    item: { name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        border: '1px solid #ccc',
        padding: '10px',
        borderRadius: '5px',
        margin: '5px',
        backgroundColor: getColor(name),
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '18px',
      }}
    >
      {getIcon(name)} {name}
    </div>
  );
};

export default DragItem;
