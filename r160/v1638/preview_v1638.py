"""Interactive full rankings, 40-list before/after, and capability/use-case comparisons."""

import pathlib, json, html

J = pathlib.Path(__file__).resolve().parent
P = J / "preview"
P.mkdir(exist_ok=True)
load = lambda p: json.loads(pathlib.Path(p).read_text())
after = load(J / "receipts/topfive-after.json")
diff = load(J / "receipts/topfive-diff.json")
V = J.parents[1] / "data/raw/benchmarks/jevbench/v1.6"
res = load(V / "jevbench-v1.6.38-results.json")
cats = load(V / "jevbench-v1.6.38-categories.json")
# Use the release-bound ruled topic/TypeSafe-use-case supplement, as the live board does.
topic = load(V / "jevbench-v1.6-cohort-topic-cells.json")["draws"][
    "v1.6-regular-20261012"
]
assert topic["release"] == "v1.6.38"
cats["topics"], cats["usecases"] = topic["topics"], topic["usecases"]
for key, cells in cats["systems"].items():
    cells.update(topic["systems"][key])

by = {s["key"]: s for s in res["systems"]}
for groups in after["full_rankings"].values():
    for metrics in groups.values():
        for rows in metrics.values():
            for row in rows:
                by.setdefault(row["key"], row)
payload = json.dumps(
    dict(systems=list(by.values()), categories=cats, lists=after["full_rankings"]),
    ensure_ascii=False,
).replace("</", "<\/")
esc = html.escape
out = [
    '<!doctype html><meta charset="utf-8"><title>JevBench v1.6.38 review</title><style>body{background:#101724;color:#eee;font:16px system-ui;max-width:1200px;margin:32px auto}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:8px;border-bottom:1px solid #43516d}select,button{padding:8px}svg{background:#18253d;margin:12px}details{margin:16px 0}</style><h1>JevBench v1.6.38 local review</h1><p>Three paid public fast-lane additions. Independent release review PENDING. Both Drex pricing treatments are rebuildable.</p><p>'
    + esc(diff["note"])
    + '</p><h2>Head-to-head comparisons</h2><select id="left"></select> <select id="right"></select><div id="radars"></div><h2>All 40 top-five comparisons</h2><table><tr><th>Scope / list</th><th>Before</th><th>After</th></tr>'
]
for r in diff["rows"]:
    out.append(
        "<tr><td>"
        + esc(r["view"] + "/" + r["metric"])
        + (" *" if r["changed"] else "")
        + "</td><td>"
        + esc(", ".join(r["before"]))
        + "</td><td>"
        + esc(", ".join(r["after"]))
        + "</td></tr>"
    )
out += ["</table><h2>Full rankings</h2>"]
for view, groups in after["full_rankings"].items():
    for group, metrics in groups.items():
        for metric, arr in metrics.items():
            out.append(
                "<details><summary>"
                + esc(view + "/" + group + "/" + metric)
                + "</summary><table>"
                + "".join(
                    "<tr><td>"
                    + str(x["rank"])
                    + "</td><td>"
                    + esc(x["display"])
                    + "</td><td>"
                    + f'{x["score"]:.3f}'
                    + "</td></tr>"
                    for x in arr
                )
                + "</table></details>"
            )
out.append(
    "<script>const D="
    + payload
    + """;const by=Object.fromEntries(D.systems.map(s=>[s.key,s]));for(const id of ['left','right'])for(const s of D.systems)document.getElementById(id).add(new Option(s.display,s.key));left.value='drex-max';right.value='launchables-myles-g-12b';function radar(title,labels,aa,bb){
 const dense=labels.length>12,w=dense?1000:520,h=dense?700:430,cx=w/2,cy=dense?350:220,r=dense?200:140;
 const lo=Math.floor(Math.min(0,...aa,...bb)/25)*25,hi=100,n=labels.length;
 const clean=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const xy=(i,p)=>[cx+r*p*Math.sin(2*Math.PI*i/n),cy-r*p*Math.cos(2*Math.PI*i/n)];
 let s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><text x="20" y="25" fill="white">'+clean(title)+'</text><text x="20" y="45" fill="#a5b2c9" font-size="11">Scale '+lo+' to '+hi+'</text>';
 for(let q=1;q<=4;q++)s+='<polygon points="'+labels.map((_,i)=>xy(i,q/4).join(',')).join(' ')+'" fill="none" stroke="#3b4a64"/>';
 for(let i=0;i<n;i++){let [x,y]=xy(i,1),[tx,ty]=xy(i,dense?(i%2?1.6:1.3):1.2);s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+x+'" y2="'+y+'" stroke="#73809b"/><text x="'+tx+'" y="'+ty+'" fill="white" font-size="'+(dense?12:10)+'" text-anchor="middle">'+clean(labels[i])+'</text>'}
 for(const [a,c]of [[aa,'#42d4e8'],[bb,'#ffb15b']])s+='<polygon points="'+a.map((v,i)=>xy(i,(v-lo)/(hi-lo)).join(',')).join(' ')+'" fill="'+c+'" fill-opacity=".2" stroke="'+c+'"/>';
 return s+'</svg>'
}
function draw(){let a=by[left.value],b=by[right.value],keys=['intelligence','calibration','speed','cost'].filter(k=>a.axes[k]!=null&&b.axes[k]!=null);let s='<p style="color:#42d4e8">'+a.display+'</p><p style="color:#ffb15b">'+b.display+'</p>'+radar('Measured axes',keys,keys.map(k=>a.axes[k]),keys.map(k=>b.axes[k]));let ca=D.categories.systems[a.key],cb=D.categories.systems[b.key],dim=D.categories.usecases.filter(x=>Number.isFinite(ca?.usecases?.[x.key]?.competence)&&Number.isFinite(cb?.usecases?.[x.key]?.competence));if(ca&&cb){const topics=D.categories.topics.filter(x=>Number.isFinite(ca.topics?.[x.key]?.competence)&&Number.isFinite(cb.topics?.[x.key]?.competence));s+=radar('Capability by topic',topics.map(x=>x.label),topics.map(x=>ca.topics[x.key].competence),topics.map(x=>cb.topics[x.key].competence));}if(ca&&cb)s+=radar('Use cases',dim.map(x=>x.label),dim.map(x=>ca.usecases[x.key]?.competence),dim.map(x=>cb.usecases[x.key]?.competence));if(!ca||!cb)s+='<p>Category comparison is unavailable for this cross-draw pair in this preview.</p>';radars.innerHTML=s}left.onchange=right.onchange=draw;draw();</script>"""
)
(P / "preview-full-ranking.html").write_text("".join(out))
(P / "TOPFIVE-PREVIEW.md").write_text(
    "# v1.6.38 local review\n\n"
    + diff["note"]
    + "\n\nInteractive rankings, 40 lists and head-to-head axis, capability-topic and TypeSafe-use-case radars: [preview](preview-full-ranking.html).\n\n[Unpriced Drex preview](preview-drex-unpriced.html).\n"
)
