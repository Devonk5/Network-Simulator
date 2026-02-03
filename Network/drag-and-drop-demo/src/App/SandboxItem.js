import React, { useRef } from 'react';

// Match DragItem style
const DEVICE_STYLES = {
  Host: { background: '#a8d6ffff', border: '#858585ff', icon: '💻' },
  Switch: { background: '#7eff85ff', border: '#858585ff', icon: '🔀' },
  Router: { background: '#ff8a7aff', border: '#858585ff', icon: '📡' },
  'DNS Server': { background: '#fff176ff', border: '#858585ff', icon: '🌐' },
  'Mail Server': { background: '#ffd8a8', border: '#858585ff', icon: '📧' },
};

const SandboxItem = ({
  item,
  onMove,
  onDelete,
  startConnection,
  completeConnection,
  connectionStart,
  connections = [],
  getPortPositions = () => [],
  onSelect,
}) => {
  const style = DEVICE_STYLES[item.type] || {};

  const itemRef = useRef(null);

  // Drag state (NO React state → no lag)
  const isDragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startItem = useRef({ x: 0, y: 0 });

  const ports = getPortPositions(item);

  // 🔒 One connection per port
  const isPortConnected = (portId) =>
    connections.some(
      (c) =>
        (c.from?.itemId === item.id && c.from?.portId === portId) ||
        (c.to?.itemId === item.id && c.to?.portId === portId)
    );

  
  // --------------------
  // Drag logic (FIXED OFFSET)
  // --------------------
  const handleMouseDown = (e) => {
    if (e.target.dataset.port) return;

    e.stopPropagation();
    isDragging.current = true;

    startMouse.current = { x: e.clientX, y: e.clientY };
    startItem.current = { x: item.x, y: item.y };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !itemRef.current) return;

    const dx = e.clientX - startMouse.current.x;
    const dy = e.clientY - startMouse.current.y;

    // ⚡ visual move only
    itemRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handleMouseUp = (e) => {
    if (!isDragging.current) return;

    isDragging.current = false;

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    const dx = e.clientX - startMouse.current.x;
    const dy = e.clientY - startMouse.current.y;

    // ✅ commit final position
    onMove(
      item.id,
      startItem.current.x + dx,
      startItem.current.y + dy
    );

    if (itemRef.current) {
      itemRef.current.style.transform = '';
    }
  };

  // --------------------
  // Port click logic
  // --------------------
  const handlePortClick = (portId, e) => {
    e.stopPropagation();
    if (isPortConnected(portId)) return;

    if (!connectionStart) {
      startConnection(item.id, portId);
    } else {
      completeConnection(item.id, portId);
    }
  };

  return (
    <div
      ref={itemRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item);
      }}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        background: style.background,
        border: `2px solid ${style.border}`,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {/* Delete button in top-right corner */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent dragging/selecting
          onDelete(item.id);
        }}
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: 'none',
          background: 'red',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        X
      </button>

      <span style={{ marginRight: 6 }}>{style.icon}</span>
      {item.name}

      {/* Ports */}
      {ports.map((p) => {
        const connected = isPortConnected(p.id);
        const active = connectionStart?.portId === p.id;

        return (
          <div
            key={p.id}
            data-port
            onClick={(e) => handlePortClick(p.id, e)}
            style={{
              position: 'absolute',
              left: p.x - item.x - 5,
              top: p.y - item.y - 5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: connected
                ? '#2e7d32'
                : active
                ? '#ff9800'
                : '#1976d2',
              border: '1px solid black',
              cursor: connected ? 'not-allowed' : 'pointer',
            }}
          />
        );
      })}
    </div>
  );
};

export default SandboxItem;
