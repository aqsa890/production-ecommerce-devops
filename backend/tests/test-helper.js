const { EventEmitter } = require('events');

/**
 * Socket-free HTTP request dispatcher for Express applications.
 * Executes express middleware and route pipeline in-memory without opening TCP ports.
 */
function request(app) {
  const makeRequest = (method, url, body = null) => {
    return new Promise((resolve) => {
      const req = new EventEmitter();
      req.method = method;
      req.url = url;
      req.headers = {
        'content-type': 'application/json',
        'accept': 'application/json',
      };
      req.socket = new EventEmitter();
      if (body) {
        req.body = body; // Pre-populate body for express
      }

      const res = new EventEmitter();
      res.statusCode = 200;
      res._headers = {};
      res.setHeader = (k, v) => {
        res._headers[k.toLowerCase()] = v;
      };
      res.getHeader = (k) => res._headers[k.toLowerCase()];

      let responseData = '';
      res.write = (chunk) => {
        if (chunk) responseData += chunk.toString();
        return true;
      };

      res.end = (chunk) => {
        if (chunk) responseData += chunk.toString();
        res.emit('finish');

        let parsedBody = null;
        try {
          parsedBody = responseData ? JSON.parse(responseData) : null;
        } catch (_) {
          parsedBody = responseData;
        }

        resolve({
          status: res.statusCode,
          text: responseData,
          body: parsedBody,
          headers: res._headers,
        });
      };

      app.handle(req, res);

      process.nextTick(() => {
        if (body) {
          req.emit('data', Buffer.from(JSON.stringify(body)));
        }
        req.emit('end');
      });
    });
  };

  return {
    get: (url) => makeRequest('GET', url),
    post: (url) => ({
      send: (data) => makeRequest('POST', url, data),
    }),
  };
}

module.exports = request;
