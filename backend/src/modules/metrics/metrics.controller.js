'use strict';
const { collectMetrics } = require('./metrics.service');

async function metricsHandler(req, res) {
  try {
    const metrics = await collectMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (err) {
    res.status(500).send('# Error collecting metrics');
  }
}

module.exports = { metricsHandler };
