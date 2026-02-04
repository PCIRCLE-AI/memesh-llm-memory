import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { BrainIcon } from '../components/Icons';

export const MemoryScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const graphScale = interpolate(frame, [20, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.5)),
  });

  const commandsOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: 80,
      }}
    >
      {/* Title */}
      <div style={{ opacity: titleOpacity, display: 'flex', alignItems: 'center', gap: 30 }}>
        <BrainIcon size={80} color="#fbbf24" />
        <h2
          style={{
            fontSize: 72,
            color: '#fbbf24',
            margin: 0,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          Memory Management
        </h2>
        <p
          style={{
            fontSize: 36,
            color: '#9ca3af',
            margin: '10px 0 0 0',
            fontFamily: 'monospace',
          }}
        >
          Knowledge Graph Storage
        </p>
      </div>

      {/* Knowledge Graph Visual */}
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${graphScale})`,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 800,
            height: 400,
          }}
        >
          {/* Center Node */}
          <div
            style={{
              position: 'absolute',
              top: 150,
              left: 325,
              width: 150,
              height: 150,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 0 40px rgba(251, 191, 36, 0.5)',
            }}
          >
            MeMesh
          </div>

          {/* Satellite Nodes */}
          {[
            { label: 'Projects', x: 100, y: 50 },
            { label: 'Entities', x: 550, y: 50 },
            { label: 'Memories', x: 100, y: 250 },
            { label: 'Relations', x: 550, y: 250 },
          ].map((node, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: node.y,
                left: node.x,
                width: 120,
                height: 120,
                background: 'rgba(251, 191, 36, 0.2)',
                border: '3px solid #fbbf24',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: '#fbbf24',
                fontFamily: 'monospace',
              }}
            >
              {node.label}
            </div>
          ))}
        </div>
      </div>

      {/* Commands */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 120,
          right: 120,
          opacity: commandsOpacity,
        }}
      >
        <div
          style={{
            background: 'rgba(30, 30, 46, 0.8)',
            border: '2px solid #fbbf24',
            borderRadius: 15,
            padding: 25,
            fontFamily: 'monospace',
            fontSize: 26,
          }}
        >
          <div style={{ color: '#fbbf24', marginBottom: 10 }}>
            $ buddy-remember "topic"
          </div>
          <div style={{ color: '#9ca3af' }}>$ create-entities ...</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
