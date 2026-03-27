const fs = require('fs');
const filePath = 'src/pages/ProduitForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import '\.\/ProduitForm\.css';\r?\n?/, '');

const shadcnImports = `import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';\n`;

if (!content.includes('@/components/ui/card')) {
  content = content.replace("import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';", shadcnImports + "import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Imports fixed.');
