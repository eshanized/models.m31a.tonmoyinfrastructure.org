import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from './index';
import {
  modelObservations,
  statusTransitions,
  monitoringCycles,
  ingestionAudits,
  NewModelObservation,
  NewMonitoringCycle,
  NewIngestionAudit,
  ModelObservation,
  MonitoringCycle,
  StatusTransition,
} from './schema';
import { deriveModelStatus, ClassifiedStatusResult } from '../status/classifier';

export class StatusRepository {
  /**
   * Check if database connection is available
   */
  static isAvailable(): boolean {
    return isDatabaseConfigured();
  }

  /**
   * Record new synthetic probe observations
   */
  static async recordObservations(observations: NewModelObservation[]): Promise<number> {
    const db = getDb();
    if (!db || observations.length === 0) return 0;

    const inserted = await db.insert(modelObservations).values(observations).returning({ id: modelObservations.id });
    return inserted.length;
  }

  /**
   * Record a monitoring cycle run
   */
  static async recordCycle(cycle: NewMonitoringCycle): Promise<void> {
    const db = getDb();
    if (!db) return;

    await db.insert(monitoringCycles).values(cycle).onConflictDoUpdate({
      target: monitoringCycles.id,
      set: cycle,
    });
  }

  /**
   * Record an ingestion audit entry
   */
  static async recordAudit(audit: NewIngestionAudit): Promise<void> {
    const db = getDb();
    if (!db) return;

    await db.insert(ingestionAudits).values(audit);
  }

  /**
   * Retrieve observations for a given model
   */
  static async getObservationsForModel(modelId: string, limit = 50): Promise<ModelObservation[]> {
    const db = getDb();
    if (!db) return [];

    try {
      return await db
        .select()
        .from(modelObservations)
        .where(eq(modelObservations.modelId, modelId))
        .orderBy(desc(modelObservations.timestamp))
        .limit(limit);
    } catch (err) {
      console.warn(`Could not read observations for ${modelId}:`, (err as Error).message);
      return [];
    }
  }

  /**
   * Get latest observations for multiple models
   */
  static async getLatestObservationsForModels(
    modelIds: string[],
    perModelLimit = 10
  ): Promise<Map<string, ModelObservation[]>> {
    const map = new Map<string, ModelObservation[]>();
    for (const id of modelIds) {
      map.set(id, []);
    }

    const db = getDb();
    if (!db || modelIds.length === 0) return map;

    try {
      // Query recent observations for these models
      const results = await db
        .select()
        .from(modelObservations)
        .where(inArray(modelObservations.modelId, modelIds))
        .orderBy(desc(modelObservations.timestamp))
        .limit(modelIds.length * perModelLimit);

      for (const row of results) {
        const arr = map.get(row.modelId);
        if (arr && arr.length < perModelLimit) {
          arr.push(row);
        }
      }
    } catch (err) {
      console.warn('Could not batch read observations:', (err as Error).message);
    }

    return map;
  }

  /**
   * Retrieve recent monitoring cycles
   */
  static async getRecentCycles(limit = 10): Promise<MonitoringCycle[]> {
    const db = getDb();
    if (!db) return [];

    try {
      return await db
        .select()
        .from(monitoringCycles)
        .orderBy(desc(monitoringCycles.startedAt))
        .limit(limit);
    } catch (err) {
      console.warn('Could not read monitoring cycles:', (err as Error).message);
      return [];
    }
  }

  /**
   * Retrieve recent status transitions
   */
  static async getRecentTransitions(limit = 20): Promise<StatusTransition[]> {
    const db = getDb();
    if (!db) return [];

    try {
      return await db
        .select()
        .from(statusTransitions)
        .orderBy(desc(statusTransitions.timestamp))
        .limit(limit);
    } catch (err) {
      console.warn('Could not read status transitions:', (err as Error).message);
      return [];
    }
  }
}
