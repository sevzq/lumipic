import { Config } from "@remotion/cli/config";

Config.setOverwriteOutput(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);
// Demo source assets live here, not in the app's public/ (keeps prod slim).
Config.setPublicDir("remotion/public");
