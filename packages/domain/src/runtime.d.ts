// Minimal ambient types for the WHATWG URL class, available in every target
// runtime (Workers, Node, React Native). Keeps the domain free of DOM/Node libs.
declare class URL {
  constructor(input: string, base?: string);
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  toString(): string;
}
