import { z } from 'zod'

export const exportFatturapaSchema = z.object({
  tipoDocumento: z.enum(['TD01', 'TD04', 'TD05', 'TD24']).default('TD01'),
})

export const updateStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'GENERATED',
    'EXPORTED',
    'UPLOADED_TO_SDI',
    'DELIVERED',
    'ACCEPTED',
    'REJECTED',
    'DECOURSA',
  ]),
  note: z.string().max(2000).optional(),
  sdiIdentificativo: z.string().max(100).optional(),
})

export const importEsitoSchema = z.object({
  esitoXml: z.string().min(1, 'XML esito obbligatorio'),
})

export const creditNoteSchema = z.object({
  reason: z.string().min(1, 'Motivo nota di credito obbligatorio').max(500),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .min(1, 'Almeno una voce obbligatoria')
    .optional(),
})
