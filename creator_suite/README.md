# CreatorSuite

**CreatorSuite** هو تطبيق Streamlit مجاني يساعد صناع المحتوى ومصممي الطباعة عند الطلب في الانتقال من البحث إلى الأصل الجاهز للنشر. يتضمن التطبيق خمس أدوات عملية: اكتشاف النتشات والترندات، إزالة خلفية الصور، تحويل PDF وWord، توليد أوامر صفحات التلوين، وتحليل SEO.

## المزايا

| الأداة | الوظيفة |
|---|---|
| مكتشف النتشات والترندات | اقتراحات Google Autocomplete وكلمات صاعدة عبر `pytrends` مع معالجة فشل الاتصال بأمان |
| معالجة الصور | إزالة الخلفية عبر `rembg` وتنزيل PNG شفاف |
| محول PDF وWord | PDF إلى DOCX عبر `pdf2docx`، وDOCX إلى PDF نصي محمول عبر `python-docx` و`reportlab` |
| مولد الأوامر الهندسية | قوالب Prompts احترافية لصفحات تلوين Line-art مناسبة لـ KDP |
| مساعد SEO | عدد الكلمات، الكلمات الفريدة، تكرار الكلمة المفتاحية، الكثافة، ونصائح أولية |

## التشغيل المحلي

يتطلب المشروع Python 3.11 أو 3.12. من مجلد `creator_suite` شغّل الأوامر التالية:

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
streamlit run app.py
```

بعدها افتح العنوان الذي يظهر في الطرفية، وغالباً يكون `http://localhost:8501`.

## النشر المجاني على Streamlit Community Cloud

1. ارفع مجلد `creator_suite` إلى مستودع GitHub عام أو خاص متاح لحسابك.
2. افتح [share.streamlit.io](https://share.streamlit.io) وسجّل الدخول بحساب GitHub.
3. اختر **Create app**، ثم حدّد المستودع، الفرع، والملف الرئيسي `creator_suite/app.py`.
4. من **Advanced settings** اختر Python 3.12 يدوياً قبل النشر. ملاحظة مهمة: Community Cloud لا يعتمد حالياً على `runtime.txt` لتغيير إصدار Python، لذلك يجب اختيار الإصدار من واجهة Streamlit نفسها.
5. سيقرأ Streamlit الملف `creator_suite/requirements.txt` تلقائياً إذا كان التطبيق مضبوطاً على هذا المجلد. إذا لم يقرأه، انقل `requirements.txt` إلى جذر المستودع أو اضبط مسار التطبيق وفق بنية المستودع.
6. بعد النشر، راقب السجلات في حال تأخر أول تشغيل؛ مكتبة `rembg` قد تنزّل نموذجها في أول معالجة للصورة.

## خطأ تثبيت onnxruntime أو rembg

إذا ظهر في السجل إصدار مثل `Python 3.14.7` ثم رسالة `onnxruntime has no wheels with a matching Python ABI`، افتح إعدادات التطبيق واختر **Python 3.12** من إعدادات النشر ثم أعد البناء. حزمة `rembg` ومسار إزالة الخلفية في CreatorSuite يعتمد على عجلات ONNX متوافقة مع Python 3.12، ولا يكفي وجود `runtime.txt` داخل المستودع لأن Community Cloud قد يتجاهله.

## استكشاف خطأ Node.removeChild في المتصفح

إذا ظهرت رسالة JavaScript من نوع `NotFoundError: Failed to execute 'removeChild' on 'Node'` مع صفحة رمادية أو بيضاء، فهذا خطأ في طبقة المتصفح غالباً وليس في Python. يحدث عادةً عندما يغيّر Google Translate أو إضافة ترجمة/حجب في المتصفح عناصر DOM التي تديرها Streamlit في الوقت نفسه. أوقف ترجمة الصفحة، عطّل إضافات الترجمة مؤقتاً، ثم أعد تحميل التطبيق باستخدام `Ctrl+Shift+R`. يمكن أيضاً فتح الرابط في نافذة خاصة أو متصفح نظيف. لا تستخدم زر ترجمة الصفحة التلقائية أثناء تشغيل التطبيق.

## قيود مهمة وحلولها

مسار **DOCX إلى PDF** يستخدم مولد PDF محمولاً يحافظ على النص والفقرات الأساسية، لكنه لا يضمن مطابقة تخطيط Word المعقد أو الصور المضمّنة؛ ذلك لأن `docx2pdf` يعتمد عادة على Microsoft Word أو LibreOffice، وهما غير مضمونين في بيئة Streamlit Cloud المجانية. أما **PDF إلى DOCX** فقد يختلف تنسيقه حسب تعقيد ملف PDF.

مصدر الترندات يعتمد على Google Trends وقد يواجه تحديداً مؤقتاً للمعدل أو عدم توفر نتائج لبعض الكلمات. عند حدوث ذلك، تستمر أداة الاقتراحات التلقائية في العمل وتعرض رسالة واضحة بدلاً من تعطيل التطبيق.

## هيكل المشروع

```text
creator_suite/
├── app.py
├── requirements.txt
├── README.md
└── .streamlit/
    └── config.toml
```

## تشغيل اختبارات سريعة

```bash
python -m py_compile app.py
streamlit run app.py --server.headless true
```

## الترخيص

يمكن استخدام هذا القالب وتعديله لمشاريعك الشخصية أو التجارية. راجع تراخيص المكتبات التابعة قبل إعادة التوزيع.

## مراجع

[1]: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app "Streamlit Community Cloud deployment documentation"
[2]: https://pypi.org/project/rembg/ "rembg on PyPI"
[3]: https://pypi.org/project/pdf2docx/ "pdf2docx on PyPI"
