import json, re, datetime

roles = json.load(open("/tmp/roles.json"))
SKILLS = {"typescript","react","python","java","c++","sql","postgres","supabase","aws","git",
          "react native","next.js","javascript","go","node"}
WANT = ["software engineer intern","software engineering intern","software engineer, intern",
        "software developer intern","new grad","junior software","associate software"]
FRICTION = {"greenhouse":0.10,"lever":0.10,"ashby":0.15,"handshake":0.20,"indeed":0.35,"workday":0.80}
NEAR_MD = re.compile(r"(baltimore|maryland|,\s*MD\b|washington,\s*d|,\s*DC\b|virginia|,\s*VA\b|mclean|arlington|laurel|columbia, md|annapolis|bethesda|rockville|silver spring)", re.I)
REMOTE  = re.compile(r"remote", re.I)

def score(r):
    t = r["title"].lower(); loc = r["location"] or ""
    s = 50.0; why = []
    hit = next((i for i,w in enumerate(WANT) if w in t), None)
    if hit is not None and hit <= 3:
        s += 22; why.append("Direct intern/dev title match")
    elif hit is not None:
        s += 14; why.append("New grad / junior title match")
    if REMOTE.search(loc):
        s += 10; why.append("Remote")
    elif NEAR_MD.search(loc):
        s += 14; why.append("Within reach of Baltimore")
    else:
        s -= 18; why.append("Requires relocating for the term")
    f = FRICTION.get(r["source"], 0.3)
    s -= f*12
    if f <= 0.15: why.append(f"Low-friction portal ({r['source']})")
    if r.get("posted"):
        try:
            age = (datetime.date.today() - datetime.date.fromisoformat(r["posted"])).days
            if age <= 14: s += 6; why.append("Posted recently")
            elif age > 75: s -= 10; why.append(f"Posted {age}d ago")
        except Exception: pass
    if re.search(r"\b(2027)\b", r["title"]): why.append("Summer 2027 cycle")
    return max(0,min(100,round(s))), why

for r in roles:
    r["fit"], r["why"] = score(r)
roles.sort(key=lambda r:-r["fit"])

near = [r for r in roles if NEAR_MD.search(r["location"] or "")]
rem  = [r for r in roles if REMOTE.search(r["location"] or "")]
print(f"total {len(roles)}   near-Maryland/DC {len(near)}   remote-friendly {len(rem)}\n")
print("=== NEAR MARYLAND / DC ===")
for r in near:
    print(f"  {r['fit']:3}  {r['company']:12} | {r['title'][:54]:54} | {r['location'][:28]}")
print("\n=== REMOTE-FRIENDLY ===")
for r in rem:
    print(f"  {r['fit']:3}  {r['company']:12} | {r['title'][:54]:54} | {r['location'][:28]}")
print("\n=== TOP 12 OVERALL ===")
for r in roles[:12]:
    print(f"  {r['fit']:3}  {r['company']:12} | {r['title'][:54]:54} | {r['location'][:28]}")
json.dump(roles, open("/tmp/roles_ranked.json","w"), indent=1)
