type Write = () => Promise<unknown>;

/** Keeps failed writes in order for a retry. Operations must be idempotent:
 * an IndexedDB commit can finish before a later part of the operation fails. */
export class PendingWrites {
  private pending: Write[] = [];
  private flushing: Promise<void> | null = null;

  add(operation: Write): Promise<void> {
    this.pending.push(operation);
    return this.flush();
  }

  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = this.drain().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async drain(): Promise<void> {
    while (this.pending.length) {
      await this.pending[0]();
      this.pending.shift();
    }
  }
}
