/**
 * Simple Metrics Collection
 *
 * Lightweight metrics for timing and counting.
 * Can be swapped for Prometheus/DataDog later.
 */

export interface TimingMetric {
  name: string;
  durationMs: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface CounterMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface MetricsSummary {
  timings: TimingMetric[];
  counters: CounterMetric[];
  totalDurationMs: number;
}

/**
 * Metrics collector for a single request/operation
 */
export class MetricsCollector {
  private timings: TimingMetric[] = [];
  private counters: Map<string, CounterMetric> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Record a timing measurement
   */
  timing(name: string, durationMs: number, labels?: Record<string, string>): void {
    this.timings.push({
      name,
      durationMs,
      timestamp: Date.now(),
      labels,
    });
  }

  /**
   * Time an async operation
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.timing(name, Date.now() - start, { ...labels, status: "success" });
      return result;
    } catch (error) {
      this.timing(name, Date.now() - start, { ...labels, status: "error" });
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = `${name}:${JSON.stringify(labels || {})}`;
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, {
        name,
        value,
        timestamp: Date.now(),
        labels,
      });
    }
  }

  /**
   * Get summary of all collected metrics
   */
  getSummary(): MetricsSummary {
    return {
      timings: [...this.timings],
      counters: Array.from(this.counters.values()),
      totalDurationMs: Date.now() - this.startTime,
    };
  }

  /**
   * Get timings as a simple object for response metadata
   */
  getTimingsObject(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const t of this.timings) {
      result[t.name] = t.durationMs;
    }
    result.total = Date.now() - this.startTime;
    return result;
  }

  /**
   * Log metrics summary
   */
  logSummary(prefix: string = ""): void {
    const summary = this.getSummary();
    console.log(
      `${prefix} Metrics: total=${summary.totalDurationMs}ms, ` +
        `stages=${this.timings.map((t) => `${t.name}=${t.durationMs}ms`).join(", ")}`
    );
  }
}

/**
 * Global metrics registry (for production monitoring)
 */
class MetricsRegistry {
  private histograms: Map<string, number[]> = new Map();

  record(name: string, value: number): void {
    const existing = this.histograms.get(name) || [];
    existing.push(value);
    // Keep last 1000 samples
    if (existing.length > 1000) {
      existing.shift();
    }
    this.histograms.set(name, existing);
  }

  getStats(name: string): { count: number; avg: number; p50: number; p95: number; p99: number } | null {
    const values = this.histograms.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      avg: sorted.reduce((a, b) => a + b, 0) / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const result: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const name of this.histograms.keys()) {
      result[name] = this.getStats(name);
    }
    return result;
  }
}

export const globalMetrics = new MetricsRegistry();

/**
 * Create a new metrics collector for a request
 */
export function createMetrics(): MetricsCollector {
  return new MetricsCollector();
}
