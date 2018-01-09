import typescriptPlugin from 'rollup-plugin-typescript';
import typescript from 'typescript';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'cjs',
    },
    plugins: [
        typescriptPlugin({ typescript }),
        nodeResolve(),
        commonjs(),
    ],
};
