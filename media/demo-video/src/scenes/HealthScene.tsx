import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { HeartbeatIcon } from '../components/Icons';

export const HealthScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const metricsStagger = (index: number) =>
    interpolate(frame, [20 + index * 15, 40 + index * 15], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const pulseScale = 1 + Math.sin(frame / 10) * 0.05;

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
        padding: 80,
      }}
    >
      {/* Title */}
      <div style={{ opacity: titleOpacity, display: 'flex', alignItems: 'center', gap: 30 }}>
        <HeartbeatIcon size={80} color="#34d399" />
        <h2
          style={{
            fontSize: 72,
            color: '#34d399',
            margin: 0,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          Health Monitoring
        </h2>
        <p
          style={{
            fontSize: 36,
            color: '#9ca3af',
            margin: '10px 0 0 0',
            fontFamily: 'monospace',
          }}
        >
          Real-time System Status
        </p>
      </div>

      {/* Health Metrics */}
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 150,
          right: 150,
        }}
      >
        {[
          { label: 'MCP Server', status: 'Healthy', color: '#34d399' },
          { label: 'A2A Registry', status: 'Active', color: '#34d399' },
          { label: 'Knowledge Graph', status: 'Synced', color: '#34d399' },
          { label: 'Secret Store', status: 'Secured', color: '#34d399' },
        ].map((metric, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '2px solid #34d399',
              borderRadius: 15,
              padding: '25px 40px',
              marginBottom: 25,
              opacity: metricsStagger(i),
              transform: `scale(${i === 0 ? pulseScale : 1})`,
            }}
          >
            <div
              style={{
                fontSize: 36,
                color: 'white',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
              }}
            >
              {metric.label}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 15,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: metric.color,
                  borderRadius: '50%',
                  boxShadow: `0 0 20px ${metric.color}`,
                }}
              />
              <div
                style={{
                  fontSize: 32,
                  color: metric.color,
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                }}
              >
                {metric.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Command */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 120,
          right: 120,
          background: 'rgba(30, 30, 46, 0.8)',
          border: '2px solid #34d399',
          borderRadius: 15,
          padding: 25,
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#34d399',
          opacity: metricsStagger(3),
        }}
      >
        $ get-session-health
      </div>
    </AbsoluteFill>
  );
};
