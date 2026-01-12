import { z } from 'zod';

/**
 * Zod schema for telemetry validation
 */
export const telemetryInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().min(-1000).max(50000), // Reasonable altitude range
  battery: z.number().min(0).max(100),
  speed: z.number().min(0).max(500).optional(), // Max 500 m/s (1800 km/h)
  heading: z.number().min(0).max(360).optional(),
  flightMode: z.string().optional(),
  armed: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
  session_id: z.string().optional(),
  raw_data: z.record(z.any()).optional(),
});

export type TelemetryInputValidated = z.infer<typeof telemetryInputSchema>;

/**
 * Validate telemetry input with detailed error messages
 */
export function validateTelemetryInput(input: any): TelemetryInputValidated {
  try {
    return telemetryInputSchema.parse(input);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }
    throw error;
  }
}
