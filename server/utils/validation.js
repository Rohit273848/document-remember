import { AppError } from './errors.js';
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const { value, error } = schema.validate(req[source], { abortEarly: false, convert: true, stripUnknown: true });
  if (error) return next(new AppError(error.details.map((detail) => detail.message).join(', '), 400, 'VALIDATION_ERROR'));
  req[source] = value; next();
};
