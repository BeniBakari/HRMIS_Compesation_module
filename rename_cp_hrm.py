import os

files = [
    os.path.join(r, f) 
    for r, d, fs in os.walk('.') 
    for f in fs 
    if f.endswith(('.py', '.js')) 
    and 'node_modules' not in r 
    and 'migrations' not in r 
    and 'venv' not in r 
    and 'build' not in r
]

for f in files:
    with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
    if 'CP_ADMINISTRATION' in content or 'cp_administration' in content or 'Cp_Administration' in content:
        new_content = content.replace('CP_ADMINISTRATION', 'CP_ADMINISTRATION').replace('cp_administration', 'cp_administration').replace('Cp_Administration', 'Cp_Administration')
        with open(f, 'w', encoding='utf-8', errors='ignore') as fp:
            fp.write(new_content)
        print(f'Updated {f}')
