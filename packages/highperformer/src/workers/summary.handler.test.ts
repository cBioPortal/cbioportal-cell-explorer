import { describe, it, expect } from 'vitest'
import { handleSummaryMessage } from './summary.handler'

describe('summary handler', () => {
  describe('summarizeCategory', () => {
    it('tallies codes correctly for selected indices', () => {
      const codes = new Uint8Array([0, 1, 2, 1, 0, 2])
      const indices = new Uint32Array([0, 1, 3, 4]) // codes: 0, 1, 1, 0

      const result = handleSummaryMessage({
        type: 'summarizeCategory',
        codes,
        indices,
        numCategories: 3,
        version: 1,
      })

      expect(result.type).toBe('categorySummary')
      if (result.type !== 'categorySummary') return
      expect(result.counts).toBeInstanceOf(Uint32Array)
      expect(result.counts.length).toBe(3)
      expect(result.counts[0]).toBe(2) // indices 0, 4
      expect(result.counts[1]).toBe(2) // indices 1, 3
      expect(result.counts[2]).toBe(0) // not selected
    })

    it('returns zeros for empty indices', () => {
      const codes = new Uint8Array([0, 1, 2])
      const indices = new Uint32Array([])

      const result = handleSummaryMessage({
        type: 'summarizeCategory',
        codes,
        indices,
        numCategories: 3,
        version: 5,
      })

      if (result.type !== 'categorySummary') return
      expect(result.counts[0]).toBe(0)
      expect(result.counts[1]).toBe(0)
      expect(result.counts[2]).toBe(0)
    })

    it('echoes version in response', () => {
      const result = handleSummaryMessage({
        type: 'summarizeCategory',
        codes: new Uint8Array([0]),
        indices: new Uint32Array([0]),
        numCategories: 1,
        version: 42,
      })
      expect(result.version).toBe(42)
    })
  })

  describe('summarizeExpression', () => {
    it('computes correct stats', () => {
      // values at indices: 1, 2, 3, 4, 5
      const expression = new Float32Array([1, 2, 3, 4, 5])
      const indices = new Uint32Array([0, 1, 2, 3, 4])

      const result = handleSummaryMessage({
        type: 'summarizeExpression',
        expression,
        indices,
        numBins: 5,
        version: 1,
      })

      expect(result.type).toBe('expressionSummary')
      if (result.type !== 'expressionSummary') return
      expect(result.mean).toBeCloseTo(3, 5)
      expect(result.median).toBe(3)
      expect(result.std).toBeCloseTo(Math.sqrt(2), 5) // population std of [1,2,3,4,5]
      expect(result.min).toBe(1)
      expect(result.max).toBe(5)
      expect(result.bins).toBeInstanceOf(Uint32Array)
      expect(result.bins.length).toBe(5)
      expect(result.binEdges).toBeInstanceOf(Float32Array)
      expect(result.binEdges.length).toBe(6)
    })

    it('handles single value', () => {
      const expression = new Float32Array([7, 0, 0])
      const indices = new Uint32Array([0])

      const result = handleSummaryMessage({
        type: 'summarizeExpression',
        expression,
        indices,
        numBins: 4,
        version: 1,
      })

      if (result.type !== 'expressionSummary') return
      expect(result.mean).toBe(7)
      expect(result.median).toBe(7)
      expect(result.std).toBe(0)
      expect(result.min).toBe(7)
      expect(result.max).toBe(7)
      // All in first bin
      expect(result.bins[0]).toBe(1)
      for (let i = 1; i < 4; i++) {
        expect(result.bins[i]).toBe(0)
      }
    })

    it('handles empty indices', () => {
      const expression = new Float32Array([1, 2, 3])
      const indices = new Uint32Array([])

      const result = handleSummaryMessage({
        type: 'summarizeExpression',
        expression,
        indices,
        numBins: 3,
        version: 1,
      })

      if (result.type !== 'expressionSummary') return
      expect(result.mean).toBe(0)
      expect(result.median).toBe(0)
      expect(result.std).toBe(0)
      expect(result.min).toBe(0)
      expect(result.max).toBe(0)
      for (let i = 0; i < 3; i++) {
        expect(result.bins[i]).toBe(0)
      }
    })

    it('computes correct median for even count', () => {
      // values at indices: 1, 2, 3, 4
      const expression = new Float32Array([1, 2, 3, 4])
      const indices = new Uint32Array([0, 1, 2, 3])

      const result = handleSummaryMessage({
        type: 'summarizeExpression',
        expression,
        indices,
        numBins: 4,
        version: 1,
      })

      if (result.type !== 'expressionSummary') return
      expect(result.median).toBe(2.5)
    })

    it('echoes version in response', () => {
      const result = handleSummaryMessage({
        type: 'summarizeExpression',
        expression: new Float32Array([1]),
        indices: new Uint32Array([0]),
        numBins: 1,
        version: 99,
      })
      expect(result.version).toBe(99)
    })
  })

  describe('summarizeExpressionByCategory', () => {
    it('computes per-category mean expression and fraction expressing', () => {
      // 6 cells, 3 categories (0, 1, 2)
      // expression: cat0=[0, 4], cat1=[0, 0], cat2=[2, 6]
      // baseline min = 0
      // cat0: mean=2, expressing=1/2=0.5 (only val 4 > 0)
      // cat1: mean=0, expressing=0/2=0
      // cat2: mean=4, expressing=2/2=1.0
      const codes = new Uint8Array([0, 0, 1, 1, 2, 2])
      const expression = new Float32Array([0, 4, 0, 0, 2, 6])
      const indices = new Uint32Array([0, 1, 2, 3, 4, 5])

      const result = handleSummaryMessage({
        type: 'summarizeExpressionByCategory',
        expression,
        codes,
        numCategories: 3,
        indices,
        version: 1,
      })

      expect(result.type).toBe('expressionByCategorySummary')
      if (result.type !== 'expressionByCategorySummary') return
      expect(result.meanExpression).toBeInstanceOf(Float32Array)
      expect(result.fractionExpressing).toBeInstanceOf(Float32Array)
      expect(result.meanExpression.length).toBe(3)

      expect(result.meanExpression[0]).toBeCloseTo(2, 5)
      expect(result.meanExpression[1]).toBeCloseTo(0, 5)
      expect(result.meanExpression[2]).toBeCloseTo(4, 5)

      expect(result.fractionExpressing[0]).toBeCloseTo(0.5, 5)
      expect(result.fractionExpressing[1]).toBeCloseTo(0, 5)
      expect(result.fractionExpressing[2]).toBeCloseTo(1.0, 5)
    })

    it('handles log-normalized data with negative baseline', () => {
      const codes = new Uint8Array([0, 0, 0])
      const expression = new Float32Array([-1, -1, 2.5])
      const indices = new Uint32Array([0, 1, 2])

      const result = handleSummaryMessage({
        type: 'summarizeExpressionByCategory',
        expression,
        codes,
        numCategories: 1,
        indices,
        version: 1,
      })

      if (result.type !== 'expressionByCategorySummary') return
      // baseline = -1, only index 2 is expressing
      expect(result.fractionExpressing[0]).toBeCloseTo(1 / 3, 5)
      expect(result.meanExpression[0]).toBeCloseTo((-1 + -1 + 2.5) / 3, 5)
    })

    it('handles subset of indices', () => {
      const codes = new Uint8Array([0, 1, 0, 1])
      const expression = new Float32Array([0, 5, 3, 10])
      const indices = new Uint32Array([1, 2])

      const result = handleSummaryMessage({
        type: 'summarizeExpressionByCategory',
        expression,
        codes,
        numCategories: 2,
        indices,
        version: 1,
      })

      if (result.type !== 'expressionByCategorySummary') return
      // baseline = min(5, 3) = 3
      // cat0: index 2, val=3, 3>3=false → frac=0, mean=3
      // cat1: index 1, val=5, 5>3=true → frac=1, mean=5
      expect(result.meanExpression[0]).toBeCloseTo(3, 5)
      expect(result.meanExpression[1]).toBeCloseTo(5, 5)
      expect(result.fractionExpressing[0]).toBeCloseTo(0, 5)
      expect(result.fractionExpressing[1]).toBeCloseTo(1, 5)
    })

    it('returns zeros for empty indices', () => {
      const result = handleSummaryMessage({
        type: 'summarizeExpressionByCategory',
        expression: new Float32Array([1, 2]),
        codes: new Uint8Array([0, 1]),
        numCategories: 2,
        indices: new Uint32Array([]),
        version: 1,
      })

      if (result.type !== 'expressionByCategorySummary') return
      expect(result.meanExpression[0]).toBe(0)
      expect(result.meanExpression[1]).toBe(0)
      expect(result.fractionExpressing[0]).toBe(0)
      expect(result.fractionExpressing[1]).toBe(0)
    })

    it('echoes version in response', () => {
      const result = handleSummaryMessage({
        type: 'summarizeExpressionByCategory',
        expression: new Float32Array([1]),
        codes: new Uint8Array([0]),
        numCategories: 1,
        indices: new Uint32Array([0]),
        version: 77,
      })
      expect(result.version).toBe(77)
    })
  })
})
