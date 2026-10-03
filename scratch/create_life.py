from PIL import Image

# Open gambi-sprite.jpg and crop Frame 0 (Idle character) at high resolution
img = Image.open("graphics/gambi-sprite.jpg").convert("RGBA")

# Crop top-left character (Frame 0 IDLE)
crop = img.crop((10, 10, 215, 235))

# Remove cyan background
data = crop.getdata()
new_data = []
for p in data:
    r, g, b, a = p
    if (60 <= r <= 165) and (160 <= g <= 245) and (160 <= b <= 245) and abs(g - b) < 30:
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append((r, g, b, 255))

crop.putdata(new_data)

# Trim transparent padding
bbox = crop.getbbox()
if bbox:
    crop = crop.crop(bbox)

crop.save("graphics/life.png")
print(f"Created graphics/life.png with size {crop.size}")
