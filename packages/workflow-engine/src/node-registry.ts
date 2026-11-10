/**
 * Node Registry — Phase 3
 *
 * Maps node type strings → NodeExecutor instances.
 * Executors are registered at startup by the host application.
 */

import type { NodeExecutor } from './types.js';

export class NodeRegistry {
  private readonly executors = new Map<string, NodeExecutor>();

  register(executor: NodeExecutor): void {
    if (this.executors.has(executor.nodeType)) {
      throw new Error(`NodeExecutor already registered for type: ${executor.nodeType}`);
    }
    this.executors.set(executor.nodeType, executor);
  }

  get(type: string): NodeExecutor {
    const executor = this.executors.get(type);
    if (!executor) {
      throw new Error(
        `No NodeExecutor registered for node type: "${type}". ` +
          `Registered types: [${[...this.executors.keys()].join(', ')}]`
      );
    }
    return executor;
  }

  has(type: string): boolean {
    return this.executors.has(type);
  }

  registeredTypes(): string[] {
    return [...this.executors.keys()];
  }
}
