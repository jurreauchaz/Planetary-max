import { z } from 'zod';

// Accept canonical runtime DIDs and uppercase legacy identifiers. Values are
// normalized after validation so downstream storage uses a consistent form.
const SovereignDIDRegex = /^(did:[a-z0-9-]+:[a-z0-9-]+|DID-[A-Z0-9-]+)$/;
const ArtifactUriRegex = /^(https?:\/\/|ipfs:\/\/|ar:\/\/)[^\s]+$/;

const sovereignDid = z.string().regex(SovereignDIDRegex, 'Invalid Sovereign DID format');
const artifactUri = z.string().regex(ArtifactUriRegex, 'Invalid artifact URI');

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
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['editionTotal'],
      message: 'Must be greater than or equal to editionNumber',
    });
  }
}).transform((data) => ({
  ...data,
  originatorId: data.originatorId.toLowerCase(),
}));

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
}).transform((data) => ({
  ...data,
  whitePlayerId: data.whitePlayerId.toLowerCase(),
  blackPlayerId: data.blackPlayerId.toLowerCase(),
  originatorId: data.originatorId.toLowerCase(),
}));

export const SportsMintSchema = z.object({
  title: z.string().min(1).max(200),
  league: z.enum(['NFL', 'NBA', 'WNBA', 'MLB', 'SOCCER', 'MMA', 'COLLEGIATE', 'ESPORTS']),
  matchExternalId: z.string().min(1).max(100),
  artifactCategory: z.enum(['PREDICTION_MODEL', 'TELEMETRY_FEED', 'NIL_CONTRACT', 'PERFORMANCE_PROOF']),
  oracleConsensusJson: z.string().min(2).max(50_000).refine((value) => {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) &&
        ('consensus' in parsed || 'signatures' in parsed);
    } catch {
      return false;
    }
  }, 'Invalid or unverified oracle consensus JSON structure'),
  seasonYear: z.number().int().min(2020).max(2035),
  rawPayloadString: z.string().min(1).max(50_000),
  originatorId: sovereignDid,
  artifactUri,
  royaltyBps: z.number().int().min(0).max(5_000).default(1_000),
}).transform((data) => ({
  ...data,
  originatorId: data.originatorId.toLowerCase(),
}));

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
