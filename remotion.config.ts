import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// the procedural planet textures are generated on first frame in each render tab
Config.setDelayRenderTimeoutInMilliseconds(240000);
// three.js needs WebGL; "swangle" = software ANGLE, so it works on machines without a GPU.
Config.setChromiumOpenGlRenderer("swangle");
// Use a locally installed Chromium when Remotion cannot download its own browser.
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
