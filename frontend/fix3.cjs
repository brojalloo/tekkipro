const fs = require('fs');
const filePath = 'src/pages/ProduitForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replaceAll('${ ${', '${');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed double interpolations.');
