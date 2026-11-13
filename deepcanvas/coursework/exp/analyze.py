"""Join client measurements with session logs and the baseline; emit analysis.json and charts."""
import json, os, re, statistics as stx, subprocess, sys, glob
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = os.path.dirname(os.path.abspath(__file__))
S = os.path.dirname(HERE)
FIG = os.path.join(S, 'report', 'fig')
os.makedirs(FIG, exist_ok=True)
for path in glob.glob('/usr/share/fonts/opentype/noto/NotoSansCJK-*.ttc'):
    font_manager.fontManager.addfont(path)
plt.rcParams['font.family'] = ['Noto Sans CJK JP']
plt.rcParams['axes.unicode_minus'] = False
PROMPTS = json.load(open(os.path.join(HERE, 'prompts.json')))
CATS = list(dict.fromkeys(p['cat'] for p in PROMPTS))
FENCE = re.compile(r'```openui(?:-lang)?\n(.*?)(?:```|$)', re.S)


def sessions(home):
    """Map first user prompt text -> summary of the session log."""
    out = {}
    for f in glob.glob(os.path.join(home, 'sessions', '*', '*', 'session.v4.jsonl.zstd')):
        reader = os.path.join(HERE, '..', '..', 'eval', 'readlog.mjs')
        ev = json.loads(subprocess.run(['node', '--input-type=module', '-e',
                                        f"import {{ readLog }} from '{reader}'; console.log(JSON.stringify(readLog('{f}')))"],
                                       capture_output=True, text=True).stdout)
        users = [e for e in ev if e['type'] == 'user/message' and e['data'].get('source', {}).get('kind') == 'user']
        if not users:
            continue
        prompt = users[0]['data']['content'][0]['text']
        created = ev[0].get('createdAt', 0)
        if prompt in out and out[prompt]['created'] > created:
            continue
        texts, tools = [], []
        for e in ev:
            if e['type'] == 'assistant/message':
                for c in e['data']['message']['content']:
                    if c['type'] == 'text':
                        texts.append(c['text'])
            if e['type'] == 'tool/call':
                tools.append(e['data']['name'])
        start = next((e['time'] for e in ev if e['type'] == 'turn/start'), None)
        end = next((e['time'] for e in ev if e['type'] == 'turn/end'), None)
        full = '\n'.join(texts)
        code = FENCE.findall(full)
        prose = FENCE.sub('', full)
        out[prompt] = {'created': created, 'tools': tools, 'steps': sum(1 for e in ev if e['type'] == 'step/start'), 'code': code,
                       'code_chars': sum(len(c) for c in code), 'prose_chars': len(prose.strip()), 'text': full,
                       'turn_s': (end - start) / 1000 if start and end else None}
    return out


def k_tokens(v):
    if v is None:
        return None
    return float(v[:-1]) * 1000 if v.endswith('K') else float(v)


def pct(a, b):
    return f'{100 * a / b:.1f}%' if b else '—'


def summarize(run_dir, home):
    client = {}
    for d in run_dir.split(','):
        if os.path.exists(os.path.join(d, 'client.json')):
            client.update({r['id']: r for r in json.load(open(os.path.join(d, 'client.json')))})
    logs = sessions(home)
    rows = []
    for p in PROMPTS:
        c = client.get(p['id'])
        if c is None:
            continue
        lg = logs.get(p['text'], {})
        visual = c['fences'] > 0
        rows.append({**p, 'visual': visual, 'board': c.get('boardCards', 0) > 0, 'failed': c['problems'] > 0, 'partial': c.get('partials', 0) > 0,
                     'clean': visual and c['problems'] == 0 and c.get('partials', 0) == 0, 'first_s': (c['firstVisualMs'] or 0) / 1000 if c['firstVisualMs'] else None,
                     'done_s': lg.get('turn_s') or (c['doneMs'] or 0) / 1000, 'controls': c['controls'], 'usage': k_tokens(c.get('usage')),
                     'cache': int(c['cacheHit']) if c.get('cacheHit') else None, 'speed': int(c['speed']) if c.get('speed') else None,
                     'problems': c.get('problemText', []), 'tools': lg.get('tools', []), 'steps': lg.get('steps'),
                     'code_chars': lg.get('code_chars', 0), 'prose_chars': lg.get('prose_chars', 0), 'code': lg.get('code', []),
                     'approvals': c.get('approvals', 0)})
    structured = [r for r in rows if r['cat'] != '简单闲聊']
    chat = [r for r in rows if r['cat'] == '简单闲聊']
    vis = [r for r in structured if r['visual']]
    firsts = [r['first_s'] for r in vis if r['first_s']]
    cache = [r['cache'] for r in rows if r['cache'] is not None]
    per_cat = []
    for cat in CATS:
        rs = [r for r in rows if r['cat'] == cat]
        if not rs:
            continue
        v = [r for r in rs if r['visual']]
        per_cat.append({'cat': cat, 'n': len(rs), 'visual': len(v), 'clean': sum(r['clean'] for r in rs),
                        'first_mean': round(stx.mean([r['first_s'] for r in v if r['first_s']]), 1) if v else None,
                        'done_mean': round(stx.mean(r['done_s'] for r in rs), 1),
                        'controls_mean': round(stx.mean(r['controls'] for r in rs), 1)})
    errors = {}
    for r in rows:
        for t in r['problems']:
            key = ('参数取值不在允许范围' if 'expects one of' in t else '组件不存在' if 'Unknown component' in t else '缺少必填参数' if 'missing required' in t
                   else '参数类型不符' if 'expects' in t else '其他')
            errors[key] = errors.get(key, 0) + 1
    return {
        'rows': rows, 'n': len(rows), 'structured_n': len(structured), 'chat_n': len(chat),
        'visual_n': len(vis), 'visual_rate': pct(len(vis), len(structured)),
        'chat_text_n': sum(1 for r in chat if not r['visual'] and not r['board']),
        'clean_n': sum(r['clean'] for r in vis), 'clean_rate': pct(sum(r['clean'] for r in vis), len(vis)),
        'partial_n': sum(r['partial'] for r in vis), 'failed_n': sum(r['failed'] for r in vis),
        'first_visual_mean_s': round(stx.mean(firsts), 1) if firsts else None,
        'first_visual_median_s': round(stx.median(firsts), 1) if firsts else None,
        'done_mean_s': round(stx.mean(r['done_s'] for r in structured), 1),
        'done_median_s': round(stx.median(r['done_s'] for r in structured), 1),
        'cache_mean': f'{stx.mean(cache):.0f}%' if cache else '—', 'cache_values': cache,
        'speed_mean': round(stx.mean([r['speed'] for r in rows if r['speed']]), 0) if any(r['speed'] for r in rows) else None,
        'controls_mean': round(stx.mean(r['controls'] for r in vis), 1) if vis else None,
        'tool_runs': sum(1 for r in rows if r['tools']), 'tool_names': sorted({t for r in rows for t in r['tools']}),
        'approvals': sum(r['approvals'] for r in rows),
        'usage_mean_k': round(stx.mean([r['usage'] for r in rows if r['usage']]) / 1000, 1),
        'code_mean': round(stx.mean([r['code_chars'] for r in vis]), 0) if vis else None,
        'prose_mean': round(stx.mean([r['prose_chars'] for r in structured]), 0),
        'per_cat': per_cat, 'errors': errors,
    }


def main():
    v1 = summarize(sys.argv[1], sys.argv[2])
    v2 = summarize(sys.argv[3], sys.argv[4]) if len(sys.argv) > 4 else v1
    base = json.load(open(os.path.join(HERE, 'baseline.json')))
    bmap = {b['id']: b for b in base}
    for b in base:
        b['has_code'] = bool(re.search(r'```(?:html|python|javascript|js|jsx|tsx)', b['content'] or ''))
        b['prose'] = len(re.sub(r'```.*?```', '', b['content'] or '', flags=re.S).strip())
    structured_ids = [p['id'] for p in PROMPTS if p['cat'] != '简单闲聊']
    baseline = {
        'chars_mean': round(stx.mean(bmap[i]['chars'] for i in structured_ids), 0),
        'prose_mean': round(stx.mean(bmap[i]['prose'] for i in structured_ids), 0),
        'ms_mean_s': round(stx.mean(bmap[i]['ms'] for i in structured_ids) / 1000, 1),
        'code_n': sum(bmap[i]['has_code'] for i in structured_ids),
        'code_ids': [i for i in structured_ids if bmap[i]['has_code']],
        'tokens_mean': round(stx.mean(bmap[i]['usage']['completion_tokens'] for i in structured_ids), 0),
    }
    charts(v1, v2, bmap)
    example = next(r for r in v2['rows'] if r['id'] == 'T01')
    code = example['code'][0] if example['code'] else ''
    lines = code.strip().split('\n')
    excerpt = '\n'.join(l if len(l) <= 96 else l[:93] + '…' for l in lines[:18]) + ('\n…' if len(lines) > 18 else '')
    code_rows = []
    for pkg, role in (('ui-openui', '回复内交互界面（客户端）'), ('openui-prompt', '组件参考提示词（服务端）'), ('ui-canvas', '工作区看板界面'),
                      ('canvas-spec', '看板组件 Schema 与校验'), ('tool-canvas', '看板工具与呈现指导'), ('ui-brand-deepcanvas', '品牌'), ('deepcanvas-bundle', '产品组装')):
        code_rows.append([pkg, role, str(CODE[pkg][0]), str(CODE[pkg][1])])
    out = {'n': v2['n'], 'v1': strip(v1), 'v2': strip(v2), 'baseline': baseline, 'prompts': PROMPTS,
           'example_code': excerpt, 'example_chars': len(code), 'code_rows': code_rows,
           'unit_tests': UNIT_TESTS, 'diff_files': DIFF_FILES, 'fix_row': FIX_ROW,
           'rows_v1': [{k: r[k] for k in ('id', 'cat', 'visual', 'clean', 'partial', 'failed', 'first_s', 'done_s', 'controls', 'tools', 'problems', 'cache', 'usage', 'code_chars', 'prose_chars')} for r in v1['rows']],
           'rows_v2': [{k: r[k] for k in ('id', 'cat', 'visual', 'clean', 'partial', 'failed', 'first_s', 'done_s', 'controls', 'tools', 'problems', 'cache', 'usage', 'code_chars', 'prose_chars')} for r in v2['rows']],
           'baseline_rows': [{'id': b['id'], 'chars': b['chars'], 'prose': b['prose'], 'has_code': b['has_code'], 'ms': b['ms']} for b in base]}
    json.dump(out, open(os.path.join(HERE, 'analysis.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps({k: out['v1'][k] for k in out['v1'] if k not in ('per_cat',)}, ensure_ascii=False, indent=1))
    print(json.dumps({k: out['v2'][k] for k in out['v2'] if k not in ('per_cat',)}, ensure_ascii=False, indent=1))
    print(json.dumps(baseline, ensure_ascii=False))


def strip(s):
    return {k: v for k, v in s.items() if k != 'rows'}


CODE = json.load(open(os.path.join(HERE, 'code_stats.json')))
UNIT_TESTS = CODE['_tests']
DIFF_FILES = CODE['_files']
FIX_ROW = CODE['_fix_row']
INK = '#1f2430'; C1 = '#4f46e5'; C2 = '#a5b4fc'; C3 = '#f59e0b'; GRID = '#e5e7eb'


def style(ax):
    for s in ('top', 'right'):
        ax.spines[s].set_visible(False)
    ax.spines['left'].set_color('#9ca3af'); ax.spines['bottom'].set_color('#9ca3af')
    ax.grid(axis='y', color=GRID, linewidth=.8); ax.set_axisbelow(True)
    ax.tick_params(colors=INK)


def charts(v1, v2, bmap):
    cats = [c['cat'] for c in v2['per_cat']]
    # 1. clean rate per category, v1 vs v2
    fig, ax = plt.subplots(figsize=(9, 3.8), dpi=200)
    x = range(len(cats)); w = .36
    r1 = [100 * c['clean'] / c['n'] for c in v1['per_cat']]
    r2 = [100 * c['clean'] / c['n'] for c in v2['per_cat']]
    b1 = ax.bar([i - w / 2 for i in x], r1, w, color=C2, label='改进前（第一轮）')
    b2 = ax.bar([i + w / 2 for i in x], r2, w, color=C1, label='改进后（第二轮）')
    for bars in (b1, b2):
        for b in bars:
            ax.text(b.get_x() + b.get_width() / 2, b.get_height() + 1.5, f'{b.get_height():.0f}', ha='center', fontsize=8, color=INK)
    ax.set_xticks(list(x)); ax.set_xticklabels(cats); ax.set_ylim(0, 112); ax.set_ylabel('界面完整显示的题目占比（%）')
    ax.legend(frameon=False, ncol=2, loc='upper center', bbox_to_anchor=(.5, 1.13)); style(ax)
    ax.text(len(cats) - 1, 4, '闲聊题不应出现界面\n（按“文字回答”计）', ha='center', fontsize=7.5, color='#6b7280')
    fig.tight_layout(); fig.savefig(os.path.join(FIG, 'chart-clean.png')); plt.close(fig)
    # 2. latency per question
    rows = [r for r in v2['rows'] if r['cat'] != '简单闲聊']
    fig, ax = plt.subplots(figsize=(9, 3.6), dpi=200)
    ids = [r['id'] for r in rows]
    ax.bar(ids, [r['done_s'] for r in rows], color=C2, label='回答完成')
    ax.bar(ids, [r['first_s'] or 0 for r in rows], color=C1, label='首个界面出现')
    ax.set_ylabel('从发送开始的时间（秒）'); ax.tick_params(axis='x', labelrotation=90, labelsize=8)
    ax.legend(frameon=False, ncol=2, loc='upper left'); style(ax)
    fig.tight_layout(); fig.savefig(os.path.join(FIG, 'chart-latency.png')); plt.close(fig)
    # 3. reading load vs baseline, per category
    fig, ax = plt.subplots(figsize=(9, 3.6), dpi=200)
    cats_s = [c for c in cats if c != '简单闲聊']
    dc = [stx.mean(r['prose_chars'] for r in v2['rows'] if r['cat'] == c) for c in cats_s]
    bl = [stx.mean(bmap[r['id']]['chars'] for r in v2['rows'] if r['cat'] == c) for c in cats_s]
    x = range(len(cats_s))
    ax.bar([i - w / 2 for i in x], bl, w, color='#d1d5db', label='纯文本基线：回复总字符数')
    ax.bar([i + w / 2 for i in x], dc, w, color=C1, label='DeepCanvas：界面之外的文字字符数')
    ax.set_xticks(list(x)); ax.set_xticklabels(cats_s); ax.set_ylabel('平均字符数')
    ax.legend(frameon=False, loc='upper left'); style(ax)
    fig.tight_layout(); fig.savefig(os.path.join(FIG, 'chart-reading.png')); plt.close(fig)
    # 4. error types in round 1
    if v1['errors']:
        fig, ax = plt.subplots(figsize=(6.5, 2.8), dpi=200)
        items = sorted(v1['errors'].items(), key=lambda kv: kv[1])
        ax.barh([k for k, _ in items], [v for _, v in items], color=C3)
        for i, (_, v) in enumerate(items):
            ax.text(v + .1, i, str(v), va='center', fontsize=9)
        ax.set_xlabel('出现次数（第一轮）'); style(ax); ax.grid(axis='x', color=GRID); ax.grid(axis='y', visible=False)
        fig.tight_layout(); fig.savefig(os.path.join(FIG, 'chart-errors.png')); plt.close(fig)


main()
