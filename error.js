const codes = require('http-status-codes');
const undefsafe = require('undefsafe');

//eslint-disable-next-line no-unused-vars
module.exports = (error, req, res, next) => {
  let message = null;
  let n;

  if (typeof error === 'number') {
    n = error;
    error = new Error(codes.getStatusText(error));
    error.code = n;
  }
  message = error.message || codes.getStatusText(n);

  // Ensure we send the correct type of http status, if there's a real error
  // then the `error.code` will be a string, override with 500
  // 500, General error:
  let status = error.code || 500;
  if (typeof status === 'string') {
    status = 500;
  }

  // prepare the error page shown to the user
  const e = {
    message,
    status,
  };

  let msg = `${status} ${req.url} `;
  if (req.user) {
    msg += `${req.user.username} `;
  }
  msg += message;

  if (process.env.NODE_ENV !== 'test') {
    console.error(
      '%s %s %s',
      req.method.toUpperCase(),
      req.url,
      (error.stack || msg)
        .split('\n')
        .filter(_ => !_.includes('node_modules'))
        .join('\n')
    );
  }

  res.status(status).json(e);
};
