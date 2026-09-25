import type { EmbedProvider } from './embedProvider.js'

/**
 * Deterministic embeddings for tests: a simple hashed bag-of-words vector, so that two texts
 * sharing words end up closer together (enough to test ranking) without a model dependency.
 */
export class StubEmbedProvider implements EmbedProvider {
  readonly name = 'stub'
  readonly dimensions = 32

  async embed(texts: string[]): Promise<Float32Array[]> {
    return texts.map((text) => this.#vectorFor(text))
  }

  #vectorFor(text: string): Float32Array {
    const vector = new Float32Array(this.dimensions)
    for (const word of text.toLowerCase().split(/\W+/).filter(Boolean)) {
      let hash = 0
      for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0
      const index = hash % this.dimensions
      vector[index] = vector[index]! + 1
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1
    for (let i = 0; i < vector.length; i++) vector[i] = vector[i]! / norm
    return vector
  }
}
