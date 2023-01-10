import Joi from 'joi';

const validator = (schema) => (payload) => {
  const result = schema.validate(payload);

  return result.error ? {error: result.error.details[0].message} : payload;
};

const participantsStoreSchema = Joi.object({
  name: Joi.string().required(),
});

export const validateParticipantStoreSchema = validator(participantsStoreSchema);