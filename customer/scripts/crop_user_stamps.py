from PIL import Image
import os

base_dir = r"C:\Users\pranu\OneDrive\Desktop\colonial-stamps"
user_up_dir = r"C:\Users\pranu\.gemini\antigravity\brain\88aca2ca-9ce6-4124-ad6b-92cc92232c25\.user_uploaded"
cust_stamps = os.path.join(base_dir, "customer", "public", "stamps")
back_stamps = os.path.join(base_dir, "backend", "uploads", "seed")

os.makedirs(cust_stamps, exist_ok=True)
os.makedirs(back_stamps, exist_ok=True)

# 1. Siberian Crane FDC (media_1790768268917.png)
crane_img = Image.open(os.path.join(user_up_dir, "media_1790768268917.png"))
# Bbox: (152, 109, 861, 543)
crane_fdc = crane_img.crop((152, 110, 860, 542))
crane_fdc.save(os.path.join(cust_stamps, "fdc_siberian_crane_1983.png"))
crane_fdc.save(os.path.join(back_stamps, "fdc_siberian_crane_1983.png"))
print("Saved fdc_siberian_crane_1983.png", crane_fdc.size)

# Crop the crane stamp on the FDC: around x: 670 to 800, y: 140 to 290 relative to the screenshot
crane_stamp = crane_img.crop((670, 145, 800, 290))
crane_stamp.save(os.path.join(cust_stamps, "siberian_crane_stamp.png"))
crane_stamp.save(os.path.join(back_stamps, "siberian_crane_stamp.png"))
print("Saved siberian_crane_stamp.png", crane_stamp.size)

# 2. Birds Monal Pheasant Sheet (media_1790768297147.png)
birds_img = Image.open(os.path.join(user_up_dir, "media_1790768297147.png"))
birds_sheet = birds_img.crop((152, 100, 860, 543))
birds_sheet.save(os.path.join(cust_stamps, "birds_monal_sheet.png"))
birds_sheet.save(os.path.join(back_stamps, "birds_monal_sheet.png"))
print("Saved birds_monal_sheet.png", birds_sheet.size)

# Single / block of Monal Pheasant:
# Let's crop a clean block of 2x2 or single stamp:
# In the sheet, let's crop a prominent single Monal Pheasant:
# Around x: 280 to 375, y: 180 to 310
monal_single = birds_img.crop((285, 195, 375, 320))
monal_single.save(os.path.join(cust_stamps, "birds_monal_pheasant.png"))
monal_single.save(os.path.join(back_stamps, "birds_monal_pheasant.png"))
print("Saved birds_monal_pheasant.png", monal_single.size)

# 3. Princely States Sheet 1 (media_1790768227179.png)
p1_img = Image.open(os.path.join(user_up_dir, "media_1790768227179.png"))
p1_sheet = p1_img.crop((152, 109, 860, 542))
p1_sheet.save(os.path.join(cust_stamps, "princely_states_sheet1.png"))
p1_sheet.save(os.path.join(back_stamps, "princely_states_sheet1.png"))
print("Saved princely_states_sheet1.png", p1_sheet.size)

# Crop Jaipur State Service 3/4 Anna (top-left of sheet 1)
# Bbox in screenshot: x: 165 to 305, y: 230 to 375
jaipur_stamp = p1_img.crop((168, 230, 305, 375))
jaipur_stamp.save(os.path.join(cust_stamps, "princely_jaipur_state.png"))
jaipur_stamp.save(os.path.join(back_stamps, "princely_jaipur_state.png"))
print("Saved princely_jaipur_state.png", jaipur_stamp.size)

# Crop Hyderabad Charminar One Anna (top-right of sheet 1)
hyderabad_stamp = p1_img.crop((580, 230, 720, 375))
hyderabad_stamp.save(os.path.join(cust_stamps, "princely_hyderabad_charminar.png"))
hyderabad_stamp.save(os.path.join(back_stamps, "princely_hyderabad_charminar.png"))
print("Saved princely_hyderabad_charminar.png", hyderabad_stamp.size)

# Crop Indore State Postage (bottom-center of sheet 1)
indore_stamp = p1_img.crop((400, 385, 505, 530))
indore_stamp.save(os.path.join(cust_stamps, "princely_indore_state.png"))
indore_stamp.save(os.path.join(back_stamps, "princely_indore_state.png"))
print("Saved princely_indore_state.png", indore_stamp.size)

# Crop Bahawalpur 9 Pies (bottom-left of sheet 1)
bahawalpur_stamp = p1_img.crop((190, 385, 385, 530))
bahawalpur_stamp.save(os.path.join(cust_stamps, "princely_bahawalpur.png"))
bahawalpur_stamp.save(os.path.join(back_stamps, "princely_bahawalpur.png"))
print("Saved princely_bahawalpur.png", bahawalpur_stamp.size)

# 4. Princely States Sheet 2 (media_1790768201327.png)
p2_img = Image.open(os.path.join(user_up_dir, "media_1790768201327.png"))
p2_sheet = p2_img.crop((152, 109, 860, 542))
p2_sheet.save(os.path.join(cust_stamps, "princely_states_sheet2.png"))
p2_sheet.save(os.path.join(back_stamps, "princely_states_sheet2.png"))
print("Saved princely_states_sheet2.png", p2_sheet.size)

# Crop Cochin Anchal (top-left of sheet 2)
cochin_stamp = p2_img.crop((168, 265, 295, 400))
cochin_stamp.save(os.path.join(cust_stamps, "princely_cochin_anchal.png"))
cochin_stamp.save(os.path.join(back_stamps, "princely_cochin_anchal.png"))
print("Saved princely_cochin_anchal.png", cochin_stamp.size)

# Crop Hyderabad Victory Commemoration (bottom-center of sheet 2)
hyderabad_victory = p2_img.crop((375, 410, 510, 535))
hyderabad_victory.save(os.path.join(cust_stamps, "princely_hyderabad_victory.png"))
hyderabad_victory.save(os.path.join(back_stamps, "princely_hyderabad_victory.png"))
print("Saved princely_hyderabad_victory.png", hyderabad_victory.size)

# Crop Travancore Anchel green (bottom-right of sheet 2)
travancore_green = p2_img.crop((530, 420, 725, 535))
travancore_green.save(os.path.join(cust_stamps, "princely_travancore_anchal.png"))
travancore_green.save(os.path.join(back_stamps, "princely_travancore_anchal.png"))
print("Saved princely_travancore_anchal.png", travancore_green.size)

# 5. Princely States Sheet 3 (media_1790768174160.png)
p3_img = Image.open(os.path.join(user_up_dir, "media_1790768174160.png"))
p3_sheet = p3_img.crop((152, 109, 860, 542))
p3_sheet.save(os.path.join(cust_stamps, "princely_states_sheet3.png"))
p3_sheet.save(os.path.join(back_stamps, "princely_states_sheet3.png"))
print("Saved princely_states_sheet3.png", p3_sheet.size)

# Crop Bhopal Service 2 Annas (top-left of sheet 3)
bhopal_stamp = p3_img.crop((245, 240, 435, 360))
bhopal_stamp.save(os.path.join(cust_stamps, "princely_bhopal_service.png"))
bhopal_stamp.save(os.path.join(back_stamps, "princely_bhopal_service.png"))
print("Saved princely_bhopal_service.png", bhopal_stamp.size)

# Crop Travancore Chuckram red (top-center of sheet 3)
travancore_red = p3_img.crop((445, 240, 560, 365))
travancore_red.save(os.path.join(cust_stamps, "princely_travancore_red.png"))
travancore_red.save(os.path.join(back_stamps, "princely_travancore_red.png"))
print("Saved princely_travancore_red.png", travancore_red.size)

print("All user stamp images cropped and saved successfully!")
