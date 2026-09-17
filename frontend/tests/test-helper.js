const http = require('http');
const { Socket } = require('net');

/**
 * Robust in-memory HTTP dispatcher for Express apps.
 * Works seamlessly with express.static, res.sendFile, CORS, and json streams.
 */
function request(app) {
  const makeRequest = (method, url, body = null) => {
    return new Promise((resolve) => {
      const socket = new Socket();
      const req = new http.IncomingMessage(socket);
      req.method = method;
      req.url = url;
      req.headers = {
        host: 'localhost',
        'content-type': 'application/json',
        accept: '*/*',
      };

      const res = new http.ServerResponse(req);
      res.assignSocket(socket);

      let responseText = '';
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;

        let parsedBody = null;
        try {
          parsedBody = responseText ? JSON.parse(responseText) : null;
        } catch (_) {
          parsedBody = responseText;
        }

        resolve({
          status: res.statusCode,
          text: responseText,
          body: parsedBody,
          headers: res.getHeaders(),
        });
      };

      // Intercept writes on socket (where Node's http server pipes data)
      socket.write = (chunk) => {
        if (chunk) responseText += chunk.toString();
        return true;
      };

      socket.end = (chunk) => {
        if (chunk) responseText += chunk.toString();
        finish();
      };

      res.write = (chunk) => {
        if (chunk) responseText += chunk.toString();
        return true;
      };

      res.end = (chunk) => {
        if (chunk) responseText += chunk.toString();
        finish();
      };

      if (body) {
        req.body = body;
      }

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
