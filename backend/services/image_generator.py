import os
import json
import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
from io import BytesIO
from datetime import datetime

class ImageGenerator:
    def __init__(self, template_name="professional_clean"):
        self.template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", template_name)
        self.config = self._load_config()
        self.font_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Inter-Bold.ttf")
        
    def _load_config(self):
        config_path = os.path.join(self.template_dir, "config.json")
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        return self._get_default_config()
    
    def _get_default_config(self):
        return {
            "title_position": [70, 580],
            "image_position": [70, 100],
            "logo_position": [30, 30],
            "title_font_size": 85,
            "description_font_size": 48,
            "image_size": [940, 420],
            "background_color": [255, 255, 255],
            "text_color": [10, 10, 10],
            "description_color": [60, 60, 60],
            "accent_color": [0, 122, 255],
            "border_radius": 12
        }
    
    def _get_font(self, size):
        try:
            return ImageFont.truetype(self.font_path, size)
        except:
            return ImageFont.load_default()

    def _load_font_candidates(self, size):
        candidates = [
            self.font_path,
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Inter-Regular.ttf"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Poppins-Bold.ttf"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Poppins-Regular.ttf"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Montserrat-Bold.ttf"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "fonts", "Montserrat-Regular.ttf"),
        ]
        for path in candidates:
            if path and os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    continue
        return ImageFont.load_default()
    
    def wrap_text(self, text, font, max_width):
        lines = []
        words = text.split()
        current_line = ""
        
        for word in words:
            test_line = current_line + " " + word if current_line else word
            bbox = font.getbbox(test_line)
            text_width = bbox[2] - bbox[0]
            
            if text_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        
        if current_line:
            lines.append(current_line)
        
        return lines
    
    def generate(self, title: str, description: str, article_image_url: str = None, output_path: str = "output.png"):
        # Instagram-first 1:1 canvas with subtle gradient base
        width, height = 1080, 1080
        bg = tuple(self.config.get("background_color", [247, 250, 255]))
        base = Image.new('RGB', (width, height), color=bg)
        draw = ImageDraw.Draw(base)

        gradient = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(gradient)
        accent = tuple(self.config.get("accent_color", [34, 197, 94]))
        for y in range(height):
            alpha = int(80 * (y / height))
            gdraw.line([(0, y), (width, y)], fill=(accent[0], accent[1], accent[2], alpha))
        base = Image.alpha_composite(base.convert("RGBA"), gradient).convert("RGB")
        draw = ImageDraw.Draw(base)

        # Content card
        card_margin = 42
        card = [card_margin, card_margin, width - card_margin, height - card_margin]
        card_radius = int(self.config.get("border_radius", 24))
        draw.rounded_rectangle(card, radius=card_radius, fill=(255, 255, 255), outline=(228, 234, 244), width=3)

        # Top brand row
        brand_font = self._load_font_candidates(34)
        chip_font = self._load_font_candidates(24)
        meta_font = self._load_font_candidates(24)
        title_color = tuple(self.config.get("text_color", [12, 20, 38]))
        logo_x, logo_y = card_margin + 26, card_margin + 24
        logo_size = 50
        draw.rounded_rectangle([logo_x, logo_y, logo_x + logo_size, logo_y + logo_size], radius=16, fill=accent)
        draw.text((logo_x + 70, logo_y + 8), "AI Tech News", font=brand_font, fill=title_color)

        date_text = datetime.now().strftime("%d %b %Y")
        date_bbox = meta_font.getbbox(date_text)
        date_w = date_bbox[2] - date_bbox[0]
        draw.text((card[2] - 26 - date_w, logo_y + 12), date_text, font=meta_font, fill=(100, 112, 135))

        # Hero image
        hero_x = card_margin + 26
        hero_y = logo_y + 76
        hero_w = width - (card_margin + 26) * 2
        hero_h = 560
        hero_box = [hero_x, hero_y, hero_x + hero_w, hero_y + hero_h]

        if article_image_url:
            try:
                response = requests.get(article_image_url, timeout=10)
                art_img = Image.open(BytesIO(response.content)).convert("RGBA")
                target_size = (hero_w, hero_h)
                art_img = ImageOps.fit(art_img, target_size, Image.Resampling.LANCZOS)

                mask = Image.new('L', target_size, 0)
                mask_draw = ImageDraw.Draw(mask)
                border_radius = 26
                try:
                    mask_draw.rounded_rectangle((0, 0) + target_size, radius=border_radius, fill=255)
                except TypeError:
                    mask_draw.rectangle((0, 0) + target_size, fill=255)
                art_img.putalpha(mask)

                base.paste(art_img, (hero_x, hero_y), art_img)
            except Exception as e:
                print(f"Failed to load article image: {e}")

        # Hero bottom overlay for category chip
        overlay = Image.new("RGBA", (hero_w, hero_h), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)
        for y in range(hero_h):
            # stronger towards bottom for text readability
            alpha = int(max(0, (y - hero_h * 0.56) / (hero_h * 0.44)) * 180)
            odraw.line([(0, y), (hero_w, y)], fill=(6, 10, 20, alpha))
        base = Image.alpha_composite(base.convert("RGBA"), Image.new("RGBA", (width, height), (0, 0, 0, 0)))
        base.paste(overlay, (hero_x, hero_y), overlay)
        draw = ImageDraw.Draw(base)

        chip_text = "LATEST AI NEWS"
        chip_pad_x, chip_pad_y = 18, 10
        chip_bbox = chip_font.getbbox(chip_text)
        chip_w = (chip_bbox[2] - chip_bbox[0]) + chip_pad_x * 2
        chip_h = (chip_bbox[3] - chip_bbox[1]) + chip_pad_y * 2
        chip_x = hero_x + 22
        chip_y = hero_y + hero_h - chip_h - 18
        draw.rounded_rectangle([chip_x, chip_y, chip_x + chip_w, chip_y + chip_h], radius=14, fill=(255, 255, 255))
        draw.text((chip_x + chip_pad_x, chip_y + chip_pad_y - 2), chip_text, font=chip_font, fill=(13, 20, 34))

        # Text block below image
        headline_font = self._load_font_candidates(58)
        desc_font = self._load_font_candidates(34)
        headline_x = hero_x
        headline_y = hero_y + hero_h + 32
        max_text_width = hero_w

        title_lines = self.wrap_text((title or "").strip(), headline_font, max_text_width)
        title_lines = title_lines[:2]
        for line in title_lines:
            draw.text((headline_x, headline_y), line, font=headline_font, fill=title_color)
            headline_y += headline_font.size + 8

        body_y = headline_y + 12
        desc_color = tuple(self.config.get("description_color", [76, 88, 110]))
        summary = (description or "").strip()
        if len(summary) > 210:
            summary = summary[:207].rstrip() + "..."
        desc_lines = self.wrap_text(summary, desc_font, max_text_width)
        desc_lines = desc_lines[:3]
        for line in desc_lines:
            draw.text((headline_x, body_y), line, font=desc_font, fill=desc_color)
            body_y += desc_font.size + 8

        # Footer divider for polish
        footer_y = height - card_margin - 54
        draw.line([(hero_x, footer_y), (hero_x + hero_w, footer_y)], fill=(232, 237, 245), width=2)
        draw.text((hero_x, footer_y + 12), "@aitechnews", font=self._load_font_candidates(24), fill=(120, 132, 152))
        draw.text((hero_x + hero_w - 180, footer_y + 12), "Swipe for more", font=self._load_font_candidates(24), fill=(120, 132, 152))

        base.save(output_path)
        return output_path
