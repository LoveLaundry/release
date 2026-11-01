from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_THEME_COLOR
from pptx.enum.text import MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_CONNECTOR
from pathlib import Path

OUT = Path(__file__).with_name('LoveLaundry_System_Overview_20_Slides.pptx')
ASSET = Path(__file__).parent.parent.parent / 'edition-v1' / 'docs' / 'manual' / 'assets' / 'cover-tech.png'

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

NAVY = RGBColor(15, 39, 64)
INK = RGBColor(18, 33, 47)
OCHRE = RGBColor(180, 105, 42)
PAPER = RGBColor(251, 248, 242)
MUTE = RGBColor(109, 100, 85)
WHITE = RGBColor(255, 255, 255)
RULE = RGBColor(217, 210, 197)
PALE = RGBColor(246, 241, 232)
GREEN = RGBColor(39, 122, 83)
RED = RGBColor(176, 50, 50)


def rect(slide, x, y, w, h, fill, line=None, radius=False):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid(); shape.fill.fore_color.rgb = fill
    shape.line.color.rgb = line or fill
    if radius:
        shape.adjustments[0] = 0.12
    return shape


def text(slide, value, x, y, w, h, size=18, color=INK, bold=False, align=PP_ALIGN.LEFT, font='Aptos', valign=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True; tf.vertical_anchor = valign
    p = tf.paragraphs[0]; p.alignment = align
    r = p.add_run(); r.text = value; r.font.name = font; r.font.size = Pt(size); r.font.bold = bold; r.font.color.rgb = color
    return box


def bullets(slide, items, x, y, w, h, size=17, color=INK, gap=5):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = '• ' + item; p.level = 0; p.font.name = 'Aptos'; p.font.size = Pt(size); p.font.color.rgb = color; p.space_after = Pt(gap)
    return box


def title(slide, kicker, heading, subtitle=None):
    text(slide, kicker.upper(), .65, .38, 5, .25, 9, OCHRE, True)
    text(slide, heading, .65, .78, 12, .65, 27, NAVY, True, font='Aptos Display')
    if subtitle: text(slide, subtitle, .67, 1.47, 11.6, .38, 12, MUTE)
    rect(slide, .65, 1.93, 12.0, .018, RULE)


def footer(slide, n):
    rect(slide, .65, 7.12, 12.0, .012, RULE)
    text(slide, 'LOVELAUNDRY · SYSTEM OVERVIEW', .65, 7.19, 5, .18, 8, MUTE, True)
    text(slide, f'{n:02d}', 12.1, 7.17, .55, .22, 9, OCHRE, True, PP_ALIGN.RIGHT)


def add_slide(kicker, heading, subtitle=None, dark=False):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background.fill; bg.solid(); bg.fore_color.rgb = NAVY if dark else PAPER
    if not dark: footer(slide, len(prs.slides))
    title(slide, kicker, heading, subtitle) if not dark else None
    return slide


def card(slide, x, y, w, h, heading, body, accent=OCHRE):
    rect(slide, x, y, w, h, WHITE, RULE, True)
    rect(slide, x, y, .07, h, accent)
    text(slide, heading, x+.22, y+.2, w-.4, .3, 14, NAVY, True)
    text(slide, body, x+.22, y+.62, w-.4, h-.75, 11.5, MUTE)


def flow(slide, labels, x=.8, y=3.0, w=11.8, h=.7):
    gap = .18; bw = (w - gap*(len(labels)-1))/len(labels)
    for i, lab in enumerate(labels):
        xx = x + i*(bw+gap)
        rect(slide, xx, y, bw, h, PALE, OCHRE if i == len(labels)-1 else RULE, True)
        text(slide, lab, xx+.08, y+.12, bw-.16, h-.16, 12, NAVY, True, PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
        if i < len(labels)-1:
            text(slide, '→', xx+bw+.02, y+.17, gap-.04, .25, 15, OCHRE, True, PP_ALIGN.CENTER)

# 1 cover
s = prs.slides.add_slide(prs.slide_layouts[6]); s.background.fill.solid(); s.background.fill.fore_color.rgb = NAVY
if ASSET.exists(): s.shapes.add_picture(str(ASSET), Inches(7.5), Inches(0), width=Inches(5.83), height=Inches(7.5))
rect(s, 0, 0, 8.2, 7.5, NAVY)
text(s, 'LOVELAUNDRY', .8, .65, 4, .3, 12, OCHRE, True)
text(s, 'System overview', .8, 1.55, 6.5, .75, 38, WHITE, True, font='Aptos Display')
text(s, 'Platform administration · laundry · shop · hotel · linen room', .84, 2.45, 6.2, .55, 17, RGBColor(218, 222, 226))
rect(s, .84, 3.22, .8, .05, OCHRE)
text(s, 'Second Edition · November 2026', .84, 5.9, 4.5, .3, 12, RGBColor(218, 222, 226))
text(s, 'Operational architecture, security boundaries and example flows', .84, 6.3, 5.8, .4, 12, RGBColor(180, 190, 199))

# 2
s=add_slide('01 · Context','One platform, five working surfaces','Each surface matches a different job, pace and trust boundary.')
card(s,.8,2.35,2.25,2.35,'Platform admin','Govern laundries, users, hotels and shops.',OCHRE)
card(s,3.25,2.35,2.25,2.35,'Laundry app','Run passes, deliveries, bills, workers and reports.',NAVY)
card(s,5.7,2.35,2.25,2.35,'Shop Counter','Fast walk-in sales, payments and day close.',GREEN)
card(s,8.15,2.35,2.25,2.35,'Hotel Desk','Read one property’s operational and financial records.',RED)
card(s,10.6,2.35,2.0,2.35,'Linen Room','Scan physical items through their lifecycle.',OCHRE)

# 3
s=add_slide('02 · Architecture','The service map','Bounded services own their data; identity is the authority every request depends on.')
flow(s,['React surfaces','Reverse proxy','FastAPI services','Owned stores'],.9,2.5,11.5,.85)
card(s,1.0,4.15,3.3,1.35,'Identity first','user-service issues and verifies tokens, memberships and entity associations.',OCHRE)
card(s,5.0,4.15,3.3,1.35,'Operations second','bill_service records passes, deliveries, bills, shop bills and linen.',NAVY)
card(s,9.0,4.15,3.3,1.35,'Accounting separate','Accounting has its own retention and correction rules.',GREEN)

# 4
s=add_slide('03 · Security','Tenant isolation is a sequence','The request is refused before an unscoped query can be built.')
flow(s,['Verify token','Resolve tenant','Check capability','Scope repository','Respond'],.8,2.5,11.8,.75)
card(s,.9,4.1,3.7,1.55,'Fail closed','Missing tenant context is a denial, not a default tenant.',RED)
card(s,4.85,4.1,3.7,1.55,'No enumeration','Foreign and missing records return the same not-found behavior.',OCHRE)
card(s,8.8,4.1,3.7,1.55,'Server is authority','Hidden buttons are usability; API checks are security.',NAVY)

# 5
s=add_slide('04 · Identity','Two token shapes, deliberately unequal','Staff tokens operate a laundry; client tokens read one property scope.')
card(s,.9,2.35,5.25,2.9,'Staff token','Identity\nActive laundry\nMembership snapshot\nRole and capabilities\n24-hour target lifetime',NAVY)
card(s,7.15,2.35,5.25,2.9,'Client token','Client identity\nclient_scope = laundry + property\nNo staff tenant claim\nNo staff capability list\n12-hour target lifetime',OCHRE)
text(s,'The absence of a staff tenant claim is the control: a client token cannot satisfy staff-route tenancy resolution.',1.1,5.75,11.2,.45,15,RED,True,PP_ALIGN.CENTER)

# 6
s=add_slide('05 · Platform UI','Platform administration now has a home','The UI exposes platform-only registries, while the backend remains the final authority.')
flow(s,['Laundries','Users','Shops','Hotels'],1.0,2.45,11.3,.9)
card(s,1.0,4.15,2.6,1.5,'Laundries','Create, edit, suspend, archive and inspect members.',OCHRE)
card(s,3.85,4.15,2.6,1.5,'Users','Create identities and enroll eligible roles.',NAVY)
card(s,6.7,4.15,2.6,1.5,'Shops','Register entities and manage shop members.',GREEN)
card(s,9.55,4.15,2.6,1.5,'Hotels','Register entities and manage hotel members.',RED)

# 7
s=add_slide('06 · Example flow','Onboard a hotel','A complete path from platform registration to a verified hotel scope.')
flow(s,['Create active laundry','Register ocean-view','Add HOTEL_ADMIN','Hotel signs in','Verify own scope'],.8,2.45,11.8,.75)
bullets(s,['The associated laundry must exist and be ACTIVE.','The entity ID is stable and lower-case.','The hotel account is not a staff account.','A hotel can read its own passes, deliveries, invoices and statements.'],1.25,4.05,10.8,1.6,16)

# 8
s=add_slide('07 · Example flow','Onboard a shop and counter team','Separate admin and staff roles keep daily work fast without widening authority.')
flow(s,['Register city-express','Add SHOP_ADMIN','Add SHOP_STAFF','Quick bills','Day close'],.8,2.45,11.8,.75)
card(s,1.0,4.05,3.3,1.5,'Owner','Manages shop staff and shop operations.',OCHRE)
card(s,5.0,4.05,3.3,1.5,'Counter staff','Creates bills, takes payment and reprints receipts.',GREEN)
card(s,9.0,4.05,3.3,1.5,'Supervisor','Approves exceptions and reconciles the day.',NAVY)

# 9
s=add_slide('08 · Example flow','Registering a platform user','Identity and membership are separate so history remains attributable.')
bullets(s,['Open Platform → Users.','Enter an individual login, display name and initial password.','Choose PLATFORM_ADMIN or a tenant role.','For a tenant role, select the laundry membership.','Test sign-in while the operator is present.','Never use shared accounts.'],1.0,2.2,6.3,3.8,17)
card(s,8.0,2.35,3.8,2.3,'Key rule','Removing access removes a membership or disables the user. It does not erase the identity or historical records.',RED)

# 10
s=add_slide('09 · Example flow','Support entry without bypassing security','Support is a controlled investigation path, not a hidden superuser mode.')
flow(s,['Open registry','Select entity','Enter with reason','Investigate','Exit + record outcome'],.8,2.5,11.8,.75)
text(s,'Use support entry only for an approved ticket. Do not make unapproved data changes or leave the platform administrator in a tenant context.',1.3,4.35,10.7,.75,18,RED,True,PP_ALIGN.CENTER)

# 11
s=add_slide('10 · Operations','The daily laundry rhythm','Every stage leaves a record that supports the next stage.')
flow(s,['Gate pass','Receive + scan','Wash + finish','Deliver','Bill','Pay + close'],.75,2.45,11.9,.8)
text(s,'The operational rule is simple: record the event when it happens, not when memory permits.',1.2,4.35,11,.45,18,NAVY,True,PP_ALIGN.CENTER)

# 12
s=add_slide('11 · Linen','Physical truth is scanned','The linen lifecycle is forward-only, with explicit exception branches.')
flow(s,['Collected','Received','In wash','Washed','Pressed','Ready','Delivered'],.6,2.35,12.1,.65)
card(s,2.0,4.0,2.6,1.35,'Missing','Document the search, then escalate.',RED)
card(s,5.35,4.0,2.6,1.35,'Damaged','Record condition and assess liability.',OCHRE)
card(s,8.7,4.0,2.6,1.35,'Retired','Withdraw permanently; never reuse the tag.',NAVY)

# 13
s=add_slide('12 · Financial control','Delivery is not a bill','Separating operational evidence from financial issue makes correction safer.')
card(s,.9,2.35,3.5,2.4,'Delivery','What was actually returned, when and to whom.',GREEN)
card(s,4.9,2.35,3.5,2.4,'Bill','Delivered quantities at the agreed rate, issued as an immutable document.',NAVY)
card(s,8.9,2.35,3.5,2.4,'Payment','A separate record that reduces balance and carries a reference.',OCHRE)
text(s,'Correction path: reverse or adjust; never edit issued history.',1.2,5.55,10.9,.45,18,RED,True,PP_ALIGN.CENTER)

# 14
s=add_slide('13 · Example flow','Hotel month-end reconciliation','The portal gives the hotel a trustworthy, read-only evidence pack.')
flow(s,['Open statement','Download invoices','Match approvals','Match payments','Send one referenced query'],.8,2.5,11.8,.75)
bullets(s,['Use pass and invoice numbers in every query.','A partial delivery is normal; compare line quantities.','An unfamiliar invoice should be reported, not silently paid or ignored.'],1.1,4.1,11,1.3,17)

# 15
s=add_slide('14 · Reliability','Day close is a control','The system should refuse an unsafe close rather than freeze an incomplete day.')
flow(s,['Check passes','Check deliveries','Clear unbilled','Reconcile money','Review exceptions','Close'],.72,2.4,11.95,.75)
card(s,1.0,4.0,3.4,1.4,'Blocked close','Unbilled deliveries or unresolved blockers return a list; nothing is frozen.',RED)
card(s,4.95,4.0,3.4,1.4,'Successful close','Totals and the close record commit together.',GREEN)
card(s,8.9,4.0,3.4,1.4,'After close','Corrections remain visible as later audited events.',NAVY)

# 16
s=add_slide('15 · Recovery','Backups outside the blast radius','The application host is disposable; data and backup history are not.')
flow(s,['Detect','Stop unsafe writes','Identify domain','Restore in order','Verify','Re-enable gradually'],.75,2.4,11.9,.75)
text(s,'Restore order: identity → operations → accounting. Measure recovery in a real drill before publishing RPO/RTO as achieved.',1.1,4.2,11.1,.65,17,RED,True,PP_ALIGN.CENTER)

# 17
s=add_slide('16 · Verification','What is implemented and what is not','Good documentation separates evidence from aspiration.')
card(s,.9,2.25,3.6,2.7,'Implemented','Platform registry UI and API routes\nHotel/Shop CRUD, status and members\nPlatform-only navigation\nProduction UI build pass',GREEN)
card(s,4.85,2.25,3.6,2.7,'Verified in tests/builds','User and bill service suites recorded\nShop, Hotel and Linen builds recorded\nTenant isolation tests recorded',NAVY)
card(s,8.8,2.25,3.6,2.7,'Still planned / next check','End-to-end staging click-through\nEntity-ID operational backfill\nMeasured restore drill\nLoad/performance testing',OCHRE)

# 18
s=add_slide('17 · Release','Release checklist','A safe release is a build, evidence review, smoke test and rollback plan.')
bullets(s,['Review route guards and API models.','Run backend tests in isolated environments.','Run frontend typecheck and production builds.','Scan for secrets and unsafe VITE variables.','Back up before migration or backfill.','Test platform registry, sign-in and one operational path in staging.','Record commit, configuration version and rollback owner.'],1.0,2.15,11.2,4.1,16)

# 19
s=add_slide('18 · Decision guide','Choose the narrowest role that completes the job','Least privilege keeps the system legible and safer under pressure.')
flow(s,['Platform-wide?','Laundry admin?','Hotel admin?','Shop admin?','Operational staff'],.7,2.45,12.0,.75)
text(s,'PLATFORM_ADMIN → ADMIN/MANAGER → HOTEL_ADMIN/MANAGER or SHOP_ADMIN/STAFF → STAFF / HOUSEKEEPER',1.0,4.25,11.4,.55,16,NAVY,True,PP_ALIGN.CENTER)

# 20 close
s=prs.slides.add_slide(prs.slide_layouts[6]); s.background.fill.solid(); s.background.fill.fore_color.rgb = NAVY
text(s,'LOVELAUNDRY',.8,.7,4,.3,12,OCHRE,True)
text(s,'One system.\nClear boundaries.',.8,1.55,6.9,1.5,38,WHITE,True,font='Aptos Display')
text(s,'The platform succeeds when every user sees the right work, every record has an owner, and every exception remains visible.',.85,3.55,6.6,.9,19,RGBColor(218,222,226))
rect(s,.85,5.45,1.0,.05,OCHRE)
text(s,'LoveLaundry System Manual · Second Edition',.85,5.75,5.4,.3,12,RGBColor(218,222,226))
text(s,'20-slide example presentation · November 2026',.85,6.18,5.4,.3,11,RGBColor(180,190,199))

prs.save(OUT)
print(OUT)
