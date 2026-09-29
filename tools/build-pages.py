# Builds every HTML page in public/ from one shared template (top bar, footer, scripts).
# Usage: python3 tools/build-pages.py
import re, pathlib
here = pathlib.Path(__file__).resolve().parent
root = here.parent / 'public'
SITE = 'https://preflopiq.pages.dev'   # change to the custom domain once it's live
NAV = [('/', 'Trainer'), ('/daily/', 'Daily'), ('/progress/', 'Progress'), ('/ranges/', 'Ranges'), ('/clubs/', 'Clubs'), ('/pricing/', 'Pricing'), ('/about/', 'About')]
SITEMAP = []
FOOTNAV = NAV + [('/charts/', 'Chart explorer'), ('/leaderboard/', 'Leaderboard'), ('/how-it-works/', 'How it works'), ('/achievements/', 'Achievements')]
PLAYER = ['/engine.js', '/achievements.js', '/player.js', '/fx.js']
SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'

def page(path, title, desc, body, scripts=(), nav_path=None):
    if path and not path.endswith('.html'):
        SITEMAP.append(path)
    active = nav_path or path
    cur = ' aria-current="page"'
    nav = '\n'.join('      <a href="%s"%s>%s</a>' % (h, cur if h == active else '', t) for h, t in NAV)
    fnav = ' '.join(f'<a href="{h}">{t}</a>' for h, t in FOOTNAV)
    js = ''.join(f'<script src="{s}"></script>\n' for s in [SUPABASE_JS, '/config.js', '/auth.js', *scripts])
    # A page's heading block sits on a full-width strip of felt above its content.
    band = ''
    m = re.search(r'\s*<div class="page-head">.*?</div>', body, flags=re.S)
    if m:
        band = f'<section class="feltband">\n  <div class="feltband-in">\n  {m.group(0).strip()}\n  </div>\n</section>\n'
        body = body[:m.start()] + body[m.end():]
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>{title}</title>
{'<link rel="canonical" href="' + SITE + path + '">' if path and not path.endswith('.html') else ''}
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="/"><img src="/favicon.svg" alt="" width="26" height="26">Preflop <span>IQ</span></a>
    <nav class="sitenav" aria-label="Main">
{nav}
    </nav>
    <a class="acctlink" id="acct" href="/account/"{' aria-current="page"' if path == '/account/' else ''} hidden>Sign in</a>
  </div>
</header>
{band}{body.strip()}
<footer class="sitefoot">
  <div class="sitefoot-in">
    <span class="footbrand"><span class="suits" aria-hidden="true"><i>&#9824;</i><i class="red">&#9829;</i><i class="red">&#9830;</i><i>&#9827;</i></span>Preflop IQ · Tournament preflop training, one hand at a time.</span>
    <nav aria-label="Footer">{fnav}</nav>
  </div>
</footer>
{js}</body>
</html>
'''

# ---------- trainer (home) ----------
tb = (here / 'pages' / 'trainer-body.html').read_text()
tb = tb.replace('<h1>Preflop IQ</h1>', '<h1>Trainer</h1>')
tb = re.sub(r'<p class="foot">.*?</p>',
  '<p class="foot">10bb and 15bb ranges are solved Nash equilibria; 25bb and deeper are modeled. <a href="/how-it-works/#ranges">How the ranges are built</a>.</p>', tb, flags=re.S)
(root / 'index.html').write_text(page('/', 'Preflop IQ · Tournament Preflop Trainer',
  'Drill tournament preflop ranges for 2-9 players and 10-100bb stacks. Nash-solved push/fold ranges, an explanation after every hand, and a Preflop IQ score.',
  tb, PLAYER + ['/table.js', '/daily-core.js', '/trainer.js']))

# ---------- charts ----------
charts_body = '''
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Range charts</span>
    <h1>Every spot, every hand</h1>
    <p class="lede">Browse the full chart for any spot the trainer asks about. Tap a hand to see what to do with it and why. Every 8-handed 100bb chart is free here; Pro unlocks the rest. Every chart is also free to read in the <a href="/ranges/">range library</a>.</p>
  </div>
  <div class="setup">
    <div class="seg" role="group" aria-labelledby="lbl-players"><span class="seglbl" id="lbl-players">Players</span><div class="segbtns" id="players"></div></div>
    <div class="seg" role="group" aria-labelledby="lbl-stack"><span class="seglbl" id="lbl-stack">Stack</span><div class="segbtns" id="stack"></div></div>
  </div>
  <div class="spotpick" id="spots"></div>
  <main class="chartmain">
    <section class="chartcard" id="chartcard" aria-labelledby="chart-title">
      <div class="chartlock" id="chartlock" hidden></div>
      <div class="blk"><h3 id="chart-title"></h3></div>
      <div class="gridwrap"><div class="bigrid" id="grid" role="group" aria-label="Range chart"></div></div>
      <div class="legend" id="legend"></div>
    </section>
    <section class="panel" id="detail" aria-live="polite"></section>
  </main>
</div>'''
(root / 'charts' ).mkdir(exist_ok=True)
(root / 'charts' / 'index.html').write_text(page('/charts/', 'Range Charts · Preflop IQ',
  'Browse tournament preflop range charts for 2-9 players and 10-100bb stacks: opens, shoves, 3-bets and calls, with an explanation for every hand.',
  charts_body, ['/engine.js', '/charts.js']))

# ---------- how it works ----------
how = '''
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">How it works</span>
    <h1>What you're drilling, and where the answers come from</h1>
    <p class="lede">Preflop IQ tests one decision at a time: the first action you make before the flop in a tournament. Here's the game it models, how every chart is built, and how your score is calculated.</p>
  </div>
  <nav class="toc" aria-label="On this page">
    <a href="#format">The format</a><a href="#spots">The spots</a><a href="#ranges">How ranges are built</a><a href="#score">Your Preflop IQ</a><a href="#using">Using the trainer</a><a href="#daily">Daily and ranks</a><a href="#glossary">Glossary</a>
  </nav>
  <article class="prose">
    <h2 id="format">The format</h2>
    <p>Every spot is a tournament hand with a <b>1bb big-blind ante</b>, the structure most live and online tournaments now use. The big blind pays the ante for the whole table, so there are 2.5bb in the pot before anyone acts.</p>
    <ul>
      <li><b>Table size:</b> 2 to 9 players. Position names follow the usual convention, so a 6-handed table runs UTG, HJ, CO, BTN, SB, BB.</li>
      <li><b>Stack depth:</b> 100, 60, 40, 25, 15 or 10 big blinds, with everyone at the table equally deep.</li>
      <li><b>Chip EV:</b> the ranges maximize chips won. They don't account for payout pressure (ICM), so near the bubble or at a final table the right play is often tighter than these charts.</li>
    </ul>
    <div class="tablewrap"><table>
      <thead><tr><th>Stack</th><th>Open size</th><th>Small blind open</th><th>3-bet size</th></tr></thead>
      <tbody>
        <tr><td>60&ndash;100bb</td><td>2.2bb</td><td>3bb</td><td>~3.2&times; in position, ~4.4&times; out of position</td></tr>
        <tr><td>40bb</td><td>2.1bb</td><td>2.8bb</td><td>~3.2&times; / ~4.4&times;</td></tr>
        <tr><td>25bb</td><td>2bb (min-raise)</td><td>2.5bb</td><td>All-in</td></tr>
        <tr><td>10&ndash;15bb</td><td colspan="3">Shove or fold. Every open is all-in, and players behind can only call or fold.</td></tr>
      </tbody>
    </table></div>
    <p>Heads-up, the button posts the small blind and opens to 2.5bb at deep stacks.</p>

    <h2 id="spots">The spots</h2>
    <p>You're quizzed on two kinds of decision:</p>
    <ul>
      <li><b>Opening:</b> everyone folds to you. At 25bb and deeper you can fold, limp or raise; at 15bb and below it's shove or fold. Every seat from the first to act through the small blind is covered.</li>
      <li><b>Limping:</b> the small blind (and the heads-up button, who posts it) raises its best hands, limps a wide middle band and folds the rest. From every other seat, open-limping is a mistake, and the trainer offers it so you learn to rule it out.</li>
      <li><b>Facing a raise:</b> someone has opened and you decide to fold, call or 3-bet. The spots are the big blind against the first seat, the cutoff and the small blind; the cutoff against the first seat; the button against the hijack and the cutoff; and both blinds against a cutoff or button open. Spots are dropped automatically when the table is too short to have them.</li>
    </ul>

    <h2 id="ranges">How ranges are built</h2>
    <p>Each chart is labeled on screen as either a <b>Nash solution</b> or <b>modeled</b>, because they're made in two different ways.</p>
    <h3>10bb and 15bb: solved</h3>
    <p>At these depths the only options are shove, call or fold, which is small enough to solve exactly. The solve works in two stages:</p>
    <ol>
      <li><b>An equity table.</b> Every one of the 14,365 matchups between the 169 starting hands was simulated over 20,000 random boards, accounting for card removal. Known results check out to within about half a percent: AA against KK comes out at 82.3%, against a true value of 81.9%.</li>
      <li><b>A Nash equilibrium.</b> A solver plays every seat against every other seat, repeatedly finding the best response and averaging it in, until nobody can gain by shoving or calling differently. It includes the big blind paying the ante out of its own stack.</li>
    </ol>
    <p>One simplification: the solve assumes at most one player calls a shove, so it ignores three-way all-ins. Commercial tools model those, but they rarely change a range. About 3% of hands end up mixing between actions; the trainer assigns each hand whichever action it takes most often.</p>
    <h3>25bb and deeper: modeled</h3>
    <p>With raises, 3-bets and play after the flop in the picture, a true solve needs a full preflop solver running for hours. Instead, these charts rank all 169 hands by all-in equity, give extra weight to suited, connected and paired hands as stacks get deeper (they win bigger pots when they hit), and take the top slice of that ranking at typical tournament frequencies for each seat. The shapes are close to published solver charts, but borderline hands can differ.</p>
    <div class="callout">If a modeled chart disagrees with a solver you trust on a borderline hand, trust the solver. The solved 10bb and 15bb charts are exact within the assumptions above.</div>

    <h2 id="score">Your Preflop IQ</h2>
    <p>Your score reflects your last 100 decisions, so it tracks how you're playing now rather than how you played last month.</p>
    <ul>
      <li><b>Borderline hands count 1.5&times;.</b> These are hands next to the edge of a range, where most real mistakes happen.</li>
      <li><b>Partial credit:</b> calling when the chart says 3-bet, or 3-betting when it says call, earns 40%. Folding a hand you should play, or playing one you should fold, earns nothing.</li>
      <li><b>Scale:</b> weighted accuracy maps onto 25&ndash;145. 50% accuracy is 85, 75% is 115, 90% is 133, and a perfect run is 145.</li>
      <li>The score is marked provisional until you've played 20 hands.</li>
    </ul>
    <div class="tablewrap"><table>
      <thead><tr><th>Tier</th><th>Preflop IQ</th></tr></thead>
      <tbody><tr><td>Solver-brained</td><td>135+</td></tr><tr><td>Shark</td><td>120&ndash;134</td></tr><tr><td>Regular</td><td>105&ndash;119</td></tr><tr><td>Recreational</td><td>90&ndash;104</td></tr><tr><td>Fish</td><td>under 90</td></tr></tbody>
    </table></div>

    <h2 id="using">Using the trainer</h2>
    <ul>
      <li><b>Pick your game</b> with the Players and Stack controls. Each combination has its own charts and its own accuracy table.</li>
      <li><b>Focus your practice</b> with <i>Opening</i> or <i>Facing a raise</i>, and turn on <i>Borderline hands only</i> to skip the obvious folds.</li>
      <li><b>Keyboard:</b> <code>F</code> fold, <code>C</code> call, <code>R</code> raise or 3-bet, <code>Space</code> next hand.</li>
      <li><b>Study first</b> on the <a href="/charts/">Charts</a> page, which shows every spot's full range and explains any hand you tap.</li>
      <li>Progress is saved in your browser. With an account, it's also saved to your account and follows you to other devices.</li>
      <li><b>Achievements</b> unlock as you play, from your first hand to a 25-hand streak. Each is worth a casino chip by difficulty, from a white 1 to a black 100. See your <a href="/achievements/">trophy case</a>.</li>
      <li>The first 25 hands are free. After that, <a href="/pricing/">Pro</a> keeps the trainer going.</li>
    </ul>

    <h2 id="daily">Daily challenge, streaks and ranks</h2>
    <ul>
      <li><b>Daily challenge:</b> ten hands in mixed formats, the same for every player that day. It's free, it doesn't use your free trainer hands, and you can share your result or challenge a friend to the same hands.</li>
      <li><b>Day streak:</b> a day counts once you answer ten hands, in the trainer or the daily challenge. One missed day each week is covered by a freeze.</li>
      <li><b>Ranks:</b> seven rungs from Home Game to Super High Roller, earned with hands played and your best Preflop IQ. Your rank never drops.</li>
      <li><b>Spot mastery:</b> bronze for 70% over 10 hands in a spot, silver for 80% over 25, gold for 90% over 50.</li>
      <li><b>Leak finder:</b> the spots where you miss the most, with a button to drill only that spot.</li>
      <li><b>Shot clock:</b> an optional seven seconds per decision. When time runs out your hand is folded, as it would be at a live table.</li>
    </ul>

    <h2 id="glossary">Glossary</h2>
    <dl class="gloss">
      <dt>bb</dt><dd>Big blinds. Stacks and bet sizes are measured in big blinds so the charts work at any blind level.</dd>
      <dt>UTG</dt><dd>Under the gun: first to act before the flop. UTG+1 and UTG+2 act next at full tables.</dd>
      <dt>LJ, HJ</dt><dd>Lojack and hijack, the middle seats. The hijack is two seats right of the button.</dd>
      <dt>CO</dt><dd>Cutoff, the seat right of the button.</dd>
      <dt>BTN</dt><dd>The button (dealer). Acts last on every street after the flop, which is why it can play the most hands.</dd>
      <dt>SB, BB</dt><dd>Small blind and big blind. They post forced bets and act last before the flop but first after it.</dd>
      <dt>BB ante</dt><dd>An ante paid entirely by the big blind on behalf of the table, here 1bb.</dd>
      <dt>Open</dt><dd>The first raise into an unraised pot.</dd>
      <dt>3-bet</dt><dd>A re-raise over an open.</dd>
      <dt>Shove</dt><dd>Going all-in.</dd>
      <dt>Squeeze</dt><dd>A 3-bet after someone has opened and someone else has called.</dd>
      <dt>Suited / offsuit</dt><dd>Two cards of the same suit (AKs) or different suits (AKo).</dd>
      <dt>Combos</dt><dd>The card combinations a hand represents: 6 for a pair, 4 for a suited hand, 12 for an offsuit hand. Range percentages are counted in combos out of 1,326.</dd>
      <dt>Blocker</dt><dd>A card in your hand that makes certain opponent hands less likely. Holding an ace, for example, leaves 3 combos of AA instead of 6, and 12 of AK instead of 16.</dd>
      <dt>Chip EV</dt><dd>Measuring decisions only by chips won or lost, ignoring tournament payouts.</dd>
      <dt>ICM</dt><dd>Independent Chip Model: a way of converting chips into prize money. Under ICM, survival matters more, so ranges tighten.</dd>
      <dt>Nash equilibrium</dt><dd>A set of strategies where no player can do better by changing theirs alone.</dd>
    </dl>
    <a class="cta" href="/">Start training</a>
  </article>
</div>'''
(root / 'how-it-works').mkdir(exist_ok=True)
(root / 'how-it-works' / 'index.html').write_text(page('/how-it-works/', 'How It Works · Preflop IQ',
  'How Preflop IQ builds its tournament preflop ranges, from Nash-solved push/fold charts to modeled deep-stack ranges, and how your Preflop IQ score is calculated.', how))

# ---------- about ----------
about = '''
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">About</span>
    <h1>Know your preflop ranges cold, and know why</h1>
    <p class="lede">Preflop IQ is a free trainer for tournament players. It drills the first decision of every hand until the right play is automatic.</p>
  </div>
  <article class="prose">
    <h2>Why preflop</h2>
    <p>Every hand starts preflop, and every later decision is built on that one. Open too wide from early position, or defend too little from the big blind, and you pay for it hundreds of times a tournament. It's also the part of the game you can get close to perfect with practice.</p>
    <p>Most players learn preflop by staring at a chart. That's slow, it doesn't tell you whether you've actually memorized it, and it doesn't explain why a hand is in or out, so the chart falls apart the moment the table size or stack depth changes.</p>

    <h2>What makes it different</h2>
    <ul>
      <li><b>Every answer comes with the reasoning.</b> You see why the hand plays or folds, where the range cuts off for that kind of hand, and the full chart for the spot.</li>
      <li><b>It fits the game you're actually in.</b> Any table from heads-up to 9-handed, and any stack from 100bb down to a 10bb shove.</li>
      <li><b>It's upfront about its sources.</b> Short-stack charts are solved exactly; deeper charts are modeled, and every chart says which. The <a href="/how-it-works/#ranges">How it works</a> page explains both methods in detail.</li>
      <li><b>It drills where you make mistakes.</b> Hands near the edge of a range come up more often and count more toward your score.</li>
    </ul>

    <h2>Free and Pro</h2>
    <p>Everyone gets 25 hands in the trainer, the whole range chart library and the interactive explorer at 8-handed 100bb for free, no sign-up needed. Pro unlocks unlimited hands and every table size and stack depth. See <a href="/pricing/">Pricing</a>.</p>

    <h2>Limits</h2>
    <p>Preflop IQ covers first-in opens and your first response to a raise. It doesn't cover 4-bets, limped pots or multiway spots yet, and its charts use chip EV, so it doesn't adjust for payout pressure near the money or at a final table.</p>

    <h2 id="privacy">Privacy</h2>
    <p>There are no ads or tracking scripts. You can play your free hands without an account, and then your stats stay in your browser.</p>
    <p>If you create an account, we store your email address, your stats and your plan status so your progress follows you between devices. Accounts are run on <a href="https://supabase.com">Supabase</a>. Payments are handled by <a href="https://stripe.com">Stripe</a>; your card details go to Stripe and never touch our servers. Fonts load from Google Fonts, which means Google receives a standard request for the font files.</p>

    <a class="cta" href="/">Start training</a>
  </article>
</div>'''
(root / 'about').mkdir(exist_ok=True)
(root / 'about' / 'index.html').write_text(page('/about/', 'About · Preflop IQ',
  'Preflop IQ is a free tournament preflop trainer: drill opens, 3-bets and shoves for any table size and stack depth, with the reasoning behind every answer.', about))

# ---------- 404 ----------
nf = '''
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">404</span>
    <h1>That page folded</h1>
    <p class="lede">There's nothing at this address. Head back to the trainer or pick a page from the top bar.</p>
  </div>
  <a class="cta" href="/">Back to the trainer</a>
</div>'''
(root / '404.html').write_text(page('', 'Page Not Found · Preflop IQ', 'This page does not exist.', nf))

# ---------- pricing ----------
pricing = """
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Pricing</span>
    <h1>Start free. Go Pro when it clicks.</h1>
    <p class="lede">Try 25 hands with no sign-up. Pro unlocks the whole trainer and every chart.</p>
  </div>
  <div class="tiers">
    <section class="tier">
      <h2>Free</h2>
      <p class="tier-price">$0</p>
      <ul>
        <li>25 trainer hands, no account needed</li>
        <li>The full range chart library</li>
        <li>The interactive chart explorer at 8-handed 100bb</li>
        <li>Full explanations and your Preflop IQ score</li>
      </ul>
      <a class="btn ghostbtn" href="/">Start training</a>
    </section>
    <section class="tier pro">
      <h2>Pro</h2>
      <div class="plans">
        <button class="plan" id="p-annual" data-plan="annual"><span class="plan-name">Annual</span><span class="plan-price">$59<small>/year</small></span><span class="plan-note">About $4.92 a month · save 38%</span></button>
        <button class="plan" id="p-monthly" data-plan="monthly"><span class="plan-name">Monthly</span><span class="plan-price">$7.99<small>/month</small></span><span class="plan-note">Cancel anytime</span></button>
      </div>
      <p class="pw-error" id="p-error" role="alert" hidden></p>
      <ul>
        <li>Unlimited trainer hands</li>
        <li>Every table size from heads-up to 9-handed</li>
        <li>Every stack depth from 100bb to 10bb, including solved push/fold ranges</li>
        <li>The interactive chart explorer at every format, with the reasoning for every hand</li>
        <li>Progress synced to your account across devices</li>
      </ul>
    </section>
  </div>
  <article class="prose">
    <h2>Questions</h2>
    <h3>How do I cancel?</h3>
    <p>From your <a href="/account/">account page</a>, choose <b>Manage billing</b>. You keep Pro until the end of the period you've paid for.</p>
    <h3>Who handles payment?</h3>
    <p>Stripe. Your card details go straight to Stripe and never reach Preflop IQ.</p>
    <h3>Can I switch between monthly and annual?</h3>
    <p>Yes, from <b>Manage billing</b> on your account page.</p>
  </article>
</div>"""
(root / 'pricing').mkdir(exist_ok=True)
(root / 'pricing' / 'index.html').write_text(page('/pricing/', 'Pricing · Preflop IQ',
  'Preflop IQ is free for 25 hands. Pro unlocks unlimited hands and every table size and stack depth for $7.99 a month or $59 a year.',
  pricing, ['/pricing.js']))

# ---------- account ----------
account = """
<div class="wrap narrow">
  <section class="acctbox" id="acctbox" aria-live="polite"><p class="hint">Loading your account…</p></section>
</div>"""
(root / 'account').mkdir(exist_ok=True)
(root / 'account' / 'index.html').write_text(page('/account/', 'Account · Preflop IQ',
  'Sign in to Preflop IQ to sync your progress and manage your Pro plan.', account, ['/account.js']))

# ---------- achievements ----------
ach = """
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Achievements</span>
    <h1>Trophy case</h1>
    <p class="lede">Earned at the trainer, one hand at a time. Each achievement is worth a chip by difficulty, from a white 1 to a black 100.</p>
  </div>
  <section class="achsummary" id="ach-summary" aria-label="Your totals"></section>
  <div id="ach-list"></div>
  <a class="cta" href="/">Back to the trainer</a>
</div>"""
(root / 'achievements').mkdir(exist_ok=True)
(root / 'achievements' / 'index.html').write_text(page('/achievements/', 'Achievements · Preflop IQ',
  'Your Preflop IQ trophy case: poker-themed achievements for streaks, sharp folds, well-timed shoves and hours at the table.',
  ach, ['/achievements.js', '/player.js', '/achievements-page.js']))

# ---------- daily challenge ----------
daily = """
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow" id="d-eyebrow">Daily challenge</span>
    <h1 id="d-title">Daily Challenge</h1>
    <p class="lede" id="d-lede"></p>
  </div>
  <div class="vsbanner" id="d-vs" hidden></div>
  <section id="d-intro" hidden></section>
  <section id="d-play" hidden>
    <div class="ddots" id="d-dots"></div>
    <main class="main">
      <section class="play">
        <div class="zone"><div class="felt" id="felt"></div></div>
        <div class="spot">
          <div class="cards" id="cards"></div>
          <div style="min-width:0"><div class="spotlabel" id="spotLabel"></div><p class="prompt" id="prompt"></p></div>
        </div>
        <div class="actions" id="actions"></div>
        <div class="nextrow"><button class="btn nextbtn" id="next" hidden>Next hand</button></div>
      </section>
      <section class="panel" id="panel" aria-live="polite"></section>
    </main>
  </section>
  <section id="d-result" hidden></section>
</div>"""
(root / 'daily').mkdir(exist_ok=True)
(root / 'daily' / 'index.html').write_text(page('/daily/', 'Daily Challenge · Preflop IQ',
  'Ten tournament preflop hands a day, the same for everyone. Free to play, share your score, and challenge a friend to the same hands.',
  daily, PLAYER + ['/table.js', '/daily-core.js', '/leaderboard.js', '/daily.js']))

# ---------- progress ----------
progress = """
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Progress</span>
    <h1>Your game, at a glance</h1>
    <p class="lede">Your rank, your streak, where you're leaking chips, and which spots you've mastered.</p>
  </div>
  <section id="p-rank" aria-label="Rank"></section>
  <div class="pgrid">
    <section class="pcard" aria-labelledby="h-streak"><h2 id="h-streak">Day streak</h2><div id="p-streak"></div></section>
    <section class="pcard" aria-labelledby="h-leaks"><h2 id="h-leaks">Your leaks</h2><p class="hint">The spots where you miss the most. Drill one and watch it climb.</p><div id="p-leaks"></div></section>
  </div>
  <section class="pcard" aria-labelledby="h-mastery"><h2 id="h-mastery">Spot mastery</h2><div id="p-mastery"></div></section>
  <div class="pgrid">
    <section class="pcard" aria-labelledby="h-card"><h2 id="h-card">Your card</h2><p class="hint">A snapshot of your game to post wherever your poker friends are.</p>
      <canvas id="card-canvas" class="sharecard" width="1200" height="630" role="img" aria-label="Your Preflop IQ card"></canvas>
      <div class="rowbtns"><button class="btn" id="card-download" type="button">Download image</button><button class="btn ghostbtn" id="card-share" type="button" hidden>Share</button></div>
    </section>
    <section class="pcard" aria-labelledby="h-themes"><h2 id="h-themes">Table themes</h2><p class="hint">Unlock new felts as you climb.</p><div id="p-themes"></div>
      <h2 class="mt">Trophy case</h2><p id="p-trophy"></p><a class="btn ghostbtn" href="/achievements/">See all achievements</a></section>
  </div>
</div>"""
(root / 'progress').mkdir(exist_ok=True)
(root / 'progress' / 'index.html').write_text(page('/progress/', 'Your Progress · Preflop IQ',
  'Your Preflop IQ rank, day streak, biggest leaks, spot mastery and a shareable card.', progress, PLAYER + ['/progress.js']))

# ---------- leaderboard ----------
lb = """
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Leaderboard</span>
    <h1>Daily challenge leaderboard</h1>
    <p class="lede">Today's top scores and this week's totals. Every score is checked on our server against the day's hands.</p>
  </div>
  <div id="lbpage"><p class="hint">Loading…</p></div>
  <a class="cta" href="/daily/">Play today's challenge</a>
</div>"""
(root / 'leaderboard').mkdir(exist_ok=True)
(root / 'leaderboard' / 'index.html').write_text(page('/leaderboard/', 'Leaderboard · Preflop IQ',
  'Daily and weekly leaderboards for the Preflop IQ daily challenge.', lb, PLAYER + ['/daily-core.js', '/leaderboard.js', '/leaderboard-page.js']))

# ---------- clubs ----------
clubs = """
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Clubs</span>
    <h1>Bring your game night</h1>
    <p class="lede">Start a private club for your home game or study group. Everyone plays the same daily challenge, and your club gets its own board for the day and the week.</p>
  </div>
  <div id="clubsbox"><p class="hint">Loading…</p></div>
</div>"""
(root / 'clubs').mkdir(exist_ok=True)
(root / 'clubs' / 'index.html').write_text(page('/clubs/', 'Clubs · Preflop IQ',
  'Private Preflop IQ clubs for home games and study groups: a shared daily challenge and your own leaderboard.', clubs, PLAYER + ['/daily-core.js', '/leaderboard.js', '/clubs.js']))

# =====================================================================
# Range chart library: /ranges/, /ranges/<format>/, /ranges/<format>/<spot>/
# Built from tools/range-data.js so every page matches the trainer exactly.
# =====================================================================
import json, subprocess, shutil, html as _html
data = json.loads(subprocess.run(['node', str(here / 'range-data.js')], capture_output=True, text=True, check=True).stdout)
FORMATS = data['formats']
esc = _html.escape
ME = ' class="me"'
CUR = ' aria-current="page"'
POS = {'UTG': 'UTG', 'UTG+1': 'UTG+1', 'UTG+2': 'UTG+2', 'LJ': 'Lojack', 'HJ': 'Hijack', 'CO': 'Cutoff', 'BTN': 'Button', 'SB': 'Small Blind', 'BB': 'Big Blind'}
CLS = {'r': 'raise', 'l': 'limp', 'c': 'call', 'f': ''}
COLOR = {'raise': 'var(--raise)', '3bet': 'var(--raise)', 'limp': 'var(--call)', 'call': 'var(--call)', 'fold': 'var(--fold-bg)'}
RK = 'AKQJT98765432'
GRID_HANDS = [(RK[a] + RK[a]) if a == b else (RK[a] + RK[b] + 's') if a < b else (RK[b] + RK[a] + 'o') for a in range(13) for b in range(13)]
# engine order is the same chart order (row = first card, suited above the diagonal)

def table_words(f):
    return 'heads-up' if f['n'] == 2 else f"{f['n']}-handed"

def a_table(f):
    t = table_words(f)
    return ('an ' if t[0] == '8' else 'a ') + t

def spot_title(sp, f):
    h = POS[sp['hero']]
    if sp['type'] == 'rfi':
        return f"{h} {'Shove' if f['push'] else 'Open'} Range" + (' (Heads-Up)' if f['n'] == 2 else '')
    o = POS[sp['opener']]
    return f"{h} vs {o} {'Shove' if f['push'] else 'Open'}"

def pct(sp, a):
    for x in sp['actions']:
        if x['a'] == a: return x
    return None

def summary(sp, f):
    t = table_words(f); h = POS[sp['hero']]
    fold = pct(sp, 'fold'); fp = fold['pct'] if fold else 0
    if sp['type'] == 'rfi':
        r = pct(sp, 'raise'); l = pct(sp, 'limp')
        where = f"At {a_table(f)} table with {f['d']}bb stacks and a 1bb big-blind ante, when it folds to the {h}"
        if f['push']:
            return f"{where}, the {h} shoves {r['pct']}% of hands ({r['combos']:,} of 1,326 combos) all-in and folds the rest."
        if l:
            return f"{where}, it raises {r['pct']}% of hands to {sp['size']}bb, limps {l['pct']}% and folds {fp}%."
        return f"{where}, the {h} opens {r['pct']}% of hands ({r['combos']:,} of 1,326 combos) to {sp['size']}bb and folds the rest."
    o = POS[sp['opener']]
    c = pct(sp, 'call'); r = pct(sp, '3bet')
    if f['push']:
        return f"At {a_table(f)} table with {f['d']}bb stacks, facing an all-in shove from the {o}, the {h} calls {c['pct'] if c else 0}% of hands and folds the rest. Calling costs {sp['call']}bb to win {sp['pot']}bb."
    parts = []
    if r: parts.append(f"3-bets {r['pct']}%" + (' all-in' if sp['threeTo'] == f['d'] else f" to {sp['threeTo']}bb"))
    if c: parts.append(f"calls {c['pct']}%")
    parts.append(f"folds {fp}%")
    return f"At {a_table(f)} table with {f['d']}bb stacks, facing a {sp['open']}bb open from the {o}, the {h} " + ', '.join(parts[:-1]) + (' and ' if len(parts) > 1 else '') + parts[-1] + '.'

def grid_html(sp):
    cells = ''.join(f'<div class="cell {CLS[c]}">{k}</div>' for k, c in zip(GRID_HANDS, sp['grid']))
    leg = ''.join(f'<span><i style="background:{COLOR[x["a"]]}"></i>{esc(x["label"])} {x["pct"]}%</span>' for x in sp['actions'])
    return f'<div class="gridwrap"><div class="grid rgrid" role="img" aria-label="Range chart for {esc(sp["name"])}">{cells}</div></div><div class="legend">{leg}</div>'

def spot_url(f, sp): return f"/ranges/{f['slug']}/{sp['slug']}/"
def fmt_url(f): return f"/ranges/{f['slug']}/"
def crumbs(items):
    vis = ' <span aria-hidden="true">›</span> '.join(f'<a href="{u}">{esc(t)}</a>' if u else f'<span aria-current="page">{esc(t)}</span>' for t, u in items)
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": t, **({"item": SITE + u} if u else {})} for i, (t, u) in enumerate(items)]}
    return f'<nav class="crumbs" aria-label="Breadcrumb">{vis}</nav>\n<script type="application/ld+json">{json.dumps(ld)}</script>'

def find(n, d):
    return next(x for x in FORMATS if x['n'] == n and x['d'] == d)

EDGE_LABEL = {'raise': ('Weakest opens', 'Weakest shoves'), '3bet': ('Weakest 3-bets', 'Weakest 3-bets'), 'limp': ('Weakest limps', 'Weakest limps'),
              'call': ('Weakest calls', 'Weakest calls'), 'fold': ('Strongest folds', 'Strongest folds')}

rroot = root / 'ranges'
if rroot.exists(): shutil.rmtree(rroot)
count = 0
for f in FORMATS:
    fdir = rroot / f['slug']
    for sp in f['spots']:
        title = spot_title(sp, f)
        summ = summary(sp, f)
        text_rows = ''.join(f'<div class="rtext"><span class="tag {"t3bet" if x["a"] in ("raise","3bet") else x["a"]}">{esc(x["label"])}</span><code>{esc(x["notation"])}</code></div>' for x in sp['actions'] if x['a'] != 'fold')
        edges = ''.join(f'<div><h3>{EDGE_LABEL[a][1 if f["push"] else 0]}</h3><p class="hands">{", ".join(hs)}</p></div>' for a, hs in sp['edge'].items() if hs)
        # same spot at other depths / table sizes
        depths = []
        for d2 in [100, 60, 40, 25, 15, 10]:
            f2 = find(f['n'], d2); s2 = next((x for x in f2['spots'] if x['id'] == sp['id']), None)
            if s2:
                main = s2['actions'][0]
                depths.append((d2, f2, s2, main))
        sizes = []
        for n2 in [2, 3, 4, 5, 6, 7, 8, 9]:
            f2 = find(n2, f['d']); s2 = next((x for x in f2['spots'] if x['id'] == sp['id']), None)
            if s2: sizes.append((n2, f2, s2, s2['actions'][0]))
        dep_rows = ''.join(f'<tr{ME if d2 == f["d"] else ""}><td><a href="{spot_url(f2, s2)}">{d2}bb</a></td><td>{esc(m["label"])} {m["pct"]}%</td></tr>' for d2, f2, s2, m in depths)
        size_rows = ''.join(f'<tr{ME if n2 == f["n"] else ""}><td><a href="{spot_url(f2, s2)}">{"Heads-up" if n2 == 2 else str(n2) + "-max"}</a></td><td>{esc(m["label"])} {m["pct"]}%</td></tr>' for n2, f2, s2, m in sizes)
        others = ''.join(f'<a class="chip" href="{spot_url(f, x)}"{CUR if x is sp else ""}>{esc(spot_title(x, f))}</a>' for x in f['spots'])
        source = ('This is a <b>solved</b> range: a chip-EV Nash equilibrium for shove-or-fold play with a 1bb big-blind ante, where no player can gain by shoving or calling differently.'
                  if f['push'] else 'This is a <b>modeled</b> range: hands ranked by all-in equity, weighted toward suited, connected and paired hands at deeper stacks, and sized to typical tournament frequencies. Borderline hands can differ from a full solver.')
        body = f"""
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Range chart · {esc(f['label'])}</span>
    <h1>{esc(title)}</h1>
    <p class="lede">{esc(summ)}</p>
  </div>
  {crumbs([('Ranges', '/ranges/'), (f['label'], fmt_url(f)), (title, None)])}
  <div class="rmain">
    <section class="chartcard" aria-labelledby="h-chart"><h2 id="h-chart">The chart</h2>{grid_html(sp)}</section>
    <section class="pcard" aria-labelledby="h-text"><h2 id="h-text">The range in text</h2>{text_rows}
      <p class="hint">Hands not listed fold. Pairs like 33+ mean 33 and everything above; A2s+ means A2s through AKs.</p>
      <div class="rowbtns"><a class="btn" href="/?drill={f['n']}-{f['d']}-{sp['id']}">Drill this spot</a><a class="btn ghostbtn" href="/charts/?fmt={f['n']}-{f['d']}&amp;spot={sp['id']}">Explain any hand</a></div>
      <p class="hint">The trainer deals you hands from exactly this spot and explains every answer.</p></section>
  </div>
  <article class="prose">
    <h2>The spot</h2>
    <p>{sp['context']}</p>
    {f'<h2>Hands on the edge</h2><p>These are the closest decisions in the chart, where most mistakes happen.</p><div class="edges">{edges}</div>' if edges else ''}
    <h2>Where this range comes from</h2>
    <p>{source} <a href="/how-it-works/#ranges">How the ranges are built</a>.</p>
  </article>
  <div class="pgrid">
    <section class="pcard"><h2>At other stack depths</h2><div class="tablewrap"><table class="rtable"><tbody>{dep_rows}</tbody></table></div></section>
    <section class="pcard"><h2>At other table sizes</h2><div class="tablewrap"><table class="rtable"><tbody>{size_rows}</tbody></table></div></section>
  </div>
  <section class="pcard"><h2>Other {esc(f['label'])} spots</h2><div class="chiprow">{others}</div></section>
</div>"""
        (fdir / sp['slug']).mkdir(parents=True, exist_ok=True)
        (fdir / sp['slug'] / 'index.html').write_text(page(spot_url(f, sp), f"{title} · {f['label']} Tournament Chart · Preflop IQ", summ, body, [], nav_path='/ranges/'))
        count += 1
    # format page
    def rows(t):
        out = ''
        for sp in [x for x in f['spots'] if x['type'] == t]:
            parts = ', '.join(f'{esc(x["label"])} {x["pct"]}%' for x in sp['actions'] if x['a'] != 'fold')
            out += f'<li><a href="{spot_url(f, sp)}"><b>{esc(spot_title(sp, f))}</b><span>{parts}</span></a></li>'
        return out
    near = ''.join(f'<a class="chip" href="{fmt_url(find(f["n"], d2))}"{CUR if d2 == f["d"] else ""}>{d2}bb</a>' for d2 in [100, 60, 40, 25, 15, 10])
    nears = ''.join(f'<a class="chip" href="{fmt_url(find(n2, f["d"]))}"{CUR if n2 == f["n"] else ""}>{"Heads-up" if n2 == 2 else str(n2) + "-max"}</a>' for n2 in [2, 3, 4, 5, 6, 7, 8, 9])
    fdesc = (f"Solved push/fold charts for {table_words(f)} tournaments at {f['d']}bb: shoving ranges from every seat and calling ranges against every shove."
             if f['push'] else f"Preflop charts for {table_words(f)} tournaments at {f['d']}bb with a 1bb big-blind ante: opening ranges from every seat and how to defend against opens.")
    fbody = f"""
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Range charts</span>
    <h1>{esc(f['label'])} {'Push/Fold Charts' if f['push'] else 'Preflop Ranges'}</h1>
    <p class="lede">{esc(fdesc)}</p>
  </div>
  {crumbs([('Ranges', '/ranges/'), (f['label'], None)])}
  <div class="pgrid">
    <section class="pcard"><h2>{'Shoving' if f['push'] else 'Opening'}</h2><ul class="spotlist">{rows('rfi')}</ul></section>
    <section class="pcard"><h2>{'Facing a shove' if f['push'] else 'Facing a raise'}</h2><ul class="spotlist">{rows('vs')}</ul></section>
  </div>
  <section class="pcard"><h2>Other stack depths</h2><div class="chiprow">{near}</div><h2 class="mt">Other table sizes</h2><div class="chiprow">{nears}</div></section>
  <div class="rowbtns"><a class="btn" href="/?fmt={f['n']}-{f['d']}">Train {esc(f['label'])}</a></div>
</div>"""
    fdir.mkdir(parents=True, exist_ok=True)
    (fdir / 'index.html').write_text(page(fmt_url(f), f"{f['label']} {'Push/Fold Charts' if f['push'] else 'Preflop Ranges'} · Preflop IQ", fdesc, fbody, [], nav_path='/ranges/'))

# hub
def cell(n, d):
    f = find(n, d); return f'<td><a class="mcell {"played" if f["push"] else ""}" href="{fmt_url(f)}">{d}bb</a></td>'
matrix = ''.join(f'<tr><th>{"Heads-up" if n == 2 else str(n) + "-max"}</th>' + ''.join(cell(n, d) for d in [100, 60, 40, 25, 15, 10]) + '</tr>' for n in [2, 3, 4, 5, 6, 7, 8, 9])
pop = [(8, 100, 'rfi-UTG'), (8, 100, 'rfi-BTN'), (8, 100, 'rfi-SB'), (8, 100, 'vs-BB-BTN'), (6, 100, 'rfi-CO'), (9, 100, 'rfi-UTG'),
       (9, 15, 'rfi-SB'), (9, 10, 'rfi-BTN'), (8, 10, 'vs-BB-SB'), (6, 25, 'rfi-BTN'), (2, 100, 'rfi-BTN'), (2, 10, 'rfi-BTN')]
popular = ''
for n, d, sid in pop:
    f = find(n, d); sp = next(x for x in f['spots'] if x['id'] == sid)
    popular += f'<li><a href="{spot_url(f, sp)}"><b>{esc(spot_title(sp, f))}</b><span>{esc(f["label"])}</span></a></li>'
hub = f"""
<div class="wrap">
  <div class="page-head">
    <span class="eyebrow">Range library</span>
    <h1>Tournament preflop range charts</h1>
    <p class="lede">Free charts for every seat, heads-up to 9-handed, from 100bb down to a 10bb shove. {count} charts in all, each with the range in text, the closest decisions and a button to drill it.</p>
  </div>
  <div class="pgrid">
    <section class="pcard"><h2>Popular charts</h2><ul class="spotlist">{popular}</ul></section>
    <section class="pcard"><h2>Push/fold charts</h2><p>At 10bb and 15bb the only moves are shove or fold, so these charts are solved exactly: a Nash equilibrium for every seat and every call.</p>
      <div class="chiprow">{''.join(f'<a class="chip" href="{fmt_url(find(n, d))}">{"Heads-up" if n == 2 else str(n) + "-max"} {d}bb</a>' for d in [15, 10] for n in [9, 8, 6, 2])}</div>
      <p class="hint">Want to explain any single hand? The <a href="/charts/">interactive chart explorer</a> does that.</p></section>
  </div>
  <section class="pcard"><h2>Every format</h2><p class="hint">Pick a table size and stack depth.</p><div class="tablewrap"><table class="mastery">{matrix}</table></div></section>
</div>"""
(rroot).mkdir(exist_ok=True)
(rroot / 'index.html').write_text(page('/ranges/', 'Tournament Preflop Range Charts · Preflop IQ',
  f'Free tournament preflop range charts for every seat, heads-up to 9-handed, 100bb to 10bb. {count} charts including solved push/fold ranges.', hub, []))

# sitemap and robots
urls = sorted(set(SITEMAP))
prio = lambda u: '1.0' if u == '/' else '0.8' if u.count('/') <= 2 else '0.6'
(root / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'  <url><loc>{SITE}{u}</loc><priority>{prio(u)}</priority></url>\n' for u in urls if u not in ('/account/',)) + '</urlset>\n')
(root / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /account/\nDisallow: /api/\n\nSitemap: {SITE}/sitemap.xml\n')
print(f'ok · {count} range pages · {len(urls)} URLs in sitemap')
