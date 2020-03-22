import commonjs   from 'rollup-plugin-commonjs'
import replace    from 'rollup-plugin-replace'
import resolve    from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'


const config = [
  {
    input: 'index.js',
    output: {
      file: 'bundle.js',
      format: 'iife',
      name: 'bundleOut'
    },
    plugins: [
      resolve(),
      commonjs(),
      replace({
        'process.env.NODE_ENV': `'production'`
      }),
      terser({
        sourcemap: true,
        numWorkers: 1,
        output: {
          ecma: 6
        }
      })
    ]
  }
]

export default config
