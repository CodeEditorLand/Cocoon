import re

with open('Source/Configuration/Mountain/Config.ts') as f:
    c = f.read()

# Fix errors.push("..." ;  -> errors.push("...");
# Match "string literal" then ; — the ; has no ) before it
c = re.sub(r'(errors\.push\("[^"]+")\s*;', r'\1);', c)

# Fix parseInt(..., 10; -> parseInt(..., 10);
c = re.sub(r'(parseInt\([^,]+,\s*10)\s*;', r'\1);', c)

# Fix throw new Error(`...` ; -> throw new Error(`...`);
c = re.sub(r'(throw new Error\(`[^`]+`)\s*;', r'\1);', c)

# Fix validateMountainConfig(config;
c = c.replace('validateMountainConfig(config;', 'validateMountainConfig(config);')

with open('Source/Configuration/Mountain/Config.ts', 'w') as f:
    f.write(c)

print('Fixed')
