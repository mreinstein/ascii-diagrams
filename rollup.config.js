import commonjs from 'rollup-plugin-commonjs'
import resolve  from 'rollup-plugin-node-resolve'


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
      commonjs()
    ]
  }
]

export default config
