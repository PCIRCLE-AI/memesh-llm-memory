import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { LockIcon, SaveIcon, SearchIcon, TrashIcon } from '../components/Icons';

export const SecretsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleSlide = interpolate(frame, [0, 25], [-1000, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const lockScale = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2)),
  });

  const featureOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        padding: 80,
      }}
    >
      {/* Title */}
      <div
        style={{
          transform: `translateX(${titleSlide}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 30,
        }}
      >
        <LockIcon size={80} color="#a78bfa" />
        <h2
          style={{
            fontSize: 72,
            color: '#a78bfa',
            margin: 0,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          Secrets Management
        </h2>
        <p
          style={{
            fontSize: 36,
            color: '#9ca3af',
            margin: '10px 0 0 0',
            fontFamily: 'monospace',
          }}
        >
          Secure Credential Storage
        </p>
      </div>

      {/* Lock Icon */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${lockScale})`,
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
            borderRadius: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 60px rgba(167, 139, 250, 0.6)',
          }}
        >
          <LockIcon size={120} color="white" />
        </div>
      </div>

      {/* Features */}
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          padding: '0 150px',
          opacity: featureOpacity,
        }}
      >
        {[
          { Icon: SaveIcon, text: 'Store Secrets' },
          { Icon: SearchIcon, text: 'Retrieve Safely' },
          { Icon: TrashIcon, text: 'Delete Securely' },
        ].map((feature, i) => {
          const Icon = feature.Icon;
          return (
            <div
              key={i}
              style={{
                textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'center' }}>
                <Icon size={70} color="#a78bfa" />
              </div>
              <div
                style={{
                  fontSize: 28,
                  color: '#a78bfa',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 'bold',
                }}
              >
                {feature.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Commands */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: 120,
          right: 120,
          background: 'rgba(30, 30, 46, 0.8)',
          border: '2px solid #a78bfa',
          borderRadius: 15,
          padding: 20,
          fontFamily: 'monospace',
          fontSize: 24,
          color: '#9ca3af',
          opacity: featureOpacity,
        }}
      >
        $ buddy-secret-store / buddy-secret-get / buddy-secret-delete
      </div>
    </AbsoluteFill>
  );
};
