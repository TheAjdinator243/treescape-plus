import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],

    /**
     * Podrazumijevanih 5 sekundi je premalo za ovaj set.
     *
     * `schema.test.ts` diže PGlite — cijeli Postgres preveden u WebAssembly.
     * Dok se on gradi, jede procesor, a vitest u isto vrijeme vrti ostale
     * datoteke u paraleli. Lagani testovi (email, telegram) tada čekaju na
     * red i probiju rok, pa padnu iako s kodom nije ništa. Isti ti testovi
     * pokrenuti sami prolaze za nekoliko milisekundi.
     *
     * Simptom je bio podmukao: padalo je nasumično, i to na drugim
     * datotekama nego što je uzrok.
     */
    testTimeout: 25_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      /**
       * `server-only` je paket koji NAMJERNO baca grešku pri uvozu — tako Next
       * spriječi da serverski modul završi u pregledniku. Next mu pri gradnji
       * servera podmetne praznu verziju; vitest to ne zna, pa bi svaki test
       * serverskog modula pukao već na prvoj liniji. Ovdje radimo isto što i
       * Next: uvozimo praznu verziju iz istog paketa.
       */
      'server-only': path.resolve(import.meta.dirname, './node_modules/server-only/empty.js'),
    },
  },
});
