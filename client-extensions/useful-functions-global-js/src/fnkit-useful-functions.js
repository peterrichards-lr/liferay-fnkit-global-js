(function (global) {
  const getFontSizePixels = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

  const getCssVariable = (varName, root = document.documentElement) => {
    return getComputedStyle(root)
      .getPropertyValue(varName)
      .trim() || null;
  };

  const convertToPixel = (value, type = 'width', contextElement = document.documentElement) => {
    const unit = value.match(/[a-z%]+$/i)?.[0];
    const number = parseFloat(value);

    if (isNaN(number) || !unit) return null;

    switch (unit) {
      case 'px':
        return number;

      case 'rem':
        return number * fontSizePixels;

      case 'em':
        return number * parseFloat(getComputedStyle(contextElement).fontSize);

      case '%':
        const parent = contextElement.parentElement || document.documentElement;
        return (number / 100) * parseFloat(getComputedStyle(parent)[type]);

      case 'vw':
        return (number / 100) * window.innerWidth;

      case 'vh':
        return (number / 100) * window.innerHeight;

      default:
        return number;
    }
  }

  const convertCase = (str, targetCase) => {
    const words = str
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → separate
      .replace(/[-_]/g, ' ')                  // kebab-case / snake_case → separate
      .toLowerCase()
      .split(/\s+/);

    switch (targetCase) {
      case 'camel':
        return words
          .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
          .join('');
      case 'kebab':
        return words.join('-');
      case 'snake':
        return words.join('_');
      default:
        throw new Error(`Unsupported target case: ${targetCase}`);
    }
  }

  const debounce = (fn, delay) => {
    let id;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), delay);
    };
  };

  const getCookie = (cname) => {
    let name = cname + '=';
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return '';
  };

  const setCookie = (cname, cvalue, exdays) => {
    let expires = undefined;
    if (exdays) {
      const d = new Date();
      d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
      expires = 'expires=' + d.toUTCString();
    }
    if (expires)
      document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
    else document.cookie = cname + '=' + cvalue + ';path=/';
  };

  const uuidv4 = () => {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  };

  const getDataAttributes = (el) => {
    const dataAttributes = {};
    const re = /^data\-lfr\-js\-(.+)$/;
    const names = el.getAttributeNames();
    names.forEach((name) => {
      if (re.test(name)) {
        let propertyName = name.replace('data-lfr-js-', '');
        propertyName = convertCase(propertyName, 'camel');
        dataAttributes[propertyName] = el.getAttribute(name);
      }
    });
    return dataAttributes;
  };

  const toTitleCase = (str) => {
    return str.toLocaleLowerCase().replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
  }

  const jsonToHTML = (json) => {
    if (typeof json !== 'object' || json === null) {
      return `<span>${String(json)}</span>`;
    }

    if (Array.isArray(json)) {
      return `<ul>${json.map(item => `<li>${jsonToHTML(item)}</li>`).join('')}</ul>`;
    }

    return `
    <ul>
      ${Object.entries(json).map(([key, value]) => `
        <li>
          <strong>${key}:</strong> ${jsonToHTML(value)}
        </li>
      `).join('')}
    </ul>
  `;
  }

  const loadScript = (src, opts = {}) => {
    const { async = true, defer = false } = opts;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = src;
      script.async = async;
      script.defer = defer;

      script.onload = () => {
        cleanup();
        resolve();
      };
      script.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load script: ${src}`));
      };
      // IE<9 fallback
      script.onreadystatechange = () => {
        if (/loaded|complete/.test(script.readyState)) {
          cleanup();
          resolve();
        }
      };

      function cleanup() {
        script.onload = script.onerror = script.onreadystatechange = null;
      }

      (document.head || document.documentElement).appendChild(script);
    });
  }

  const loadCSS = (href, opts = {}) => {
    const { async = false } = opts;
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');

      if (async) {
        // preload then switch to stylesheet
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        link.onload = () => {
          link.onload = null;
          link.rel = 'stylesheet';
          resolve();
        };
        link.onerror = () => reject(new Error(`Failed to preload CSS: ${href}`));
      } else {
        // normal blocking CSS
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
      }

      document.head.appendChild(link);
    });
  }

  const flattenObject = (obj, prefix = '', res = {}) => {
    for (const [key, value] of Object.entries(obj)) {
      const nextKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flattenObject(value, nextKey, res);
      } else if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          if (item && typeof item === 'object') {
            flattenObject(item, `${nextKey}[${idx}]`, res);
          } else {
            res[`${nextKey}[${idx}]`] = item;
          }
        });
      } else {
        res[nextKey] = value;
      }
    }
    return res;
  }

  const flattenJSON = (data) => {
    if (Array.isArray(data)) {
      return data.map(item => (item && typeof item === 'object') ? flattenObject(item) : item);
    } else if (data && typeof data === 'object') {
      return flattenObject(data);
    }
    return data;
  }

  const pruneObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj
        .map(item => pruneObject(item))
        .filter(item => item !== null && item !== undefined && !(typeof item === 'object' && (Array.isArray(item) ? item.length === 0 : Object.keys(item).length === 0)));
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      Object.entries(obj).forEach(([key, value]) => {
        const pruned = pruneObject(value);
        if (pruned !== null && pruned !== undefined && !(typeof pruned === 'string' && pruned === '') && !(typeof pruned === 'object' && (Array.isArray(pruned) ? pruned.length === 0 : Object.keys(pruned).length === 0))) {
          result[key] = pruned;
        }
      });
      return result;
    }
    return obj;
  }

  const collectionsNameToKey = (name) => name?.toLowerCase().replace(/\s+/g, '-');

  const collectionsConvertValue = (rawData, dataType) => {
    if (rawData == null) return null;
    switch (dataType) {
      case 'string': return String(rawData);
      case 'number': {
        const num = Number(rawData);
        return isNaN(num) ? null : num;
      }
      case 'boolean': return rawData === 'true' || rawData === true;
      case 'geolocation': return rawData; // expected { latitude, longitude }
      case 'date': return new Date(rawData);
      default: return rawData;
    }
  }


  global.Liferay = global.Liferay || {};
  global.Liferay.FnKit = global.Liferay.FnKit || {};
  global.Liferay.FnKit.getFontSizePixels = getFontSizePixels;
  global.Liferay.FnKit.getCssVariable = getCssVariable;
  global.Liferay.FnKit.convertToPixel = convertToPixel;
  global.Liferay.FnKit.convertCase = convertCase;
  global.Liferay.FnKit.debounce = debounce;
  global.Liferay.FnKit.getCookie = getCookie;
  global.Liferay.FnKit.setCookie = setCookie;
  global.Liferay.FnKit.uuidv4 = uuidv4;
  global.Liferay.FnKit.getDataAttributes = getDataAttributes;
  global.Liferay.FnKit.toTitleCase = toTitleCase;
  global.Liferay.FnKit.jsonToHTML = jsonToHTML;
  global.Liferay.FnKit.loadScript = loadScript;
  global.Liferay.FnKit.loadCSS = loadCSS;
  global.Liferay.FnKit.flattenObject = flattenObject;
  global.Liferay.FnKit.flattenJSON = flattenJSON;
  global.Liferay.FnKit.pruneObject = pruneObject;

  global.Liferay.FnKit.Liferay = global.Liferay.FnKit.Liferay || {};
  global.Liferay.FnKit.Liferay.Collections.nameToKey = collectionsNameToKey;
  global.Liferay.FnKit.Liferay.Collections.convertValue = collectionsConvertValue;
})(window);