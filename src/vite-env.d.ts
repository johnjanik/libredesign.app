/// <reference types="vite/client" />

declare module '*.glsl' {
  const content: string;
  export default content;
}

declare module '*.wasm' {
  const content: string;
  export default content;
}
