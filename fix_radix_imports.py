import re
from pathlib import Path

root = Path('src/app/components/ui')
pattern = re.compile(r'(@radix-ui/[A-Za-z0-9-]+)@[0-9]+\.[0-9]+\.[0-9]+')
count = 0
for path in root.rglob('*.tsx'):
    text = path.read_text(encoding='utf-8')
    new = pattern.sub(r'\1', text)
    if new != text:
        path.write_text(new, encoding='utf-8')
        count += 1
print(f'Updated {count} files')
