import React, { forwardRef } from 'react';
import { useDrop } from 'react-dnd';

const DropZone = forwardRef(({ onDrop, onMove, onClick, children }, ref) => {
  const [, drop] = useDrop(() => ({
    accept: ['item', 'sandboxItem'],
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      if (!offset || !ref.current) return;

      const rect = ref.current.getBoundingClientRect();

      if (item.id !== undefined) {
        // Moving existing sandbox item
        onMove(item.id, offset.x - rect.left, offset.y - rect.top);
      } else {
        // Creating new item from sidebar
        onDrop(item, offset.x, offset.y);
      }
    },
  }));

  return (
    <div
      ref={(node) => {
        drop(node);
        if (ref) ref.current = node;
      }}
      onClick={onClick}  // ← handle background clicks
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
});

export default DropZone;
