import { AbsoluteFill, Sequence } from 'remotion';
import { TitleScene } from './scenes/TitleScene';
import { A2AScene as SmartRoutingScene } from './scenes/A2AScene';
import { MemoryScene } from './scenes/MemoryScene';
import { HealthScene } from './scenes/HealthScene';
import { WorkflowScene } from './scenes/WorkflowScene';
import { OutroScene } from './scenes/OutroScene';

export const Video: React.FC = () => {
  const fps = 30;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Title Scene: 0-5s (150 frames) */}
      <Sequence from={0} durationInFrames={150}>
        <TitleScene />
      </Sequence>

      {/* Smart Routing Scene: 5-11s (180 frames) */}
      <Sequence from={150} durationInFrames={180}>
        <SmartRoutingScene />
      </Sequence>

      {/* Memory Scene: 11-17s (180 frames) */}
      <Sequence from={330} durationInFrames={180}>
        <MemoryScene />
      </Sequence>

      {/* Health Scene: 17-23s (180 frames) */}
      <Sequence from={510} durationInFrames={180}>
        <HealthScene />
      </Sequence>

      {/* Workflow Scene: 23-27s (120 frames) */}
      <Sequence from={690} durationInFrames={120}>
        <WorkflowScene />
      </Sequence>

      {/* Outro Scene: 27-32s (150 frames) */}
      <Sequence from={810} durationInFrames={150}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
