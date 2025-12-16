import React, { forwardRef } from 'react';
import { useDrop } from 'react-dnd';

const DropZone = forwardRef(({ onDrop, onMove, children }, ref) => {
  const [, drop] = useDrop(() => ({
    accept: ['item', 'sandboxItem'],
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const boundingRect = ref.current.getBoundingClientRect();
      const x = offset.x - boundingRect.left;
      const y = offset.y - boundingRect.top;

      if (item.index !== undefined) {
        // moving existing sandbox item
        onMove(item.index, x, y);
      } else {
        // creating new item from sidebar
        onDrop({ ...item, x, y });
      }
    },
  }));

  return (
    <div
      ref={(node) => {
        drop(node);
        if (ref) ref.current = node;
      }}
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
