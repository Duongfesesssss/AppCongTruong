declare module "image-size" {
  type Dimensions = { width?: number; height?: number };
  type Input = string | Buffer;
  export default function imageSize(input: Input): Dimensions;
}
