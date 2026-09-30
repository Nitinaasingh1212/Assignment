import { validationResult } from 'express-validator';

export function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(400).json({
    message: 'Validation failed.',
    errors: result.array({ onlyFirstError: true }).map(({ path, msg, location }) => ({
      field: path,
      location,
      msg,
    })),
  });
}