import React from "react";
import { Composition } from "remotion";
import { HeroRemoveBg, HERO_DURATION } from "./HeroRemoveBg";
import { DemoCompress, COMPRESS_DURATION } from "./DemoCompress";
import { DemoConvert, CONVERT_DURATION } from "./DemoConvert";
import { DemoCrop, CROP_DURATION } from "./DemoCrop";
import { DemoExif, EXIF_DURATION } from "./DemoExif";
import { DemoPrivacy, PRIVACY_DURATION } from "./DemoPrivacy";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="hero-removebg"
      component={HeroRemoveBg}
      durationInFrames={HERO_DURATION}
      fps={FPS}
      width={1600}
      height={900}
    />
    <Composition
      id="demo-compress"
      component={DemoCompress}
      durationInFrames={COMPRESS_DURATION}
      fps={FPS}
      width={1280}
      height={800}
    />
    <Composition
      id="demo-convert"
      component={DemoConvert}
      durationInFrames={CONVERT_DURATION}
      fps={FPS}
      width={1280}
      height={800}
    />
    <Composition
      id="demo-crop"
      component={DemoCrop}
      durationInFrames={CROP_DURATION}
      fps={FPS}
      width={1280}
      height={800}
    />
    <Composition
      id="demo-exif"
      component={DemoExif}
      durationInFrames={EXIF_DURATION}
      fps={FPS}
      width={1280}
      height={800}
    />
    <Composition
      id="demo-privacy"
      component={DemoPrivacy}
      durationInFrames={PRIVACY_DURATION}
      fps={FPS}
      width={1280}
      height={800}
    />
  </>
);
