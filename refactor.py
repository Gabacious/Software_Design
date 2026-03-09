import os
import re

dir_path = r"c:\xampp\htdocs\SoftwareD"
html_files = [f for f in os.listdir(dir_path) if f.endswith('.html') or f.endswith('.js')]

for file in html_files:
    if file == 'api.js':
        continue
    path = os.path.join(dir_path, file)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. Remove inline StockSenseAPI definition
    content = re.sub(r'const\s+StockSenseAPI\s*=\s*\(function\s*\(\)\s*\{[\s\S]*?window\.StockSenseAPI\s*=\s*StockSenseAPI;', '', content)
    content = re.sub(r"console\.log\('✅ StockSense API ready'\);", '', content)

    # Make sure <script src="api.js"></script> is included
    if file.endswith('.html') and '<script src="api.js"></script>' not in content:
        content = content.replace('<body>', '<body>\n    <script src="api.js"></script>')
        # For login.html which might have a different structure, but usually has <body>
        
    # 2. Add await to async API calls
    api_calls = [
        r'StockSenseAPI\.getDashboardStats\(\)',
        r'StockSenseAPI\.getInventory\(\)',
        r'StockSenseAPI\.getSales\(\)',
        r'StockSenseAPI\.getCustomers\(\)',
        r'StockSenseAPI\.getRecentOrders\([^)]*\)',
        r'StockSenseAPI\.validateUser\([^)]*\)'
    ]
    for call in api_calls:
        content = re.sub(rf'(?<!await\s)({call})', r'await \1', content)

    # 3. Make object methods async if they contain await
    # simple heuristic: if the function defines a property that calls await, make it async
    # "render: function()" -> "render: async function()"
    content = re.sub(r'(\b\w+):\s*function\s*\(', r'\1: async function(', content)

    content = re.sub(r'this\.render\(\)', r'await this.render()', content)
    
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")

print("Refactor complete.")
