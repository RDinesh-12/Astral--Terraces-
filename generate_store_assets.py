import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import imageio

SOURCE_ICON = r"C:\Users\dines\.gemini\antigravity\brain\2e850ffa-307c-4199-b5d9-3ca027c61095\astral_terraces_icon_1795590255108.jpg"
SOURCE_COVER = r"C:\Users\dines\.gemini\antigravity\brain\2e850ffa-307c-4199-b5d9-3ca027c61095\astral_terraces_cover_1795590260256.jpg"
OUTPUT_DIR = r"C:\Unity\Astral--Terraces-\store_assets"

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("--- 1. Processing App Icons ---")
icon_img = Image.open(SOURCE_ICON).convert("RGBA")

# 1024x1024 App Icon
icon_1024 = icon_img.resize((1024, 1024), Image.Resampling.LANCZOS)
icon_1024_path = os.path.join(OUTPUT_DIR, "app_icon_1024x1024.png")
icon_1024.save(icon_1024_path, format="PNG", optimize=True)
print(f"Created: {icon_1024_path}")

# 16x16 Small App Icon
icon_16 = icon_img.resize((16, 16), Image.Resampling.LANCZOS)
icon_16_path = os.path.join(OUTPUT_DIR, "small_app_icon_16x16.png")
icon_16.save(icon_16_path, format="PNG", optimize=True)
print(f"Created: {icon_16_path}")

print("--- 2. Processing Cover, Banner & Splash Images ---")
cover_img = Image.open(SOURCE_COVER).convert("RGB")

def fit_and_crop(img, target_w, target_h):
    orig_w, orig_h = img.size
    target_aspect = target_w / target_h
    orig_aspect = orig_w / orig_h

    if orig_aspect > target_aspect:
        # Source is wider than target: fit height, crop width
        new_h = orig_h
        new_w = int(orig_h * target_aspect)
        left = (orig_w - new_w) // 2
        top = 0
    else:
        # Source is taller: fit width, crop height
        new_w = orig_w
        new_h = int(orig_w / target_aspect)
        left = 0
        top = (orig_h - new_h) // 2

    cropped = img.crop((left, top, left + new_w, top + new_h))
    return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

# 1200x628 Cover Image (Meta Instant Games primary standard)
cover_1200 = fit_and_crop(cover_img, 1200, 628)
cover_1200_path = os.path.join(OUTPUT_DIR, "cover_image_1200x628.png")
cover_1200.save(cover_1200_path, format="PNG", optimize=True)
print(f"Created: {cover_1200_path}")

# 1200x628 Banner Image
banner_1200_path = os.path.join(OUTPUT_DIR, "banner_image_1200x628.png")
cover_1200.save(banner_1200_path, format="PNG", optimize=True)
print(f"Created: {banner_1200_path}")

# 1920x1080 High-Res Banner
banner_1920 = fit_and_crop(cover_img, 1920, 1080)
banner_1920_path = os.path.join(OUTPUT_DIR, "banner_image_1920x1080.png")
banner_1920.save(banner_1920_path, format="PNG", optimize=True)
print(f"Created: {banner_1920_path}")

# 1200x628 Splash Image
splash_1200_path = os.path.join(OUTPUT_DIR, "splash_image_1200x628.png")
cover_1200.save(splash_1200_path, format="PNG", optimize=True)
print(f"Created: {splash_1200_path}")

print("--- 3. Rendering Cinematic Gameplay Preview Video (MP4) ---")
# 10-second cinematic teaser (1280x720, 30 fps -> 300 frames)
# Smoothly pans and zooms across the gorgeous high-res cover art with ethereal light pulsing
video_path = os.path.join(OUTPUT_DIR, "preview_video_1280x720.mp4")
fps = 30
duration_sec = 10
total_frames = fps * duration_sec
target_vw, target_vh = 1280, 720

# High-res base for video pan/zoom
base_for_video = fit_and_crop(cover_img, 1920, 1080)
bw, bh = base_for_video.size

writer = imageio.get_writer(video_path, fps=fps, codec="libx264", quality=8)

for frame_idx in range(total_frames):
    t = frame_idx / total_frames  # 0.0 to 1.0

    # Gentle sinusoidal camera pan and zoom (Ken Burns effect)
    zoom = 1.05 + 0.12 * math.sin(t * math.pi)
    crop_w = int(target_vw / zoom)
    crop_h = int(target_vh / zoom)

    # Pan center
    center_x = int(bw * 0.5 + math.sin(t * math.pi * 2) * (bw * 0.08))
    center_y = int(bh * 0.5 + math.cos(t * math.pi) * (bh * 0.04))

    cx1 = max(0, min(bw - crop_w, center_x - crop_w // 2))
    cy1 = max(0, min(bh - crop_h, center_y - crop_h // 2))

    frame_crop = base_for_video.crop((cx1, cy1, cx1 + crop_w, cy1 + crop_h))
    frame_resized = frame_crop.resize((target_vw, target_vh), Image.Resampling.BILINEAR)

    # Fade in over first 0.8s, fade out over last 0.8s
    fade = 1.0
    fade_duration = 0.8
    current_time = frame_idx / fps
    if current_time < fade_duration:
        fade = current_time / fade_duration
    elif current_time > (duration_sec - fade_duration):
        fade = (duration_sec - current_time) / fade_duration

    if fade < 1.0:
        enhancer = Image.new("RGB", (target_vw, target_vh), (13, 11, 24))
        frame_resized = Image.blend(enhancer, frame_resized, fade)

    # Convert to numpy array for imageio
    frame_np = np.array(frame_resized)
    writer.append_data(frame_np)

writer.close()
print(f"Created: {video_path}")
print("--- All Store Assets Successfully Generated! ---")
