export function templateToFunction(template: string) {
  return new Function("a,b,c,d,e", `return (${template})(a,b,c,d,e);`);
}
