# Tickets

รูปแบบตาม PROJECT_TEMPLATE 1.0 หมวด 7.1–7.2 (YAML frontmatter + Context/References/Files/Tasks/Acceptance/Not Do/Verify/Questions/Evidence)

- **Exception ID:** ใช้ `T-NNN` (3 หลัก) ต่อจาก Task Register เดิม แทน `T-0001` เพื่อไม่ให้ reference เดิมเสีย; Sub-Ticket ใช้ `T-NNN-01`
- **Source of truth ของสถานะ:** `TeamFlow_Task_v1.0.md` ยังเป็น Task Register หลัก; T-001–T-091 ยังไม่ย้ายมาเป็นไฟล์ (ย้ายเมื่อแตะงานนั้นครั้งถัดไป)
- งานใหม่ตั้งแต่ T-092 สร้างไฟล์ที่นี่ และเพิ่มแถวสรุปใน Task Register
- Status: `draft → ready → doing → review → done` (+`blocked` พร้อม Q-ID); map กับ Register: draft/ready=TODO, doing/review=IN_PROGRESS, done=DONE
- เริ่มจาก `_TEMPLATE.md`
