import { AbsoluteFill, Sequence } from 'remotion';
import { TitleScene } from './scenes/TitleScene';
import { A2AScene } from './scenes/A2AScene';
import { MemoryScene } from './scenes/MemoryScene';
import { SecretsScene } from './scenes/SecretsScene';
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

      {/* A2A Scene: 5-11s (180 frames) */}
      <Sequence from={150} durationInFrames={180}>
        <A2AScene />
      </Sequence>

      {/* Memory Scene: 11-17s (180 frames) */}
      <Sequence from={330} durationInFrames={180}>
        <MemoryScene />
      </Sequence>

      {/* Secrets Scene: 17-23s (180 frames) */}
      <Sequence from={510} durationInFrames={180}>
        <SecretsScene />
      </Sequence>

      {/* Health Scene: 23-29s (180 frames) */}
      <Sequence from={690} durationInFrames={180}>
        <HealthScene />
      </Sequence>

      {/* Workflow Scene: 29-33s (120 frames) */}
      <Sequence from={870} durationInFrames={120}>
        <WorkflowScene />
      </Sequence>

      {/* Outro Scene: 33-38s (150 frames) */}
      <Sequence from={990} durationInFrames={150}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
