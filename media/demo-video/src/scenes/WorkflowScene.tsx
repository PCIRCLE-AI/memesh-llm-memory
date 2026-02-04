import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { LightningIcon, DownloadIcon, GearIcon, DatabaseIcon } from '../components/Icons';

export const WorkflowScene: React.FC = () => {
  const frame = useCurrentFrame();

  const titleY = interpolate(frame, [0, 20], [1200, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

  const flowOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
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
        <LightningIcon size={80} color="#38bdf8" />
        <h2
          style={{
            fontSize: 72,
            color: '#38bdf8',
            margin: 0,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
          }}
        >
          Smart Workflows
        </h2>
        <p
          style={{
            fontSize: 36,
            color: '#9ca3af',
            margin: '10px 0 0 0',
            fontFamily: 'monospace',
          }}
        >
          Automated Task Execution
        </p>
      </div>

      {/* Workflow Steps */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 100px',
          opacity: flowOpacity,
        }}
      >
        {[
          { num: '1', label: 'Receive\nTask', Icon: DownloadIcon },
          { num: '2', label: 'Smart\nRoute', Icon: LightningIcon },
          { num: '3', label: 'Execute\nAgent', Icon: GearIcon },
          { num: '4', label: 'Store\nResult', Icon: DatabaseIcon },
        ].map((step, i) => {
          const Icon = step.Icon;
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 150,
                  height: 150,
                  background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  boxShadow: '0 0 40px rgba(56, 189, 248, 0.5)',
                }}
              >
                <Icon size={60} color="white" />
                <div
                  style={{
                    fontSize: 28,
                    color: 'white',
                    fontWeight: 'bold',
                    marginTop: 10,
                  }}
                >
                  {step.num}
                </div>
              </div>
              <div
                style={{
                  fontSize: 28,
                  color: '#38bdf8',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 'bold',
                  whiteSpace: 'pre-line',
                  lineHeight: 1.3,
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Command */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 120,
          right: 120,
          background: 'rgba(30, 30, 46, 0.8)',
          border: '2px solid #38bdf8',
          borderRadius: 15,
          padding: 25,
          fontFamily: 'monospace',
          fontSize: 28,
          color: '#38bdf8',
          opacity: flowOpacity,
          textAlign: 'center',
        }}
      >
        $ buddy-do "your task description"
      </div>
    </AbsoluteFill>
  );
};
