import Joi from 'joi';
import { stripHtml } from 'string-strip-html';

const validator = (schema) => (payload) => {
  const result = schema.validate(payload);

  for (const [key, value] of Object.entries(payload)) {
    payload[key] = value && typeof value === 'string' ? stripHtml(value.trim()).result : null;
  }

  return result.error ? {error: result.error.details[0].message} : payload;
};

const participantStoreSchema = Joi.object({
  name: Joi.string().required(),
});

const messageStoreSchema = Joi.object({
  to: Joi.string().required(),
  text: Joi.string().required(),
  type: Joi.string().valid('message', 'private_message').required(),
});

export const validateParticipantStoreSchema = validator(participantStoreSchema);
export const validateMessageStoreSchema = validator(messageStoreSchema);