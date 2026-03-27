import { Composition } from 'remotion';
import { WalkthroughComposition, TotalDuration } from './WalkthroughComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Walkthrough"
        component={WalkthroughComposition}
        durationInFrames={TotalDuration}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
