export interface EmbedProvider {
  readonly name: string
  readonly dimensions: number
  embed(texts: string[]): Promise<Float32Array[]>
}
