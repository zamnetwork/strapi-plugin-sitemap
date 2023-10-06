'use strict';

const adminRoutes = require('./admin');
const serverRoutes = require('./server');

module.exports = {
  admin: adminRoutes,
  server: serverRoutes,
};
