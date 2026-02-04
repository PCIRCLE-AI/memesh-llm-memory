import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { NetworkIcon } from '../components/Icons';

export const A2AScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleY = interpolate(frame, [0, 20], [-100, 80], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const agentOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const commandOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const connectionOpacity = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: 80,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: titleY,
          left: 80,
          right: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 30,
        }}
      >
        <NetworkIcon size={80} color="#4ade80" />
        <h2
          style={{
            fontSize: 72,
            color: '#4ade80',
            margin: 0,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          A2A Collaboration
        </h2>
        <p
          style={{
            fontSize: 36,
            color: '#9ca3af',
            margin: '10px 0 0 0',
            fontFamily: 'monospace',
          }}
        >
          Agent-to-Agent Protocol
        </p>
      </div>

      {/* Agent Cards */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          padding: '0 120px',
          opacity: agentOpacity,
        }}
      >
        {/* Agent 1 */}
        <div
          style={{
            background: 'rgba(74, 222, 128, 0.1)',
            border: '3px solid #4ade80',
            borderRadius: 20,
            padding: 30,
            width: 350,
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: '#4ade80',
              fontFamily: 'monospace',
              marginBottom: 15,
            }}
          >
            Agent: Lambda
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#9ca3af',
              fontFamily: 'monospace',
            }}
          >
            ID: kts-macbook-ml8gahn2
          </div>
        </div>

        {/* Connection Line */}
        <div
          style={{
            alignSelf: 'center',
            fontSize: 60,
            color: '#4ade80',
            opacity: connectionOpacity,
          }}
        >
          ⟷
        </div>

        {/* Agent 2 */}
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '3px solid #3b82f6',
            borderRadius: 20,
            padding: 30,
            width: 350,
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: '#3b82f6',
              fontFamily: 'monospace',
              marginBottom: 15,
            }}
          >
            Agent: Sigma
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#9ca3af',
              fontFamily: 'monospace',
            }}
          >
            ID: kts-macbook-ml7hd0by
          </div>
        </div>
      </div>

      {/* Commands */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 120,
          right: 120,
          background: 'rgba(30, 30, 46, 0.8)',
          border: '2px solid #4ade80',
          borderRadius: 15,
          padding: 30,
          fontFamily: 'monospace',
          opacity: commandOpacity,
        }}
      >
        <div style={{ fontSize: 28, color: '#4ade80', marginBottom: 15 }}>
          $ a2a-list-agents
        </div>
        <div style={{ fontSize: 24, color: '#9ca3af' }}>
          $ a2a-send-task targetAgentId="..." taskDescription="..."
        </div>
      </div>
    </AbsoluteFill>
  );
};
