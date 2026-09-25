import type { EmbedProvider } from './embedProvider.js'

// all-MiniLM-L6-v2's output size; kept as a constant rather than probed at runtime since
// it's fixed for the model this provider is built around.
const DIMENSIONS = 384

type FeatureExtractionPipeline = (
  texts: string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>

/**
 * Runs a small local transformer model in-process (ONNX via @huggingface/transformers) for
 * semantic embeddings — spec §6.3/§7's "local model" default. The model (~90MB) downloads
 * once on first use and is cached by the library; no native Python or GPU required.
 */
export class LocalEmbedProvider implements EmbedProvider {
  readonly name = 'local'
  readonly dimensions = DIMENSIONS
  #modelId: string
  #pipelinePromise: Promise<FeatureExtractionPipeline> | undefined

  constructor(modelId: string) {
    this.#modelId = modelId
  }

  async #getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.#pipelinePromise) {
      this.#pipelinePromise = import('@huggingface/transformers').then(({ pipeline }) =>
        pipeline('feature-extraction', this.#modelId) as unknown as Promise<FeatureExtractionPipeline>,
      )
    }
    return this.#pipelinePromise
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return []

    const extractor = await this.#getPipeline()
    const output = await extractor(texts, { pooling: 'mean', normalize: true })
    return output.tolist().map((row) => Float32Array.from(row))
  }
}
