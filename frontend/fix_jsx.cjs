const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/ProduitForm.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replaceAll('<button ', '<Button ');
content = content.replaceAll('</button>', '</Button>');

content = content.replaceAll('className="pf-btn-save"', 'className="w-full flex items-center justify-center gap-2"');
content = content.replaceAll('className="pf-btn-cancel"', 'variant="outline" className="w-full mt-3 flex items-center justify-center gap-2"');
content = content.replaceAll('className="pf-add-fraction-btn"', 'variant="secondary" size="sm" className="ml-auto flex items-center gap-1.5"');
content = content.replaceAll('className="pf-fraction-delete"', 'variant="destructive" size="icon" className="w-9 h-9"');
content = content.replaceAll('className="pf-suggestion-btn"', 'variant="outline" size="sm" className="flex items-center gap-1.5 rounded-full"');

fs.writeFileSync(filePath, content, 'utf8');
console.log('JSX fixed.');
