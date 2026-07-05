declare module "heic-decode" {
  interface HeicImage {
    width: number;
    height: number;
    data: ArrayBuffer;
  }
  function decode(input: { buffer: Uint8Array }): Promise<HeicImage>;
  export default decode;
}
