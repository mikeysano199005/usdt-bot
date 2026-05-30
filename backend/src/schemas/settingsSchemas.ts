import { z } from 'zod';

export const UpdateSettingsSchema = z.object({
  exchange_rate: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid number').optional(),
  upi_id: z.string().max(100).optional(),
  bank_account_name: z.string().max(100).optional(),
  bank_account_number: z.string().max(30).optional(),
  bank_ifsc: z.string().max(20).optional(),
  bank_name: z.string().max(100).optional(),
  support_contact: z.string().max(100).optional(),
  support_response_hours: z.string().regex(/^\d+$/).optional(),
});
