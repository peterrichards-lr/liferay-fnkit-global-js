(function(global) {
  const BatcherRegistry = new Map();

  function createBatchedFetcher(apiHandler, {
    debounceTime = 100,
    cacheTTL = 0,
    retries = 2,
    retryDelay = 200,
    idToKey = id => id.toString(),
    logger = () => {},
    batchable = true
  } = {}) {
    const signature = apiHandler.toString() + debounceTime + cacheTTL + retries + retryDelay + batchable;
    if (BatcherRegistry.has(signature)) return BatcherRegistry.get(signature);

    const queue = new Map();
    const cache = new Map();
    let timer = null;

    const fetcher = function fetchBatched(id) {
      const key = idToKey(id);

      if (cacheTTL > 0 && cache.has(key)) {
        const { value, expiresAt } = cache.get(key);
        if (Date.now() < expiresAt) {
          logger('info', 'cache.hit', { key, value });
          return Promise.resolve(value);
        } else {
          cache.delete(key);
          logger('debug', 'cache.expired', { key });
        }
      }

      return new Promise((resolve, reject) => {
        if (!queue.has(key)) queue.set(key, []);
        queue.get(key).push({ resolve, reject });

        logger('debug', 'queue.added', { key });

        if (timer) clearTimeout(timer);
        timer = setTimeout(flushQueue, debounceTime);
      });
    };

    async function flushQueue() {
      const keys = Array.from(queue.keys());
      const pending = new Map(queue);
      queue.clear();

      logger('info', 'batch.start', { keys });

      try {
        const handlerToUse = batchable ? apiHandler : wrapNonBatchable(apiHandler);
        const results = await callWithRetries(() => handlerToUse(keys.map(parseKey)), retries, retryDelay);
        logger('debug', 'batch.success', { results });

        for (const [key, resolvers] of pending) {
          if (results && Object.prototype.hasOwnProperty.call(results, key)) {
            if (cacheTTL > 0) {
              cache.set(key, {
                value: results[key],
                expiresAt: Date.now() + cacheTTL
              });
              logger('debug', 'cache.set', { key, value: results[key] });
            }
            resolvers.forEach(({ resolve }) => resolve(results[key]));
          } else {
            const err = new Error(`No result for ID: ${key}`);
            logger('warn', 'batch.missing', { key });
            resolvers.forEach(({ reject }) => reject(err));
          }
        }
      } catch (error) {
        logger('error', 'batch.error', { error });
        for (const resolvers of pending.values()) {
          resolvers.forEach(({ reject }) => reject(error));
        }
      }
    }

    async function callWithRetries(fn, maxRetries, delay) {
      for (let i = 0; i <= maxRetries; i++) {
        try {
          return await fn();
        } catch (err) {
          if (i === maxRetries) throw err;
          const wait = delay * Math.pow(2, i);
          logger('warn', 'retry.attempt', { attempt: i + 1, delay: wait });
          await new Promise(res => setTimeout(res, wait));
        }
      }
    }

    function parseKey(key) {
      return /^\d+$/.test(key) ? Number(key) : key;
    }

    function wrapNonBatchable(singleHandler) {
      return async function(ids) {
        const entries = await Promise.all(ids.map(async id => {
          const result = await singleHandler(id);
          return [id.toString(), result];
        }));
        return Object.fromEntries(entries);
      };
    }

    BatcherRegistry.set(signature, fetcher);
    return fetcher;
  }

  global.Liferay = global.Liferay || {};
  global.Liferay.FnKit = global.Liferay.FnKit || {};
  global.Liferay.FnKit.createBatchedFetcher = createBatchedFetcher;
})(window);