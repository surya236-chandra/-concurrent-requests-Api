// validate.js - Zod validation middleware
// Catches bad or malformed inputs BEFORE reaching our business logic

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Format readable errors: e.g. "email: Invalid email address"
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    // Replace req.body with the sanitized/parsed data from Zod
    req.body = result.data;
    next();
  };
}
