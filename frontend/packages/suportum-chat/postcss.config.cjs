module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-prefix-selector': {
      prefix: '.suportum-root',
      transform(prefix, selector, prefixedSelector) {
        // No double-scope: reglas que ya tienen .suportum-root como parte del selector
        if (selector.includes('.suportum-root')) return selector;
        // :root, html, body: redirigir a .suportum-root para no afectar el documento host
        if (selector === ':root' || selector === 'html' || selector === 'body') return prefix;
        return prefixedSelector;
      },
    },
  },
};
