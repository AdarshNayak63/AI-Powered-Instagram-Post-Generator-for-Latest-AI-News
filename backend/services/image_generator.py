import os
import json
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import requests
from io import BytesIO

class ImageGenerator:
    def __init__(self, template_name="modern_dark"):
        self.template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", template_name)
        self.config = self._load_config()
        self.font_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Inter-Bold.ttf")
        # Ensure fonts directory and a default font exists, normally we'd download it or include it.
        # For simplicity, if not found, use default ImageFont.load_default()
        
    def _load_config(self):
        config_path = os.path.join(self.template_dir, "config.json")
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        return {
            "title_position": [80, 720],
            "image_position": [90, 180],
            "logo_position": [40, 40],
            "title_font_size": 52,
            "description_font_size": 28,
            "image_size": [900, 420]
        }

    def _get_font(self, size):
        try:
            return ImageFont.truetype(self.font_path, size)
        except IOError:
            return ImageFont.load_default()

    def wrap_text(self, text, font, max_width):
        lines = []
        words = text.split()
        while words:
            line = ''
            while words and font.getlength(line + words[0]) <= max_width:
                line = line + (words.pop(0) + ' ')
            lines.append(line)
        return lines

    def generate(self, title: str, description: str, article_image_url: str = None, output_path: str = "output.png"):
        # Create base image (1080x1080)
        base = Image.new('RGB', (1080, 1080), color=(15, 15, 15))
        draw = ImageDraw.Draw(base)

        # Load article image if exists
        if article_image_url:
            try:
                response = requests.get(article_image_url, timeout=10)
                art_img = Image.open(BytesIO(response.content)).convert("RGBA")
                # Resize and crop
                target_size = tuple(self.config.get("image_size", [900, 420]))
                art_img = ImageOps.fit(art_img, target_size, Image.Resampling.LANCZOS)
                
                # Apply rounded corners
                mask = Image.new("L", target_size, 0)
                draw_mask = ImageDraw.Draw(mask)
                draw_mask.rounded_rectangle((0, 0) + target_size, radius=20, fill=255)
                art_img.putalpha(mask)

                base.paste(art_img, tuple(self.config.get("image_position", [90, 180])), art_img)
            except Exception as e:
                print(f"Failed to load article image: {e}")

        # Draw Title
        title_font = self._get_font(self.config.get("title_font_size", 52))
        title_lines = self.wrap_text(title, title_font, 920)
        y_text = self.config.get("title_position", [80, 720])[1]
        for line in title_lines:
            draw.text((self.config.get("title_position", [80, 720])[0], y_text), line, font=title_font, fill=(255, 255, 255))
            y_text += title_font.size + 10

        # Draw Description (truncated or short caption)
        desc_font = self._get_font(self.config.get("description_font_size", 28))
        desc_lines = self.wrap_text(description, desc_font, 920)
        y_text += 20
        for line in desc_lines[:3]: # Limit to 3 lines
            draw.text((self.config.get("title_position", [80, 720])[0], y_text), line, font=desc_font, fill=(180, 180, 180))
            y_text += desc_font.size + 10

        # Draw Branding Logo (Placeholder rectangle if no image)
        draw.rectangle([40, 40, 100, 100], fill=(255, 80, 80), outline=None)
        draw.text((120, 55), "AI Tech News", font=self._get_font(30), fill=(255, 255, 255))

        base.save(output_path)
        return output_path
