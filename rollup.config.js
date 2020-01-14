import commonjs   from 'rollup-plugin-commonjs'
import resolve    from 'rollup-plugin-node-resolve'


const config = [
  {
    input: 'dom-renderer/index.js',
    output: {
      file: 'dom-renderer/bundle.js',
      format: 'iife',
      name: 'xidOut'
    },
    plugins: [
    	resolve(),
    	commonjs()
    ]
  }
]

export default config
