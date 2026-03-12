// Logger structuré — remplace les console.log/error directs
// En production : JSON sur stdout pour faciliter la collecte (Datadog, Logtail, etc.)
// En développement : format lisible avec couleurs

const IS_PROD = process.env.NODE_ENV === 'production';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? (IS_PROD ? LEVELS.info : LEVELS.debug);

const COLORS = {
  debug: '\x1b[36m', // cyan
  info:  '\x1b[32m', // green
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

const formatDevMessage = (level, message, meta) => {
  const ts = new Date().toISOString();
  const color = COLORS[level] || '';
  const reset = COLORS.reset;
  const metaStr = meta && Object.keys(meta).length > 0
    ? ' ' + JSON.stringify(meta)
    : '';
  return `${color}[${level.toUpperCase()}]${reset} ${ts} ${message}${metaStr}`;
};

const formatProdMessage = (level, message, meta) => {
  const entry = { level, time: Date.now(), msg: message };
  if (meta && Object.keys(meta).length > 0) {
    // Masquer les champs sensibles
    const safe = { ...meta };
    for (const key of ['password', 'token', 'secret', 'authorization', 'cookie']) {
      if (key in safe) safe[key] = '[REDACTED]';
    }
    Object.assign(entry, safe);
  }
  return JSON.stringify(entry);
};

const log = (level, message, meta = {}) => {
  if (LEVELS[level] < MIN_LEVEL) return;

  const output = IS_PROD
    ? formatProdMessage(level, message, meta)
    : formatDevMessage(level, message, meta);

  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
};

const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info:  (message, meta) => log('info',  message, meta),
  warn:  (message, meta) => log('warn',  message, meta),
  error: (message, meta) => {
    // Si un Error est passé en meta, extraire le stack
    if (meta instanceof Error) {
      return log('error', message, { error: meta.message, stack: meta.stack });
    }
    if (meta && meta.err instanceof Error) {
      return log('error', message, { ...meta, error: meta.err.message, stack: meta.err.stack, err: undefined });
    }
    return log('error', message, meta);
  },
};

module.exports = logger;
