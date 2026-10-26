import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

export const cacheMiddleware = (duration) => {
    return (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = req.originalUrl || req.url;
        
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            return res.json(JSON.parse(cachedResponse));
        } else {
            const originalJson = res.json;
            res.json = function(body) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const stringifiedBody = JSON.stringify(body);
                        cache.set(key, stringifiedBody, duration);
                    } catch(err) {
                        console.error("Cache stringify/set error:", err);
                    }
                }
                return originalJson.call(this, body);
            };
            next();
        }
    };
};

export const clearCache = (keyPattern) => {
    const keys = cache.keys();
    keys.forEach(key => {
        if (key.includes(keyPattern)) {
            cache.del(key);
        }
    });
};

export const clearCacheOnMutation = (...keyPatterns) => {
    return (req, res, next) => {
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                keyPatterns.forEach(pattern => clearCache(pattern));
            }
        });
        next();
    };
};
