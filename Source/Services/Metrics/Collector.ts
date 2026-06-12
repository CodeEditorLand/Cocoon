/**
 * @module MetricsCollector
 * @description Minimal metrics collection stub for Cocoon services.
 */

export class MetricsCollector {

	private readonly Metrics: Map<string, number> = new Map(;

	Record(Name: string, Value: number): void {
		this.Metrics.set(Name, (this.Metrics.get(Name) || 0) + Value;
	}

	Get(Name: string): number {
		return this.Metrics.get(Name) || 0;
	}

	GetAll(): Record<string, number> {
		return Object.fromEntries(this.Metrics;
	}

	Reset(): void {
		this.Metrics.clear(;
	}
}
