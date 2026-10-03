import os
from PIL import Image

sprite_path = "graphics/gambi-sprite.jpg"
img = Image.open(sprite_path).convert("RGBA")
width, height = img.size

def is_cyan_bg(r, g, b):
    # Cyan/Teal background in gambi-sprite.jpg
    return (60 <= r <= 165) and (160 <= g <= 245) and (160 <= b <= 245) and abs(g - b) < 30

data = img.getdata()
new_data = []
for item in data:
    r, g, b, a = item
    if is_cyan_bg(r, g, b):
        new_data.append((0, 0, 0, 0))
    else:
        new_data.append((r, g, b, 255))

img.putdata(new_data)

col_width = width / 2 # 227.5
row_height = height / 4 # 256

cell_rects = [
    (0, 0),    # 1. IDLE
    (1, 0),    # 2. RUN L
    (0, 1),    # 3. RUN C
    (1, 1),    # 4. RUN R
    (0, 2),    # 5. JUMP
    (1, 2),    # 6. CLIMB UP
    (0, 3),    # 7. CLIMB ALT
    (1, 3),    # 8. HURT
]

cropped_sprites = []

for idx, (c, r) in enumerate(cell_rects):
    x1 = int(c * col_width)
    y1 = int(r * row_height)
    x2 = int((c + 1) * col_width)
    y2 = int((r + 1) * row_height)
    
    cell = img.crop((x1, y1, x2, y2))
    # Remove text at bottom of cell (~42px)
    cell_no_text = cell.crop((0, 0, cell.width, cell.height - 42))
    
    # For climb frames (idx 5 and 6), remove ladder rails (gray lines on right/left)
    if idx in (5, 6):
        c_data = cell_no_text.getdata()
        c_new = []
        for p in c_data:
            pr, pg, pb, pa = p
            # Ladder rail pixels are metallic gray: pr ~ pg ~ pb between 70 and 180 and close to each other
            if pa > 0 and abs(pr - pg) < 12 and abs(pg - pb) < 12 and 60 <= pr <= 190:
                # Check if it's ladder (further to the right or left of character)
                c_new.append((0, 0, 0, 0))
            else:
                c_new.append(p)
        cell_no_text.putdata(c_new)

    bbox = cell_no_text.getbbox()
    if bbox:
        sprite = cell_no_text.crop(bbox)
    else:
        sprite = cell_no_text
        
    cropped_sprites.append(sprite)

max_w = max(s.width for s in cropped_sprites)
max_h = max(s.height for s in cropped_sprites)

target_w = max_w + 12
target_h = max_h + 12

sheet = Image.new("RGBA", (target_w * 8, target_h), (0, 0, 0, 0))

for idx, sprite in enumerate(cropped_sprites):
    off_x = idx * target_w + (target_w - sprite.width) // 2
    off_y = target_h - sprite.height - 4 # align feet bottom
    sheet.paste(sprite, (off_x, off_y), sprite)

sheet_path = "graphics/player_sheet.png"
sheet.save(sheet_path)
print(f"Refined player_sheet.png saved! Frame size: {target_w}x{target_h}")
