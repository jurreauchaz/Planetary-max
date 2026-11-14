export interface ResearchJob { id: string; question: string; createdAt: number }

/** Creates a validated research job descriptor; execution/storage is supplied by the host. */
export function createResearchJob(question: string): ResearchJob {
  const normalized = question.trim();
  if (normalized.length < 1 || normalized.length > 2000) throw new Error('Research question must be 1–2000 characters');
  return { id: crypto.randomUUID(), question: normalized, createdAt: Date.now() };
}
