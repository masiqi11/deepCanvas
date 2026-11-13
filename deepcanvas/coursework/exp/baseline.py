"""Plain-text baseline: the same prompts sent to the same model with no DeepCanvas instructions."""
import json, os, sys, time, urllib.request, concurrent.futures as cf
key = open(sys.argv[1]).read().strip()
prompts = json.load(open(os.path.join(os.path.dirname(__file__), 'prompts.json')))
def ask(p):
    body = json.dumps({"model": "deepseek-flash", "messages": [{"role": "user", "content": p["text"]}], "stream": False}).encode()
    req = urllib.request.Request("https://api.deepseek.com/chat/completions", body, {"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    t = time.time()
    with urllib.request.urlopen(req, timeout=600) as r: d = json.load(r)
    msg = d["choices"][0]["message"]
    return {"id": p["id"], "cat": p["cat"], "ms": int((time.time() - t) * 1000), "chars": len(msg.get("content") or ""), "usage": d.get("usage"), "content": msg.get("content")}
with cf.ThreadPoolExecutor(4) as ex: out = list(ex.map(ask, prompts))
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
for o in out: print(o["id"], o["ms"], o["chars"], (o["usage"] or {}).get("completion_tokens"))
