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
})(window);