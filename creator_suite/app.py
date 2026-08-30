"""CreatorSuite - Streamlit toolkit for POD creators and content designers."""
from __future__ import annotations

import io
import json
import re
import html
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any

import requests
import streamlit as st

st.set_page_config(
    page_title="CreatorSuite | POD Creator Toolkit",
    page_icon="✦",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ----------------------------- Styling -------------------------------------

def inject_css(dark: bool) -> None:
    bg = "#0b1020" if dark else "#f6f8fc"
    card = "#121a2e" if dark else "#ffffff"
    text = "#eef2ff" if dark else "#172033"
    muted = "#a4b0c8" if dark else "#667085"
    border = "#25304a" if dark else "#e6eaf2"
    st.markdown(
        f"""
        <style>
        :root {{ --cs-bg:{bg}; --cs-card:{card}; --cs-text:{text}; --cs-muted:{muted}; --cs-border:{border}; }}
        .stApp {{ background: var(--cs-bg); color: var(--cs-text); }}
        [data-testid="stSidebar"] {{ background: linear-gradient(180deg, {'#111a30' if dark else '#ffffff'} 0%, {'#0d1427' if dark else '#f4f7fb'} 100%); border-right: 1px solid var(--cs-border); }}
        .block-container {{ max-width: 1180px; padding-top: 2.2rem; padding-bottom: 3rem; }}
        .brand {{ font-size: 1.9rem; font-weight: 800; letter-spacing: -0.04em; margin-bottom: .15rem; }}
        .brand span {{ color: #7c5cff; }}
        .eyebrow {{ color: #7c5cff; text-transform: uppercase; letter-spacing: .14em; font-size: .72rem; font-weight: 800; }}
        .hero {{ padding: 1.45rem 1.6rem; border-radius: 24px; background: linear-gradient(135deg, #6d5dfc 0%, #9886ff 50%, #42c6ad 140%); color: white; box-shadow: 0 16px 50px rgba(91,75,210,.22); margin-bottom: 1.4rem; }}
        .hero h1 {{ font-size: clamp(2rem, 4vw, 3.55rem); line-height: 1.04; margin: .35rem 0 .7rem; color: white; }}
        .hero p {{ max-width: 690px; margin: 0; color: rgba(255,255,255,.88); font-size: 1.02rem; }}
        .card {{ background: var(--cs-card); border: 1px solid var(--cs-border); border-radius: 18px; padding: 1.15rem 1.2rem; height: 100%; box-shadow: 0 6px 22px rgba(20,31,60,.05); }}
        .card h3 {{ margin-top: .1rem; margin-bottom: .35rem; color: var(--cs-text); }}
        .muted {{ color: var(--cs-muted); }}
        .metric {{ font-size: 1.7rem; font-weight: 800; color: #7c5cff; }}
        .tag {{ display:inline-block; padding: .28rem .55rem; margin: .18rem; border-radius: 999px; background: rgba(124,92,255,.12); color: #7c5cff; font-size: .78rem; font-weight: 700; }}
        .stButton > button, .stDownloadButton > button {{ border-radius: 10px; font-weight: 700; border: 1px solid var(--cs-border); }}
        textarea, input {{ border-radius: 10px !important; }}
        div[data-testid="stFileUploader"] {{ border: 1px dashed #8c7cf8; border-radius: 14px; padding: .3rem; }}
        .footer {{ color: var(--cs-muted); text-align: center; font-size: .8rem; padding-top: 2rem; }}
        </style>
        """,
        unsafe_allow_html=True,
    )

# ----------------------------- Helpers -------------------------------------

def safe_request(url: str, params: dict[str, Any], timeout: int = 12) -> Any:
    headers = {"User-Agent": "CreatorSuite/1.0 (Streamlit)"}
    response = requests.get(url, params=params, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()


def google_suggestions(keyword: str) -> list[str]:
    if not keyword.strip():
        return []
    data = safe_request("https://suggestqueries.google.com/complete/search", {"client": "firefox", "q": keyword.strip()})
    return [str(item) for item in (data[1] if isinstance(data, list) and len(data) > 1 else [])]


def get_trends(keyword: str, timeframe: str, geo: str) -> tuple[list[dict[str, Any]], str | None]:
    try:
        from pytrends.request import TrendReq
        pytrends = TrendReq(hl="en-US", tz=360, timeout=(5, 15), retries=1, backoff_factor=0.2)
        pytrends.build_payload([keyword], timeframe=timeframe, geo=geo)
        related = pytrends.related_queries().get(keyword, {})
        rising = related.get("rising")
        if rising is None or rising.empty:
            return [], "لم تُرجع Google Trends كلمات صاعدة لهذه العبارة ضمن النطاق المحدد."
        rows = rising.head(30).to_dict("records")
        return rows, None
    except Exception as exc:
        return [], f"تعذر الوصول إلى Google Trends حالياً. يمكنك استخدام اقتراحات البحث البديلة. ({type(exc).__name__})"


def remove_background(image_bytes: bytes) -> bytes:
    from rembg import remove
    return remove(image_bytes)


def convert_pdf_to_docx(pdf_bytes: bytes) -> bytes:
    from pdf2docx import Converter
    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = Path(tmp) / "input.pdf"
        docx_path = Path(tmp) / "output.docx"
        pdf_path.write_bytes(pdf_bytes)
        converter = Converter(str(pdf_path))
        try:
            converter.convert(str(docx_path), start=0, end=None)
        finally:
            converter.close()
        return docx_path.read_bytes()


def convert_docx_to_pdf(docx_bytes: bytes) -> bytes:
    """Portable fallback: extract DOCX paragraphs and render a simple text PDF.
    LibreOffice/docx2pdf is not reliably available on Streamlit Cloud Linux.
    """
    from docx import Document
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    with tempfile.TemporaryDirectory() as tmp:
        docx_path = Path(tmp) / "input.docx"
        docx_path.write_bytes(docx_bytes)
        doc = Document(str(docx_path))
        output = io.BytesIO()
        pdf = SimpleDocTemplate(output, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
        styles = getSampleStyleSheet()
        story = []
        for paragraph in doc.paragraphs:
            text = html.escape(paragraph.text.strip())
            if text:
                story.append(Paragraph(text, styles["BodyText"]))
                story.append(Spacer(1, 4))
        if not story:
            story.append(Paragraph("The uploaded document contains no readable paragraphs.", styles["BodyText"]))
        pdf.build(story)
        return output.getvalue()


def build_prompt(idea: str, audience: str, style: str, complexity: str, extras: str) -> str:
    return (
        f"Black and white {style} line art, coloring book page for {audience}, "
        f"bold clean outlines, {complexity} composition, vector-inspired contours, "
        "no gray shading, no color, white background, high contrast, print-ready, "
        "centered subject, clear negative space, professional KDP interior illustration. "
        f"Main concept: {idea.strip()}. Additional constraints: {extras.strip() or 'no text, no border, no watermark'}."
    )


def seo_analysis(text: str, focus_keyword: str) -> dict[str, Any]:
    words = re.findall(r"[\wÀ-ÿ'-]+", text.lower(), flags=re.UNICODE)
    stopwords = set("the a an and or but for with from into of to in on is are was were this that your you our عن من في على إلى مع هذا هذه هو هي و أو لـ بـ".split())
    counts = Counter(w for w in words if w not in stopwords and len(w) > 2)
    total = len(words)
    keyword = focus_keyword.strip().lower()
    keyword_count = len(re.findall(re.escape(keyword), text.lower())) if keyword else 0
    density = (keyword_count / total * 100) if total and keyword else 0
    tips = []
    if total < 300: tips.append("زد طول النص إلى نحو 300 كلمة أو أكثر عندما يكون ذلك مناسباً للسياق.")
    if keyword and keyword_count == 0: tips.append("أضف الكلمة المفتاحية في العنوان أو المقدمة وبشكل طبيعي داخل النص.")
    if keyword and density > 3: tips.append("الكثافة مرتفعة؛ أعد صياغة بعض المواضع بمرادفات لتجنب الحشو.")
    if keyword and 0 < density <= 3: tips.append("الكثافة تبدو طبيعية؛ حسّن التوزيع في العناوين والوصف التعريفي.")
    if not re.search(r"^.{20,}\n", text): tips.append("قسّم النص إلى عناوين فرعية وفقرات قصيرة لتسهيل القراءة.")
    if not tips: tips.append("النص متوازن مبدئياً. راجع نية البحث وجودة الفائدة قبل النشر.")
    return {"total": total, "unique": len(set(words)), "keyword_count": keyword_count, "density": density, "top": counts.most_common(12), "tips": tips}

# ----------------------------- Pages ---------------------------------------

def render_home() -> None:
    st.markdown('<div class="hero"><div class="eyebrow">Creator toolkit · POD · KDP</div><h1>أنشئ، حسّن، وانشر بثقة.</h1><p>مساحة عمل مجانية تجمع اكتشاف النتشات، معالجة الصور، تحويل المستندات، توليد الأوامر، وتحليل النصوص في مكان واحد.</p></div>', unsafe_allow_html=True)
    cols = st.columns(4)
    for col, value, label in zip(cols, ["05", "100%", "PNG", "SEO"], ["أدوات عملية", "مجاني ومفتوح", "خلفية شفافة", "تحليل فوري"]):
        with col:
            st.markdown(f'<div class="card"><div class="metric">{value}</div><div class="muted">{label}</div></div>', unsafe_allow_html=True)
    st.markdown("### اختر نقطة البداية")
    cards = [
        ("01", "مكتشف النتشات", "اعثر على فرص فرعية مبنية على الاقتراحات واتجاهات البحث.", "مكتشف النتشات والترندات"),
        ("02", "معالجة الصور", "حوّل صور المنتجات إلى أصول شفافة جاهزة للتصميم.", "معالجة الصور"),
        ("03", "مولد الأوامر", "حوّل فكرة قصيرة إلى Prompt هندسي لصفحات التلوين.", "مولد الأوامر الهندسية"),
    ]
    cols = st.columns(3)
    for col, (num, title, desc, _) in zip(cols, cards):
        with col:
            st.markdown(f'<div class="card"><span class="eyebrow">{num}</span><h3>{title}</h3><p class="muted">{desc}</p></div>', unsafe_allow_html=True)
    st.info("نصيحة: ابدأ بمكتشف النتشات، ثم أنشئ Prompt، وبعدها جهّز أصولك باستخدام معالجة الصور.")


def render_niche() -> None:
    st.markdown('<div class="eyebrow">POD research</div><h1>مكتشف النتشات والترندات</h1>', unsafe_allow_html=True)
    st.write("استخدم الاقتراحات التلقائية لاكتشاف النتشات الفرعية، ثم افحص الكلمات الصاعدة عبر Google Trends. النتائج مؤشرات بحث وليست ضماناً للمبيعات.")
    keyword = st.text_input("الكلمة الأساسية", placeholder="مثال: funny cat")
    col1, col2, col3 = st.columns([1.1, 1, 1])
    with col1: timeframe = st.selectbox("الفترة", ["today 3-m", "today 12-m", "today 5-y"], format_func=lambda x: {"today 3-m":"آخر 3 أشهر", "today 12-m":"آخر 12 شهراً", "today 5-y":"آخر 5 سنوات"}[x])
    with col2: geo = st.text_input("الدولة (اختياري)", value="", placeholder="US أو SA")
    with col3: st.write(""); search = st.button("اكتشاف الفرص", type="primary", use_container_width=True)
    if search and keyword.strip():
        with st.spinner("جاري جمع الإشارات..."):
            try:
                suggestions = google_suggestions(keyword)
            except Exception:
                suggestions = []
            trends, warning = get_trends(keyword, timeframe, geo.upper().strip())
        st.markdown("### النتشات الفرعية المقترحة")
        if suggestions:
            st.markdown(" ".join(f'<span class="tag">{html.escape(x)}</span>' for x in suggestions), unsafe_allow_html=True)
        else: st.warning("لم نتمكن من جلب الاقتراحات الآن؛ تحقق من الاتصال أو جرّب كلمة أبسط.")
        st.markdown("### الكلمات الصاعدة")
        if warning: st.caption(warning)
        if trends: st.dataframe(trends, use_container_width=True, hide_index=True)
        else: st.caption("لا توجد بيانات صاعدة معروضة حالياً.")
    elif search: st.warning("أدخل كلمة أساسية أولاً.")


def render_image() -> None:
    st.markdown('<div class="eyebrow">Visual assets</div><h1>معالجة الصور</h1>', unsafe_allow_html=True)
    st.write("ارفع صورة JPG أو PNG لإزالة الخلفية تلقائياً باستخدام rembg، ثم نزّل النتيجة بصيغة PNG شفافة.")
    uploaded = st.file_uploader("ارفع الصورة", type=["jpg", "jpeg", "png"])
    if uploaded:
        original = uploaded.getvalue()
        c1, c2 = st.columns(2)
        with c1: st.image(original, caption="قبل المعالجة", use_container_width=True)
        if st.button("إزالة الخلفية", type="primary", use_container_width=True):
            with st.spinner("تتم معالجة الصورة محلياً..."):
                try:
                    result = remove_background(original)
                    st.session_state["processed_image"] = result
                except Exception as exc:
                    st.error(f"تعذر تشغيل rembg: {exc}")
                    st.info("في أول تشغيل قد تحتاج نماذج rembg إلى وقت لتنزيلها.")
        with c2:
            if st.session_state.get("processed_image"):
                st.image(st.session_state["processed_image"], caption="بعد المعالجة — خلفية شفافة", use_container_width=True)
                st.download_button("تنزيل PNG الشفاف", st.session_state["processed_image"], file_name=f"{Path(uploaded.name).stem}_transparent.png", mime="image/png", use_container_width=True)
            else: st.info("ستظهر النتيجة هنا بعد الضغط على زر المعالجة.")


def render_converter() -> None:
    st.markdown('<div class="eyebrow">Document workflow</div><h1>محول PDF وWord</h1>', unsafe_allow_html=True)
    st.write("حوّل PDF إلى Word باستخدام pdf2docx، أو حوّل مستند Word النصي إلى PDF قابل للتنزيل. يعمل مسار Word إلى PDF بآلية محمولة مناسبة للاستضافة السحابية.")
    mode = st.radio("مسار التحويل", ["PDF → Word", "Word → PDF"], horizontal=True)
    if mode == "PDF → Word":
        file = st.file_uploader("ارفع ملف PDF", type=["pdf"], key="pdf_input")
        if file and st.button("تحويل إلى Word", type="primary"):
            with st.spinner("جاري تحويل الملف..."):
                try:
                    output = convert_pdf_to_docx(file.getvalue())
                    st.download_button("تنزيل ملف Word", output, file_name=f"{Path(file.name).stem}.docx", mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                except Exception as exc: st.error(f"فشل التحويل: {exc}")
    else:
        file = st.file_uploader("ارفع ملف Word", type=["docx"], key="docx_input")
        if file and st.button("تحويل إلى PDF", type="primary"):
            with st.spinner("جاري إنشاء PDF..."):
                try:
                    output = convert_docx_to_pdf(file.getvalue())
                    st.download_button("تنزيل ملف PDF", output, file_name=f"{Path(file.name).stem}.pdf", mime="application/pdf")
                except Exception as exc: st.error(f"فشل التحويل: {exc}")
        st.caption("ملاحظة: هذا المسار يحافظ على النص والفقرات الأساسية، وليس تخطيط Word المعقد أو الصور المضمّنة.")


def render_prompt() -> None:
    st.markdown('<div class="eyebrow">KDP prompt lab</div><h1>مولد الأوامر الهندسية</h1>', unsafe_allow_html=True)
    st.write("أنشئ وصفاً احترافياً لصفحة تلوين Line-art، مع قيود واضحة مناسبة للطباعة عند الطلب.")
    idea = st.text_area("فكرة التصميم", placeholder="مثال: سلحفاة صغيرة تستكشف حديقة مليئة بالزهور")
    c1, c2, c3 = st.columns(3)
    with c1: audience = st.selectbox("الجمهور", ["kids", "toddlers", "adults", "beginners"])
    with c2: style = st.selectbox("الأسلوب", ["clean", "whimsical", "cute", "detailed"])
    with c3: complexity = st.selectbox("التعقيد", ["simple", "medium-detail", "intricate"])
    extras = st.text_input("قيود إضافية", placeholder="مثال: عناصر نباتية قليلة، تكوين عمودي")
    if st.button("توليد Prompt", type="primary"):
        if not idea.strip(): st.warning("أدخل فكرة التصميم أولاً.")
        else:
            prompt = build_prompt(idea, audience, style, complexity, extras)
            st.text_area("Prompt جاهز للنسخ", prompt, height=180)
            st.download_button("تنزيل TXT", prompt, file_name="creatorsuite_prompt.txt", mime="text/plain")


def render_seo() -> None:
    st.markdown('<div class="eyebrow">Content intelligence</div><h1>مساعد تحسين محركات البحث</h1>', unsafe_allow_html=True)
    st.write("تحليل أولي سريع يساعدك على مراجعة طول النص، تكرار الكلمات، وكثافة الكلمة المفتاحية. لا يستبدل مراجعة نية البحث أو جودة المحتوى.")
    text = st.text_area("ألصق وصف المنتج أو المقال", height=260, placeholder="اكتب النص هنا...")
    keyword = st.text_input("الكلمة المفتاحية المستهدفة", placeholder="مثال: coloring book for kids")
    if st.button("تحليل النص", type="primary"):
        if not text.strip(): st.warning("ألصق نصاً للتحليل أولاً.")
        else:
            result = seo_analysis(text, keyword)
            cols = st.columns(4)
            for col, value, label in zip(cols, [result["total"], result["unique"], result["keyword_count"], f'{result["density"]:.2f}%'], ["عدد الكلمات", "كلمات فريدة", "تكرار الكلمة", "الكثافة"]):
                with col: st.markdown(f'<div class="card"><div class="metric">{value}</div><div class="muted">{label}</div></div>', unsafe_allow_html=True)
            left, right = st.columns(2)
            with left:
                st.markdown("### الكلمات الأكثر تكراراً")
                st.dataframe([{"الكلمة": w, "التكرار": n} for w, n in result["top"]], use_container_width=True, hide_index=True)
            with right:
                st.markdown("### توصيات عملية")
                for tip in result["tips"]: st.info(tip)

# ----------------------------- App shell -----------------------------------

dark_mode = st.sidebar.toggle("الوضع الليلي", value=True)
inject_css(dark_mode)
st.sidebar.markdown('<div class="brand">Creator<span>Suite</span></div><div class="muted">مساحة عمل لصناع المحتوى</div>', unsafe_allow_html=True)
st.sidebar.divider()
page = st.sidebar.radio("التنقل", ["نظرة عامة", "مكتشف النتشات والترندات", "معالجة الصور", "محول PDF وWord", "مولد الأوامر الهندسية", "مساعد SEO"], label_visibility="collapsed")
st.sidebar.divider()
st.sidebar.caption("نسخة 1.0 · مجاني للاستخدام")

if page == "نظرة عامة": render_home()
elif page == "مكتشف النتشات والترندات": render_niche()
elif page == "معالجة الصور": render_image()
elif page == "محول PDF وWord": render_converter()
elif page == "مولد الأوامر الهندسية": render_prompt()
elif page == "مساعد SEO": render_seo()

st.markdown('<div class="footer">CreatorSuite · صُمم لتسريع دورة الفكرة من البحث إلى الأصل الجاهز للنشر.</div>', unsafe_allow_html=True)
