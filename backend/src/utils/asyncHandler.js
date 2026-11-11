// Wraps an async controller so rejected promises are forwarded to the error middleware
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
