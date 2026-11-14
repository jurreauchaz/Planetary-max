import { z } from 'zod';

const sovereignDid = z.string().regex(/^DID-[A-Z0-9-]+$/, 'Invalid Sovereign DID format');
const artifactUri = z.string().url('Invalid artifact URI').refine(
  (value) => value.startsWith('https://') || value.startsWith('ipfs://') || value.startsWith('ar://'),
  'Artifact URI must use HTTPS, IPFS, or Arweave',
);

export const ArtMintSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  medium: z.enum(['CHARCOAL_ON_CANVAS', 'MIXED_MEDIA_COLLAGE', 'DIGITAL_CANVAS', 'MANUSCRIPT']),
  dimensions: z.string().max(50).optional(),
  editionNumber: z.number().int().positive().default(1),
  editionTotal: z.number().int().positive().default(1),
  doctrineTag: z.string().max(100).default('JURREAUISM'),
  originatorId: sovereignDid,
  artifactUri,
  rawPayloadString: z.string().min(1, 'Payload content required').max(50_000, 'Payload exceeds size limit'),
  royaltyBps: z.number().int().min(0).max(5_000).default(1_000),
}).superRefine((value, context) => {
  if (value.editionNumber > value.editionTotal) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['editionTotal'], message: 'Must be greater than or equal to editionNumber' });
  }
});

export const ChessMintSchema = z.object({
  title: z.string().min(1).max(200),
  whitePlayerId: sovereignDid,
  blackPlayerId: sovereignDid,
  ecoCode: z.string().regex(/^[A-E][0-9]{2}$/, 'Invalid ECO code format').optional(),
  openingName: z.string().max(100).optional(),
  result: z.enum(['1-0', '0-1', '1/2-1/2', '*']),
  pgnContent: z.string().min(1).max(10_000),
  originatorId: sovereignDid,
  artifactUri,
  royaltyBps: z.number().int().min(0).max(5_000).default(500),
});

export const SportsMintSchema = z.object({
  title: z.string().min(1).max(200),
  league: z.enum(['NFL', 'NBA', 'WNBA', 'MLB', 'SOCCER', 'MMA', 'COLLEGIATE', 'ESPORTS']),
  matchExternalId: z.string().min(1).max(100),
  artifactCategory: z.enum(['PREDICTION_MODEL', 'TELEMETRY_FEED', 'NIL_CONTRACT', 'PERFORMANCE_PROOF']),
  oracleConsensusJson: z.string().min(2, 'Valid JSON oracle consensus required').max(50_000).refine((value) => {
    try { return Array.isArray(JSON.parse(value)); } catch { return false; }
  }, 'Oracle consensus must be a JSON array'),
  seasonYear: z.number().int().min(2020).max(2035),
  rawPayloadString: z.string().min(1).max(50_000),
  originatorId: sovereignDid,
  artifactUri,
  royaltyBps: z.number().int().min(0).max(5_000).default(1_000),
});

export function validatePayload<T>(schema: z.ZodType<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return { success: false, error: errorMessages };
  }
  return { success: true, data: result.data };
}
