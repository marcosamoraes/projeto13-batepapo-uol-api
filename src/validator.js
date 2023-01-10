import Joi from 'joi';
import { stripHtml } from 'string-strip-html';

const validator = (schema) => (payload) => {
  const result = schema.validate(payload);

  for (const [key, value] of Object.entries(payload)) {
    payload[key] = value ? stripHtml(value.trim()).result : null;
  }

  return result.error ? {error: result.error.details[0].message} : payload;
};

const participantsStoreSchema = Joi.object({
  name: Joi.string().required(),
});

export const validateParticipantStoreSchema = validator(participantsStoreSchema);