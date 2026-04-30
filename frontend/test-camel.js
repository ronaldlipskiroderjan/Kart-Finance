const toCamelCase = (str) => {
  return str.replace(/^([A-Z]+)(?=[A-Z][a-z]|[a-z]|$)/, (m) => m.toLowerCase());
};

console.log(toCamelCase("PilotID"));
console.log(toCamelCase("ID"));
console.log(toCamelCase("CreatedAt"));
console.log(toCamelCase("PDFPath"));
console.log(toCamelCase("MonthReference"));
