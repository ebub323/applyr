import json, urllib.request, re, concurrent.futures as cf

GH = ["stripe","databricks","discord","robinhood","flexport","airtable","affirm","gitlab",
      "instacart","samsara","ramp","vercel","anthropic","figma","asana","twilio","cloudflare",
      "doordash","lyft","pinterest","reddit","coinbase","brex","rippling","snyk","datadog",
      "hashicorp","sofi","wealthfront","chime","gusto","verkada","zoox","appliedintuition",
      "scaleai","mixpanel","amplitude","segment","benchlingbio","clickup","calendly"]
LV = ["palantir","voleon","sardine","mercury","privacy","matchgroup","kraken","binance"]
ASH = ["openai","ramp","notion","linear","sierra","cursor","perplexityai","modal","baseten"]

# Word-boundary "intern" only: excludes Internal / International / Internals.
WANT = re.compile(r"\b(intern|interns|internship|new\s?grad|university\s?grad|"
                  r"entry[\s-]level|junior|apprentice|associate\s+software)\b", re.I)
ENG  = re.compile(r"\b(software|engineer|engineering|developer|full[\s-]?stack|"
                  r"back[\s-]?end|front[\s-]?end|platform|infrastructure|web)\b", re.I)
# Hard excludes.
NOPE = re.compile(r"\b(senior|staff|principal|lead|manager|director|head\s+of|"
                  r"vp|phd|ph\.d|master'?s|high\s?school|mba|ii+|iv)\b", re.I)
US   = re.compile(r"(remote|united states|usa|,\s*[A-Z]{2}\b|california|washington|new york|"
                  r"texas|massachusetts|illinois|georgia|colorado|virginia|maryland|"
                  r"seattle|san francisco|austin|boston|chicago|atlanta|denver|"
                  r"new york|bellevue|mountain view|palo alto|sunnyvale|san jose|"
                  r"los angeles|miami|philadelphia|baltimore|washington, d)", re.I)

def get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def keep(title, loc):
    if not (WANT.search(title) and ENG.search(title)): return False
    if NOPE.search(title): return False
    if loc and not US.search(loc): return False
    return True

def gh(c):
    out=[]
    d = get(f"https://boards-api.greenhouse.io/v1/boards/{c}/jobs?content=false")
    for j in d.get("jobs",[]):
        t=j.get("title","").strip(); loc=(j.get("location") or {}).get("name","")
        if keep(t,loc):
            out.append({"company":c,"source":"greenhouse","title":t,"location":loc,
                        "url":j.get("absolute_url",""),"posted":(j.get("updated_at") or "")[:10]})
    return out

def lv(c):
    out=[]
    for j in get(f"https://api.lever.co/v0/postings/{c}?mode=json"):
        t=j.get("text","").strip(); loc=(j.get("categories") or {}).get("location","") or ""
        if keep(t,loc):
            out.append({"company":c,"source":"lever","title":t,"location":loc,
                        "url":j.get("hostedUrl",""),"posted":""})
    return out

def ash(c):
    out=[]
    d = get(f"https://api.ashbyhq.com/posting-api/job-board/{c}")
    for j in d.get("jobs",[]):
        t=j.get("title","").strip(); loc=j.get("location","") or ""
        if keep(t,loc):
            out.append({"company":c,"source":"ashby","title":t,"location":loc,
                        "url":j.get("jobUrl",""),"posted":(j.get("publishedAt") or "")[:10]})
    return out

tasks=[(gh,c) for c in GH]+[(lv,c) for c in LV]+[(ash,c) for c in ASH]
rows=[]; reached=0; failed=[]
with cf.ThreadPoolExecutor(max_workers=14) as ex:
    futs={ex.submit(f,c):(f.__name__,c) for f,c in tasks}
    for fu in cf.as_completed(futs):
        name,c = futs[fu]
        try:
            r=fu.result(); rows+=r; reached+=1
        except Exception as e:
            failed.append(f"{name}:{c}")

# Dedup: same company + normalised title collapses duplicates across locations.
seen={}
for r in rows:
    k=(r["company"], re.sub(r"[^a-z ]","",r["title"].lower()).strip())
    seen.setdefault(k, r)
dedup=sorted(seen.values(), key=lambda r:(r["company"],r["title"]))

print(f"boards reached: {reached}/{len(tasks)}   failed: {len(failed)}")
print(f"raw matches: {len(rows)}  ->  after dedup: {len(dedup)}\n")
for r in dedup:
    print(f"  [{r['source'][:2]}] {r['company']:16} | {r['title'][:58]:58} | {r['location'][:30]}")
json.dump(dedup, open("/tmp/roles.json","w"), indent=1)
print(f"\nwrote /tmp/roles.json  ({len(dedup)} roles)")
