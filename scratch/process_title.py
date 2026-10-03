from PIL import Image

title_path = "graphics/tela titulo.jpg"
img = Image.open(title_path).convert("RGBA")

data = img.getdata()
new_data = []

for item in data:
    r, g, b, a = item
    # Light gray / white background keying
    if r >= 240 and g >= 240 and b >= 240:
        new_data.append((0, 0, 0, 0)) # transparent
    else:
        new_data.append((r, g, b, 255))

img.putdata(new_data)

# Trim transparent edges
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

out_path = "graphics/title_banner.png"
img.save(out_path)
print(f"Saved {out_path} with size {img.size}")
