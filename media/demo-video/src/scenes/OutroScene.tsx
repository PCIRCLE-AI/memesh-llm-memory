import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { NetworkIcon, BrainIcon, LockIcon, HeartbeatIcon } from '../components/Icons';

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: {
      damping: 200,
    },
  });

  const textOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ctaOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Logo/Title */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          textAlign: 'center',
          marginBottom: 80,
        }}
      >
        <h1
          style={{
            fontSize: 100,
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          MeMesh
        </h1>
      </div>

      {/* Features Summary */}
      <div
        style={{
          opacity: textOpacity,
          marginBottom: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 80,
          }}
        >
          {[
            { Icon: NetworkIcon, label: 'Multi-Agent\nCollaboration' },
            { Icon: BrainIcon, label: 'Knowledge\nManagement' },
            { Icon: LockIcon, label: 'Secure\nSecrets' },
            { Icon: HeartbeatIcon, label: 'Health\nMonitoring' },
          ].map((feature, i) => {
            const Icon = feature.Icon;
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'center' }}>
                  <Icon size={60} color="white" />
                </div>
                <div
                  style={{
                    fontSize: 24,
                    color: 'white',
                    fontFamily: 'Arial, sans-serif',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.4,
                  }}
                >
                  {feature.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: ctaOpacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 42,
            color: 'white',
            fontFamily: 'monospace',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '20px 50px',
            borderRadius: 15,
            border: '3px solid white',
            fontWeight: 'bold',
          }}
        >
          memesh.pcircle.ai
        </div>
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: 30,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Start building with MeMesh today!
        </div>
      </div>
    </AbsoluteFill>
  );
};
