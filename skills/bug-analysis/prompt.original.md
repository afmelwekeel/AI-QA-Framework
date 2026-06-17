# Skill: Bug Analysis & RCA

<!-- BMAD-aligned: variables resolved from config.yaml -->
<!-- config_source: {project-root}/AI-QA-FRAMEWORK/config.yaml -->
<!-- reporting_language: {{reporting_language}} -->
<!-- output_folder: {{output_folder}} -->

For every failed test, produce a Markdown bug report ({{reporting_language}} body) with:

- Bug ID
- عنوان المشكلة
- وصف المشكلة
- خطوات إعادة المشكلة
- النتيجة الحالية
- النتيجة المتوقعة
- مستوى الخطورة (حرجة | عالية | متوسطة | منخفضة)
- الأولوية (عالية | متوسطة | منخفضة)
- مرفقات (screenshot, video, trace paths)
- API errors (status code + URL)
- Console errors
- Suggested root cause (heuristic)
- Suggested fix

Heuristics for severity:
- 5xx response, login broken, payment broken → حرجة
- Functional flow blocked, no workaround → عالية
- UI defect, has workaround → متوسطة
- Cosmetic / minor wording → منخفضة
