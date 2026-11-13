"""Use the demo split-bill program as the code example, matching the example screenshot."""
import json, os, sys
S = sys.argv[1]
p = os.path.join(S, 'exp', 'analysis.json'); A = json.load(open(p))
code = open(os.path.join(S, 'exp', 'demo-split.txt')).read()
lines = code.strip().split('\n')
A['example_code'] = '\n'.join(l if len(l) <= 96 else l[:93] + '…' for l in lines[:17]) + '\n…'
A['example_chars'] = len(code)
json.dump(A, open(p, 'w'), ensure_ascii=False, indent=1)
print(A['example_chars'])
